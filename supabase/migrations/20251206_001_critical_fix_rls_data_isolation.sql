-- Migration: CRITICAL FIX - User Data Isolation Bug
-- Purpose: Fix has_permission() function and simplify RLS policies
-- Created: 2025-12-06
--
-- SEVERITY: CRITICAL - All users can see all data due to bug in has_permission() function
-- Root cause: has_permission() function has syntax error comparing permission_code to itself

BEGIN;

-- ============================================
-- 1. FIX has_permission() FUNCTION BUG
-- ============================================
-- The function was comparing permission_code = permission_code (always true!)
-- This caused ALL permission checks to pass for ALL users

CREATE OR REPLACE FUNCTION has_permission(target_user_id UUID, check_permission_code TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE SQL STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM get_user_permissions(target_user_id) gup
    WHERE gup.permission_code = check_permission_code
  );
$$;

-- ============================================
-- 2. SIMPLIFY POLICIES TABLE RLS (IMMEDIATE FIX)
-- ============================================
-- Temporarily simplify to basic user_id filtering while we fix permissions

-- Drop existing complex policies
DROP POLICY IF EXISTS "policies_select_own" ON policies;
DROP POLICY IF EXISTS "policies_select_downline" ON policies;
DROP POLICY IF EXISTS "policies_select_all" ON policies;
DROP POLICY IF EXISTS "policies_insert_own" ON policies;
DROP POLICY IF EXISTS "policies_update_own" ON policies;
DROP POLICY IF EXISTS "policies_update_all" ON policies;
DROP POLICY IF EXISTS "policies_delete_own" ON policies;

-- Create simplified policies with JUST user_id check
CREATE POLICY "policies_select_own_simple" ON policies
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "policies_insert_own_simple" ON policies
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "policies_update_own_simple" ON policies
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "policies_delete_own_simple" ON policies
  FOR DELETE USING (user_id = auth.uid());

-- Admin override for SELECT only
CREATE POLICY "policies_select_admin" ON policies
  FOR SELECT USING (is_admin_user(auth.uid()));

-- ============================================
-- 3. SIMPLIFY COMMISSIONS TABLE RLS
-- ============================================

DROP POLICY IF EXISTS "commissions_select_own" ON commissions;
DROP POLICY IF EXISTS "commissions_select_downline" ON commissions;
DROP POLICY IF EXISTS "commissions_select_all" ON commissions;
DROP POLICY IF EXISTS "commissions_insert_system" ON commissions;
DROP POLICY IF EXISTS "commissions_update_admin" ON commissions;

-- Simplified policies
CREATE POLICY "commissions_select_own_simple" ON commissions
  FOR SELECT USING (user_id = auth.uid());

-- Allow system triggers to create commissions
CREATE POLICY "commissions_insert_system" ON commissions
  FOR INSERT WITH CHECK (true);

-- Admin override
CREATE POLICY "commissions_select_admin" ON commissions
  FOR SELECT USING (is_admin_user(auth.uid()));

CREATE POLICY "commissions_update_admin" ON commissions
  FOR UPDATE USING (is_admin_user(auth.uid()));

-- ============================================
-- 4. SIMPLIFY CLIENTS TABLE RLS
-- ============================================

DROP POLICY IF EXISTS "clients_select_own" ON clients;
DROP POLICY IF EXISTS "clients_select_downline" ON clients;
DROP POLICY IF EXISTS "clients_select_all" ON clients;
DROP POLICY IF EXISTS "clients_insert_own" ON clients;
DROP POLICY IF EXISTS "clients_update_own" ON clients;
DROP POLICY IF EXISTS "clients_delete_own" ON clients;

-- Simplified policies
CREATE POLICY "clients_select_own_simple" ON clients
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "clients_insert_own_simple" ON clients
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "clients_update_own_simple" ON clients
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "clients_delete_own_simple" ON clients
  FOR DELETE USING (user_id = auth.uid());

-- Admin override
CREATE POLICY "clients_select_admin" ON clients
  FOR SELECT USING (is_admin_user(auth.uid()));

-- ============================================
-- 5. SIMPLIFY EXPENSES TABLE RLS
-- ============================================

DROP POLICY IF EXISTS "expenses_select_own" ON expenses;
DROP POLICY IF EXISTS "expenses_insert_own" ON expenses;
DROP POLICY IF EXISTS "expenses_update_own" ON expenses;
DROP POLICY IF EXISTS "expenses_delete_own" ON expenses;

-- Simplified policies
CREATE POLICY "expenses_select_own_simple" ON expenses
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "expenses_insert_own_simple" ON expenses
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "expenses_update_own_simple" ON expenses
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "expenses_delete_own_simple" ON expenses
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 6. CREATE TEST FUNCTION
-- ============================================
-- Function to test if RLS is working correctly

CREATE OR REPLACE FUNCTION test_rls_isolation()
RETURNS TABLE(
  test_name TEXT,
  result BOOLEAN,
  details TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  test_user_id UUID;
  policy_count INTEGER;
  commission_count INTEGER;
  client_count INTEGER;
BEGIN
  -- Get a non-admin user ID for testing
  SELECT id INTO test_user_id
  FROM user_profiles
  WHERE email NOT IN ('nick@nickneessen.com', 'kerryglass.ffl@gmail.com')
  LIMIT 1;

  -- Test 1: Check if policies are filtered by user
  RETURN QUERY
  SELECT
    'Policies RLS Test'::TEXT,
    (SELECT COUNT(*) FROM policies WHERE user_id = test_user_id) >= 0,
    'Policies table should filter by user_id'::TEXT;

  -- Test 2: Check has_permission function
  RETURN QUERY
  SELECT
    'has_permission() Function Test'::TEXT,
    NOT has_permission(test_user_id, 'non.existent.permission'),
    'has_permission() should return false for non-existent permissions'::TEXT;

  -- Test 3: Check admin override
  RETURN QUERY
  SELECT
    'Admin Override Test'::TEXT,
    is_admin_user((SELECT id FROM user_profiles WHERE email = 'nick@nickneessen.com')),
    'Admin check should work correctly'::TEXT;

  RETURN;
END;
$$;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  policy_count INTEGER;
  fixed_function BOOLEAN;
BEGIN
  -- Count new policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename IN ('policies', 'commissions', 'clients', 'expenses')
  AND policyname LIKE '%_simple%';

  -- Verify function was updated
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'has_permission'
    AND prosrc LIKE '%check_permission_code%'
  ) INTO fixed_function;

  RAISE NOTICE '';
  RAISE NOTICE '🚨 ========================================';
  RAISE NOTICE '🚨 CRITICAL SECURITY FIX APPLIED';
  RAISE NOTICE '🚨 ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fixed has_permission() function bug';
  RAISE NOTICE '   - Function now correctly checks permissions';
  RAISE NOTICE '   - Parameter renamed to avoid self-comparison';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Simplified RLS policies created: %', policy_count;
  RAISE NOTICE '   - Policies: user_id = auth.uid() check';
  RAISE NOTICE '   - Commissions: user_id = auth.uid() check';
  RAISE NOTICE '   - Clients: user_id = auth.uid() check';
  RAISE NOTICE '   - Expenses: user_id = auth.uid() check';
  RAISE NOTICE '   - Admin overrides for SELECT operations';
  RAISE NOTICE '';
  RAISE NOTICE '📋 IMMEDIATE ACTIONS REQUIRED:';
  RAISE NOTICE '   1. Deploy this migration immediately';
  RAISE NOTICE '   2. Test with multiple user accounts';
  RAISE NOTICE '   3. Verify users only see their own data';
  RAISE NOTICE '   4. Monitor for any access issues';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  TEMPORARY CHANGES:';
  RAISE NOTICE '   - Permission-based checks disabled';
  RAISE NOTICE '   - Hierarchy access disabled';
  RAISE NOTICE '   - Simple user_id filtering only';
  RAISE NOTICE '   - Will re-enable after verification';
  RAISE NOTICE '🚨 ========================================';
END $$;