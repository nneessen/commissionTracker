-- Add explicit RLS policies to 5 internal tables that had RLS enabled but no policies.
-- These tables are only accessed by service_role or SECURITY DEFINER functions,
-- never by end users. Adding service_role-only SELECT policies makes the intent
-- explicit and resolves the rls_enabled_no_policy info warnings.
--
-- Note: service_role bypasses RLS entirely, so these policies only serve to
-- document intent and silence the linter. The USING (false) ensures that if
-- any non-service-role context somehow reaches these tables, access is denied.

BEGIN;

-- alert_rule_processing: internal lock/tracking table for alert rule workers
CREATE POLICY "Service role only"
  ON public.alert_rule_processing
  FOR ALL
  USING (false);

-- email_webhook_events: raw webhook payloads from email providers
CREATE POLICY "Service role only"
  ON public.email_webhook_events
  FOR ALL
  USING (false);

-- instagram_job_queue: background job queue for Instagram integration
CREATE POLICY "Service role only"
  ON public.instagram_job_queue
  FOR ALL
  USING (false);

-- rpc_function_drop_backup: backup of dropped function definitions (admin tooling)
CREATE POLICY "Service role only"
  ON public.rpc_function_drop_backup
  FOR ALL
  USING (false);

-- rpc_function_drop_backup_grants: backup of dropped function grants (admin tooling)
CREATE POLICY "Service role only"
  ON public.rpc_function_drop_backup_grants
  FOR ALL
  USING (false);

COMMIT;
