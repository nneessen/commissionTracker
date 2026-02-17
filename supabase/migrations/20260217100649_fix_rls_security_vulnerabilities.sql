-- supabase/migrations/20260217100649_fix_rls_security_vulnerabilities.sql
-- Fix RLS Security Vulnerabilities
-- Addresses 9 tables with RLS disabled and 3 views without security_invoker

BEGIN;

-- ============================================================================
-- 1. CLIENTS — Enable RLS (4 SELECT policies already exist)
--    Add INSERT/UPDATE/DELETE policies
-- ============================================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Users can insert their own clients
CREATE POLICY "clients_insert_policy" ON clients FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR is_super_admin()
);

-- Users can update own clients; IMO admins can update IMO clients; super admins all
CREATE POLICY "clients_update_policy" ON clients FOR UPDATE
USING (
  user_id = auth.uid()
  OR (is_imo_admin() AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = clients.user_id
    AND user_profiles.imo_id = get_my_imo_id()
  ))
  OR is_super_admin()
)
WITH CHECK (
  user_id = auth.uid()
  OR (is_imo_admin() AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = clients.user_id
    AND user_profiles.imo_id = get_my_imo_id()
  ))
  OR is_super_admin()
);

-- Users can delete own clients; IMO admins can delete IMO clients; super admins all
CREATE POLICY "clients_delete_policy" ON clients FOR DELETE
USING (
  user_id = auth.uid()
  OR (is_imo_admin() AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = clients.user_id
    AND user_profiles.imo_id = get_my_imo_id()
  ))
  OR is_super_admin()
);

-- ============================================================================
-- 2. AGENT_WRITING_NUMBERS — Enable RLS + Create policies
--    Auto-populate imo_id trigger (frontend INSERT doesn't set it)
-- ============================================================================

ALTER TABLE agent_writing_numbers ENABLE ROW LEVEL SECURITY;

-- Trigger to auto-populate imo_id from agent_id -> user_profiles.imo_id
CREATE OR REPLACE FUNCTION set_agent_writing_number_imo_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.imo_id IS NULL AND NEW.agent_id IS NOT NULL THEN
    SELECT imo_id INTO NEW.imo_id
    FROM user_profiles
    WHERE id = NEW.agent_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_agent_writing_number_imo_id
  BEFORE INSERT ON agent_writing_numbers
  FOR EACH ROW
  EXECUTE FUNCTION set_agent_writing_number_imo_id();

-- SELECT: own, uplines, IMO admins, super admins
CREATE POLICY "agent_writing_numbers_select_policy" ON agent_writing_numbers FOR SELECT
USING (
  agent_id = auth.uid()
  OR is_upline_of(agent_id)
  OR (is_imo_admin() AND imo_id = get_my_imo_id())
  OR is_super_admin()
);

-- INSERT: IMO admins for their IMO, super admins
-- imo_id will be auto-populated by trigger before this check
CREATE POLICY "agent_writing_numbers_insert_policy" ON agent_writing_numbers FOR INSERT
WITH CHECK (
  (is_imo_admin() AND (
    imo_id = get_my_imo_id()
    OR (imo_id IS NULL AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = agent_id
      AND user_profiles.imo_id = get_my_imo_id()
    ))
  ))
  OR is_super_admin()
);

-- UPDATE (includes soft-delete): IMO admins for their IMO, super admins
CREATE POLICY "agent_writing_numbers_update_policy" ON agent_writing_numbers FOR UPDATE
USING (
  (is_imo_admin() AND imo_id = get_my_imo_id())
  OR is_super_admin()
)
WITH CHECK (
  (is_imo_admin() AND imo_id = get_my_imo_id())
  OR is_super_admin()
);

-- DELETE: super admin only (soft delete is UPDATE)
CREATE POLICY "agent_writing_numbers_delete_policy" ON agent_writing_numbers FOR DELETE
USING (is_super_admin());

-- ============================================================================
-- 3. WRITING_NUMBER_HISTORY — Enable RLS + Create policies
--    Audit trail table — immutable (no UPDATE/DELETE)
-- ============================================================================

ALTER TABLE writing_number_history ENABLE ROW LEVEL SECURITY;

-- SELECT: own data, IMO admins via agent_id lookup, super admins
CREATE POLICY "writing_number_history_select_policy" ON writing_number_history FOR SELECT
USING (
  agent_id = auth.uid()
  OR (is_imo_admin() AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = writing_number_history.agent_id
    AND user_profiles.imo_id = get_my_imo_id()
  ))
  OR is_super_admin()
);

-- INSERT: IMO admins + super admins (or service role / triggers)
CREATE POLICY "writing_number_history_insert_policy" ON writing_number_history FOR INSERT
WITH CHECK (
  is_imo_admin()
  OR is_super_admin()
);

-- No UPDATE or DELETE policies — audit trail is immutable

-- ============================================================================
-- 4. AGENT_CONTRACTS — Enable RLS + Create policies
-- ============================================================================

ALTER TABLE agent_contracts ENABLE ROW LEVEL SECURITY;

-- SELECT: own contracts, IMO-scoped, super admins
CREATE POLICY "agent_contracts_select_policy" ON agent_contracts FOR SELECT
USING (
  agent_id = auth.uid()
  OR (is_imo_admin() AND imo_id = get_my_imo_id())
  OR is_super_admin()
);

-- INSERT: IMO admins in their IMO, super admins
CREATE POLICY "agent_contracts_insert_policy" ON agent_contracts FOR INSERT
WITH CHECK (
  (is_imo_admin() AND (
    imo_id = get_my_imo_id()
    OR (imo_id IS NULL AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = agent_id
      AND user_profiles.imo_id = get_my_imo_id()
    ))
  ))
  OR is_super_admin()
);

-- UPDATE: IMO admins in their IMO, super admins
CREATE POLICY "agent_contracts_update_policy" ON agent_contracts FOR UPDATE
USING (
  (is_imo_admin() AND imo_id = get_my_imo_id())
  OR is_super_admin()
)
WITH CHECK (
  (is_imo_admin() AND imo_id = get_my_imo_id())
  OR is_super_admin()
);

-- DELETE: super admin only
CREATE POLICY "agent_contracts_delete_policy" ON agent_contracts FOR DELETE
USING (is_super_admin());

-- ============================================================================
-- 5. CONTRACT_DOCUMENTS — Enable RLS + Create policies
-- ============================================================================

ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: own documents, uplines, IMO admins, super admins
CREATE POLICY "contract_documents_select_policy" ON contract_documents FOR SELECT
USING (
  agent_id = auth.uid()
  OR is_upline_of(agent_id)
  OR (is_imo_admin() AND imo_id = get_my_imo_id())
  OR is_super_admin()
);

-- INSERT: own documents, IMO admins, super admins
CREATE POLICY "contract_documents_insert_policy" ON contract_documents FOR INSERT
WITH CHECK (
  agent_id = auth.uid()
  OR (is_imo_admin() AND (
    imo_id = get_my_imo_id()
    OR (imo_id IS NULL AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = agent_id
      AND user_profiles.imo_id = get_my_imo_id()
    ))
  ))
  OR is_super_admin()
);

-- UPDATE: own documents, IMO admins (for review), super admins
CREATE POLICY "contract_documents_update_policy" ON contract_documents FOR UPDATE
USING (
  agent_id = auth.uid()
  OR (is_imo_admin() AND imo_id = get_my_imo_id())
  OR is_super_admin()
)
WITH CHECK (
  agent_id = auth.uid()
  OR (is_imo_admin() AND imo_id = get_my_imo_id())
  OR is_super_admin()
);

-- DELETE: IMO admins + super admins
CREATE POLICY "contract_documents_delete_policy" ON contract_documents FOR DELETE
USING (
  (is_imo_admin() AND imo_id = get_my_imo_id())
  OR is_super_admin()
);

-- ============================================================================
-- 6. SYSTEM_AUDIT_LOG — Enable RLS + Super admin only SELECT
--    INSERT handled by SECURITY DEFINER triggers (bypass RLS)
-- ============================================================================

ALTER TABLE system_audit_log ENABLE ROW LEVEL SECURITY;

-- SELECT: super admins only
CREATE POLICY "system_audit_log_select_policy" ON system_audit_log FOR SELECT
USING (is_super_admin());

-- No INSERT policy needed — SECURITY DEFINER triggers bypass RLS
-- No UPDATE/DELETE — audit log is immutable

-- ============================================================================
-- 7. SYNC_HIERARCHY_ROOT — Enable RLS + Super admin only
-- ============================================================================

ALTER TABLE sync_hierarchy_root ENABLE ROW LEVEL SECURITY;

-- ALL operations: super admin only
CREATE POLICY "sync_hierarchy_root_all_policy" ON sync_hierarchy_root FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ============================================================================
-- 8-9. RPC_FUNCTION_DROP_BACKUP + GRANTS — Lock down completely
--      Used only by migration scripts (postgres role), deny all via PostgREST
-- ============================================================================

ALTER TABLE rpc_function_drop_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpc_function_drop_backup_grants ENABLE ROW LEVEL SECURITY;

-- No policies = deny all authenticated/anon access via PostgREST

-- Defense in depth: revoke direct table access
REVOKE ALL ON rpc_function_drop_backup FROM authenticated, anon;
REVOKE ALL ON rpc_function_drop_backup_grants FROM authenticated, anon;

-- ============================================================================
-- 10. VIEWS — Set explicit security_invoker = true
--     Prevents views from executing with definer privileges
-- ============================================================================

ALTER VIEW active_user_profiles SET (security_invoker = true);
ALTER VIEW user_management_view SET (security_invoker = true);

-- message_templates (if it exists as a view)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'message_templates' AND schemaname = 'public'
  ) THEN
    EXECUTE 'ALTER VIEW message_templates SET (security_invoker = true)';
  END IF;
END;
$$;

COMMIT;
