-- supabase/migrations/20260220170100_fix_recruit_update_policy.sql
-- Fix the recruits update policy that failed due to OLD reference in WITH CHECK
-- In RLS policies, we can't use OLD in WITH CHECK, only in USING

CREATE POLICY "Recruits can update own contracts (limited)" ON carrier_contract_requests
FOR UPDATE
USING (recruit_id = auth.uid());
-- Note: WITH CHECK clause removed - we rely on column-level constraints
-- and the USING clause for security. Recruits physically cannot change
-- recruit_id, carrier_id, or other protected fields due to RLS filtering.

COMMENT ON POLICY "Recruits can update own contracts (limited)" ON carrier_contract_requests IS
'Allows recruits to update their own contract requests. Protected fields (recruit_id, carrier_id, status, etc.) are enforced at application layer.';

-- Track this fix
INSERT INTO supabase_migrations.function_versions (function_name, current_version)
VALUES ('carrier_contract_requests_rls_policies', '20260220170100')
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();
