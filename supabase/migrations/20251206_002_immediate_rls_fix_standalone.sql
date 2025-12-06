-- Migration: IMMEDIATE FIX - User Data Isolation (Standalone)
-- Purpose: Simple RLS policies to isolate user data immediately
-- Created: 2025-12-06
--
-- SEVERITY: CRITICAL - Users can see ALL data, not just their own
-- This is a standalone fix that doesn't depend on RBAC functions

BEGIN;

-- ============================================
-- 1. POLICIES TABLE - SIMPLE RLS
-- ============================================

-- Drop all existing policies on policies table
DO $$
BEGIN
  -- Drop all existing policies
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'policies' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON policies', pol.policyname);
  END LOOP;
END $$;

-- Create simple user isolation policies
CREATE POLICY "policies_user_isolation_select" ON policies
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "policies_user_isolation_insert" ON policies
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "policies_user_isolation_update" ON policies
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "policies_user_isolation_delete" ON policies
  FOR DELETE USING (user_id = auth.uid());

-- Admin override (only if is_admin_user function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin_user') THEN
    CREATE POLICY "policies_admin_select_override" ON policies
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid()
          AND 'admin' = ANY(roles)
        )
      );
  END IF;
END $$;

-- ============================================
-- 2. COMMISSIONS TABLE - SIMPLE RLS
-- ============================================

DO $$
BEGIN
  -- Drop all existing policies
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'commissions' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON commissions', pol.policyname);
  END LOOP;
END $$;

-- Create simple user isolation policies
CREATE POLICY "commissions_user_isolation_select" ON commissions
  FOR SELECT USING (user_id = auth.uid());

-- Allow system triggers to create commissions
CREATE POLICY "commissions_system_insert" ON commissions
  FOR INSERT WITH CHECK (true);

-- Only admin can update commissions
CREATE POLICY "commissions_admin_update" ON commissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND 'admin' = ANY(roles)
    )
  );

-- Admin override for SELECT
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_profiles' AND column_name = 'roles') THEN
    CREATE POLICY "commissions_admin_select_override" ON commissions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid()
          AND 'admin' = ANY(roles)
        )
      );
  END IF;
END $$;

-- ============================================
-- 3. CLIENTS TABLE - SIMPLE RLS
-- ============================================

DO $$
BEGIN
  -- Drop all existing policies
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'clients' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON clients', pol.policyname);
  END LOOP;
END $$;

-- Create simple user isolation policies
CREATE POLICY "clients_user_isolation_select" ON clients
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "clients_user_isolation_insert" ON clients
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "clients_user_isolation_update" ON clients
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "clients_user_isolation_delete" ON clients
  FOR DELETE USING (user_id = auth.uid());

-- Admin override
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_profiles' AND column_name = 'roles') THEN
    CREATE POLICY "clients_admin_select_override" ON clients
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid()
          AND 'admin' = ANY(roles)
        )
      );
  END IF;
END $$;

-- ============================================
-- 4. EXPENSES TABLE - SIMPLE RLS
-- ============================================

DO $$
BEGIN
  -- Drop all existing policies
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'expenses' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON expenses', pol.policyname);
  END LOOP;
END $$;

-- Create simple user isolation policies
CREATE POLICY "expenses_user_isolation_select" ON expenses
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "expenses_user_isolation_insert" ON expenses
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "expenses_user_isolation_update" ON expenses
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "expenses_user_isolation_delete" ON expenses
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 5. FIX has_permission() FUNCTION IF IT EXISTS
-- ============================================

DO $$
BEGIN
  -- Only fix if function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_permission') THEN
    CREATE OR REPLACE FUNCTION has_permission(target_user_id UUID, check_permission_code TEXT)
    RETURNS BOOLEAN
    SECURITY DEFINER
    SET search_path = public
    LANGUAGE SQL STABLE AS $func$
      SELECT EXISTS (
        SELECT 1 FROM get_user_permissions(target_user_id) gup
        WHERE gup.permission_code = check_permission_code
      );
    $func$;

    RAISE NOTICE 'Fixed has_permission() function bug';
  END IF;
END $$;

-- ============================================
-- 6. ENSURE RLS IS ENABLED
-- ============================================

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  policies_count INTEGER;
  commissions_count INTEGER;
  clients_count INTEGER;
  expenses_count INTEGER;
BEGIN
  -- Count new policies
  SELECT COUNT(*) INTO policies_count FROM pg_policies WHERE tablename = 'policies' AND policyname LIKE '%isolation%';
  SELECT COUNT(*) INTO commissions_count FROM pg_policies WHERE tablename = 'commissions' AND policyname LIKE '%isolation%';
  SELECT COUNT(*) INTO clients_count FROM pg_policies WHERE tablename = 'clients' AND policyname LIKE '%isolation%';
  SELECT COUNT(*) INTO expenses_count FROM pg_policies WHERE tablename = 'expenses' AND policyname LIKE '%isolation%';

  RAISE NOTICE '';
  RAISE NOTICE '🚨 ========================================';
  RAISE NOTICE '🚨 CRITICAL DATA ISOLATION FIX APPLIED';
  RAISE NOTICE '🚨 ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS Policies Applied:';
  RAISE NOTICE '   - Policies table: % isolation policies', policies_count;
  RAISE NOTICE '   - Commissions table: % isolation policies', commissions_count;
  RAISE NOTICE '   - Clients table: % isolation policies', clients_count;
  RAISE NOTICE '   - Expenses table: % isolation policies', expenses_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security Model:';
  RAISE NOTICE '   - Users can ONLY see their own data';
  RAISE NOTICE '   - All queries filtered by user_id = auth.uid()';
  RAISE NOTICE '   - Admin override for SELECT (if roles configured)';
  RAISE NOTICE '   - System triggers can still create commissions';
  RAISE NOTICE '';
  RAISE NOTICE '📋 NEXT STEPS:';
  RAISE NOTICE '   1. Apply this migration to production IMMEDIATELY';
  RAISE NOTICE '   2. Test with different user accounts';
  RAISE NOTICE '   3. Verify users cannot see each others data';
  RAISE NOTICE '   4. Monitor for any access errors';
  RAISE NOTICE '   5. Fix frontend to handle filtered data properly';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  TEMPORARY LIMITATIONS:';
  RAISE NOTICE '   - No hierarchy/downline access';
  RAISE NOTICE '   - No permission-based access';
  RAISE NOTICE '   - Simple user isolation only';
  RAISE NOTICE '   - Will enhance after verification';
  RAISE NOTICE '🚨 ========================================';
END $$;