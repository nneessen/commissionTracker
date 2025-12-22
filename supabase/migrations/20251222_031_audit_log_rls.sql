-- Migration: Audit Log RLS Policies
-- Phase 11: Audit Trail & Activity Logs
-- Org-scoped access control for audit logs

-- ============================================
-- SELECT POLICIES (VIEW ACCESS)
-- ============================================

-- Super admins can view all audit logs
CREATE POLICY "Super admins can view all audit logs"
ON audit_log FOR SELECT
TO authenticated
USING (is_super_admin());

-- IMO admins can view their IMO's audit logs
CREATE POLICY "IMO admins can view IMO audit logs"
ON audit_log FOR SELECT
TO authenticated
USING (
  is_imo_admin()
  AND imo_id IS NOT NULL
  AND imo_id = get_my_imo_id()
);

-- Agency owners can view their agency's audit logs
CREATE POLICY "Agency owners can view agency audit logs"
ON audit_log FOR SELECT
TO authenticated
USING (
  agency_id IS NOT NULL
  AND agency_id = get_my_agency_id()
  AND EXISTS (
    SELECT 1 FROM agencies
    WHERE agencies.id = audit_log.agency_id
    AND agencies.owner_id = auth.uid()
  )
);

-- Users can view audit logs for changes they performed
CREATE POLICY "Users can view own performed audit logs"
ON audit_log FOR SELECT
TO authenticated
USING (performed_by = auth.uid());

-- ============================================
-- INSERT POLICIES
-- ============================================

-- Service role can insert (for triggers running with elevated privileges)
CREATE POLICY "Service role can insert audit logs"
ON audit_log FOR INSERT
TO service_role
WITH CHECK (true);

-- Authenticated users can insert application-level audit logs
-- (for explicit logging calls from the frontend/backend)
CREATE POLICY "Authenticated users can insert application audit logs"
ON audit_log FOR INSERT
TO authenticated
WITH CHECK (
  source = 'application'
  AND (performed_by = auth.uid() OR performed_by IS NULL)
);

-- ============================================
-- NO UPDATE OR DELETE POLICIES
-- Audit logs are immutable by design
-- ============================================

-- Note: No UPDATE policies - audit logs cannot be modified
-- Note: No DELETE policies - audit logs cannot be deleted by users
-- Cleanup is handled by scheduled function with service_role

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant select to authenticated users (RLS will filter)
GRANT SELECT ON audit_log TO authenticated;

-- Grant insert to authenticated users (for application logging)
GRANT INSERT ON audit_log TO authenticated;

-- Grant all to service_role (for triggers and cleanup)
GRANT ALL ON audit_log TO service_role;
