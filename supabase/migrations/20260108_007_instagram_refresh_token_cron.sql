-- supabase/migrations/20260108_007_instagram_refresh_token_cron.sql
-- Setup CRON job for Instagram token refresh
-- Runs daily at 3 AM UTC to refresh tokens expiring within 7 days

-- PREREQUISITE: Enable pg_cron extension in Supabase Dashboard
-- Go to Database → Extensions → Search for "pg_cron" → Enable
-- Then run this migration

-- Unschedule if exists (idempotent)
SELECT cron.unschedule('instagram-refresh-token')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'instagram-refresh-token');

-- Create cron job to refresh Instagram tokens daily at 3 AM UTC
-- The edge function finds tokens expiring within 7 days and refreshes them
SELECT cron.schedule(
  'instagram-refresh-token',
  '0 3 * * *',  -- Daily at 3 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/instagram-refresh-token',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', concat('Bearer ', current_setting('app.settings.service_role_key', true))
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Verify cron job was created
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'instagram-refresh-token';
