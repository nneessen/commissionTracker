-- Migration: CRITICAL - Simple User Data Isolation
-- Purpose: Apply simple user_id = auth.uid() RLS policies
-- Created: 2025-12-06
--
-- CRITICAL SECURITY FIX: Users seeing all data instead of just their own

BEGIN;

-- ============================================
-- POLICIES TABLE
-- ============================================

-- Drop problematic RLS policies that use has_permission
DROP POLICY IF EXISTS "policies_select_own" ON policies;
DROP POLICY IF EXISTS "policies_select_downline" ON policies;
DROP POLICY IF EXISTS "policies_select_all" ON policies;
DROP POLICY IF EXISTS "policies_insert_own" ON policies;
DROP POLICY IF EXISTS "policies_update_own" ON policies;
DROP POLICY IF EXISTS "policies_update_all" ON policies;
DROP POLICY IF EXISTS "policies_delete_own" ON policies;

-- Create simple user-only policies
CREATE POLICY "policy_select_own_user" ON policies
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "policy_insert_own_user" ON policies
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "policy_update_own_user" ON policies
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "policy_delete_own_user" ON policies
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- COMMISSIONS TABLE
-- ============================================

-- Drop problematic RLS policies
DROP POLICY IF EXISTS "commissions_select_own" ON commissions;
DROP POLICY IF EXISTS "commissions_select_downline" ON commissions;
DROP POLICY IF EXISTS "commissions_select_all" ON commissions;
DROP POLICY IF EXISTS "commissions_insert_system" ON commissions;
DROP POLICY IF EXISTS "commissions_update_admin" ON commissions;

-- Create simple policies
CREATE POLICY "commission_select_own_user" ON commissions
  FOR SELECT USING (user_id = auth.uid());

-- Allow triggers to create commissions
CREATE POLICY "commission_insert_system" ON commissions
  FOR INSERT WITH CHECK (true);

-- ============================================
-- CLIENTS TABLE
-- ============================================

-- Drop problematic RLS policies
DROP POLICY IF EXISTS "clients_select_own" ON clients;
DROP POLICY IF EXISTS "clients_select_downline" ON clients;
DROP POLICY IF EXISTS "clients_select_all" ON clients;
DROP POLICY IF EXISTS "clients_insert_own" ON clients;
DROP POLICY IF EXISTS "clients_update_own" ON clients;
DROP POLICY IF EXISTS "clients_delete_own" ON clients;

-- Create simple policies
CREATE POLICY "client_select_own_user" ON clients
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "client_insert_own_user" ON clients
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "client_update_own_user" ON clients
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "client_delete_own_user" ON clients
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- EXPENSES TABLE
-- ============================================

-- Drop problematic RLS policies
DROP POLICY IF EXISTS "expenses_select_own" ON expenses;
DROP POLICY IF EXISTS "expenses_insert_own" ON expenses;
DROP POLICY IF EXISTS "expenses_update_own" ON expenses;
DROP POLICY IF EXISTS "expenses_delete_own" ON expenses;

-- Create simple policies
CREATE POLICY "expense_select_own_user" ON expenses
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "expense_insert_own_user" ON expenses
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "expense_update_own_user" ON expenses
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "expense_delete_own_user" ON expenses
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- ENSURE RLS IS ENABLED
-- ============================================

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================
-- VERIFY POLICIES WERE CREATED
-- ============================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename IN ('policies', 'commissions', 'clients', 'expenses')
  AND policyname LIKE '%_own_user%';

  RAISE NOTICE '';
  RAISE NOTICE '🚨 ========================================';
  RAISE NOTICE '🚨 CRITICAL SECURITY FIX APPLIED';
  RAISE NOTICE '🚨 ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ User isolation policies created: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔒 NEW BEHAVIOR:';
  RAISE NOTICE '   - Users can ONLY see their own data';
  RAISE NOTICE '   - user_id = auth.uid() enforced';
  RAISE NOTICE '   - No cross-user data access';
  RAISE NOTICE '';
  RAISE NOTICE '📋 REQUIRED ACTIONS:';
  RAISE NOTICE '   1. Deploy to production IMMEDIATELY';
  RAISE NOTICE '   2. Test with multiple users';
  RAISE NOTICE '   3. Verify data isolation works';
  RAISE NOTICE '🚨 ========================================';
END $$;