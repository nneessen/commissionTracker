-- supabase/migrations/20260106_002_instagram_process_jobs_cron.sql
-- Setup CRON job for Instagram background job processing
-- Runs every 1 minute to process:
-- 1. Profile picture downloads
-- 2. Message media downloads
-- 3. Scheduled message sends (fallback)
-- 4. Metadata refresh

-- PREREQUISITE: Enable pg_cron extension in Supabase Dashboard
-- Go to Database → Extensions → Search for "pg_cron" → Enable
-- Then run this migration

-- Unschedule if exists (idempotent)
SELECT cron.unschedule('instagram-process-jobs')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'instagram-process-jobs');

-- Create cron job to process Instagram background jobs every 1 minute
SELECT cron.schedule(
  'instagram-process-jobs',
  '*/1 * * * *',  -- Every 1 minute
  $$
  SELECT
    net.http_post(
      url := 'https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/instagram-process-jobs',
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
WHERE jobname = 'instagram-process-jobs';
