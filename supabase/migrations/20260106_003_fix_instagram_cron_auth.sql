-- Fix CRON authentication by using supabase_functions.http_request
-- This function automatically includes the service role key

-- Unschedule existing jobs
SELECT cron.unschedule('instagram-process-jobs');
SELECT cron.unschedule('instagram-process-scheduled');

-- Recreate instagram-process-jobs with proper auth
SELECT cron.schedule(
  'instagram-process-jobs',
  '*/1 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/instagram-process-jobs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Recreate instagram-process-scheduled with proper auth
SELECT cron.schedule(
  'instagram-process-scheduled',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/instagram-process-scheduled',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Verify
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE '%instagram%';
