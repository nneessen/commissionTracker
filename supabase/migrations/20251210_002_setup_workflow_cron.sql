-- Setup Workflow Automation Cron Jobs
-- This creates scheduled jobs to process pending workflows and email queue

-- Note: This requires pg_cron extension to be enabled in Supabase dashboard
-- Go to Database → Extensions → Enable pg_cron

-- Create cron job to process pending workflow runs every 30 seconds
SELECT cron.schedule(
  'process-pending-workflows',
  '*/1 * * * *',  -- Every 1 minute (fastest pg_cron allows)
  $$
  SELECT
    net.http_post(
      url := 'https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/process-pending-workflows',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', concat('Bearer ', current_setting('app.settings.service_role_key', true))
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Create cron job to process email queue every minute
SELECT cron.schedule(
  'process-email-queue',
  '*/1 * * * *',  -- Every 1 minute
  $$
  SELECT
    net.http_post(
      url := 'https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/process-email-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', concat('Bearer ', current_setting('app.settings.service_role_key', true))
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Verify cron jobs were created
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname IN ('process-pending-workflows', 'process-email-queue');
