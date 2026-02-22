-- supabase/migrations/20260221190054_harden_user_subscriptions_rls.sql
-- SECURITY: Remove self-update path on user_subscriptions.
-- Expand admin policy to include is_super_admin.
-- No insert policy needed — service_role bypasses RLS.

BEGIN;

-- ============================================================================
-- 1. Drop the self-update policy (CRITICAL vulnerability: allows self-upgrade
--    without payment — any authenticated user could elevate their own plan)
-- ============================================================================
DROP POLICY IF EXISTS "user_subscriptions_update_own" ON user_subscriptions;

-- ============================================================================
-- 2. Expand admin_all policy to include is_super_admin
-- Currently only checks is_admin = true; super admins should also be covered.
-- ============================================================================
DROP POLICY IF EXISTS "user_subscriptions_admin_all" ON user_subscriptions;

CREATE POLICY "user_subscriptions_admin_all" ON user_subscriptions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
        AND (is_admin = true OR is_super_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
        AND (is_admin = true OR is_super_admin = true)
    )
  );

-- ============================================================================
-- KEPT: user_subscriptions_select_own
-- Users may read their own subscription row. No change needed.
-- ============================================================================

-- ============================================================================
-- NOTE: user_subscriptions_insert_admin was already dropped in
-- supabase/migrations/20260217124800_remove_duplicate_rls_policies.sql.
-- No action required here.
-- ============================================================================

COMMIT;
