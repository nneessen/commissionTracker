-- supabase/migrations/20260131120353_slack_auto_complete_first_sale_cron.sql
-- Sets up a cron job to auto-complete pending first sales after 5 minutes
--
-- PROBLEM: When the first sale of the day is created, the UI shows a "naming dialog"
-- asking the user to name the leaderboard. If they miss it (mobile, closed browser, etc.),
-- the notification stays pending forever.
--
-- SOLUTION: A cron job runs every 5 minutes to auto-complete any pending first sales
-- that are older than 5 minutes, using the default title.

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create a function that calls the edge function using app_config values
CREATE OR REPLACE FUNCTION invoke_slack_auto_complete_first_sale()
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- Get config values from app_config table (same as slack policy trigger)
  SELECT value INTO v_supabase_url
  FROM app_config
  WHERE key = 'supabase_project_url';

  SELECT value INTO v_service_role_key
  FROM app_config
  WHERE key = 'supabase_service_role_key';

  -- Skip if config not available
  IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE LOG 'slack-auto-complete-first-sale: Missing app_config values';
    RETURN;
  END IF;

  -- Check if there are any pending first sales older than 5 minutes
  -- Skip the HTTP call if nothing to process (optimization)
  IF NOT EXISTS (
    SELECT 1 FROM daily_sales_logs
    WHERE pending_policy_data IS NOT NULL
      AND created_at < NOW() - INTERVAL '5 minutes'
    LIMIT 1
  ) THEN
    RAISE LOG 'slack-auto-complete-first-sale: No pending first sales to process';
    RETURN;
  END IF;

  -- Call the edge function
  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/slack-auto-complete-first-sale',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := '{}'::jsonb
  ) INTO v_request_id;

  RAISE LOG 'slack-auto-complete-first-sale: Invoked edge function (request_id: %)', v_request_id;
END;
$$ LANGUAGE plpgsql;

-- Create the cron job to run every 5 minutes
SELECT cron.schedule(
  'slack-auto-complete-first-sale',  -- job name
  '*/5 * * * *',                      -- every 5 minutes
  'SELECT invoke_slack_auto_complete_first_sale();'
);

COMMENT ON FUNCTION invoke_slack_auto_complete_first_sale() IS
'Invokes the slack-auto-complete-first-sale edge function to auto-complete
pending first sales that have been waiting more than 5 minutes. Called by pg_cron.';
