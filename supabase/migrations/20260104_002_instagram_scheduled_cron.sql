-- supabase/migrations/20260104_002_instagram_scheduled_cron.sql
-- Setup CRON job for Instagram scheduled message processing
-- Runs every 5 minutes to:
-- 1. Expire messages whose windows have closed
-- 2. Send due scheduled messages
-- 3. Queue auto-reminders for priority conversations

-- PREREQUISITE: Enable pg_cron extension in Supabase Dashboard
-- Go to Database → Extensions → Search for "pg_cron" → Enable
-- Then run this migration

-- Unschedule if exists (idempotent)
SELECT cron.unschedule('instagram-process-scheduled')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'instagram-process-scheduled');

-- Create cron job to process Instagram scheduled messages every 5 minutes
SELECT cron.schedule(
  'instagram-process-scheduled',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/instagram-process-scheduled',
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
WHERE jobname = 'instagram-process-scheduled';
