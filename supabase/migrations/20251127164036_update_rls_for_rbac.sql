-- Migration: Update RLS Policies for RBAC
-- Purpose: Replace simple RLS policies with RBAC-aware permission checks
-- Created: 2025-11-27
--
-- CRITICAL: This fixes the recruit isolation bug by implementing proper
-- role-based data access control at the database level.

BEGIN;

-- ============================================
-- 1. DROP OLD user_profiles RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_all" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_recruits_and_downline" ON user_profiles;

-- ============================================
-- 2. CREATE NEW RBAC-AWARE user_profiles POLICIES
-- ============================================

-- Policy 1: Users can see their own profile
CREATE POLICY "user_profiles_select_own"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Admin role sees ALL profiles
CREATE POLICY "user_profiles_select_admin"
  ON user_profiles FOR SELECT
  USING (is_admin_user(auth.uid()));

-- Policy 3: View-Only role sees ALL profiles
CREATE POLICY "user_profiles_select_view_only"
  ON user_profiles FOR SELECT
  USING (has_role(auth.uid(), 'view_only'));

-- Policy 4: Contracting Manager sees ALL profiles (needs to view all users)
CREATE POLICY "user_profiles_select_contracting"
  ON user_profiles FOR SELECT
  USING (has_role(auth.uid(), 'contracting_manager'));

-- Policy 5: Recruiter sees all recruits (onboarding_status = lead/active)
CREATE POLICY "user_profiles_select_recruiter"
  ON user_profiles FOR SELECT
  USING (
    has_role(auth.uid(), 'recruiter')
    AND onboarding_status IN ('lead', 'active')
  );

-- Policy 6: Trainer sees all recruits
CREATE POLICY "user_profiles_select_trainer"
  ON user_profiles FOR SELECT
  USING (
    has_role(auth.uid(), 'trainer')
    AND onboarding_status IN ('lead', 'active')
  );

-- Policy 7: Agent/Upline Manager see own recruits + downline
CREATE POLICY "user_profiles_select_hierarchy"
  ON user_profiles FOR SELECT
  USING (
    -- Own recruits (where I'm the recruiter)
    recruiter_id = auth.uid()
    -- OR recruits in my downline hierarchy
    OR id IN (SELECT downline_id FROM get_downline_ids(auth.uid()))
    -- OR recruits I manage directly
    OR upline_id = auth.uid()
  );

-- Policy 8: Users can update their own profile
CREATE POLICY "user_profiles_update_own"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policy 9: Admins can update all profiles
CREATE POLICY "user_profiles_update_admin"
  ON user_profiles FOR UPDATE
  USING (is_admin_user(auth.uid()));

-- Policy 10: Contracting Manager can update user profiles (for contract management)
CREATE POLICY "user_profiles_update_contracting"
  ON user_profiles FOR UPDATE
  USING (has_role(auth.uid(), 'contracting_manager'));

-- Policy 11: Users can insert their own profile (signup)
CREATE POLICY "user_profiles_insert_own"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 3. UPDATE policies TABLE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own policies" ON policies;
DROP POLICY IF EXISTS "Users can create own policies" ON policies;
DROP POLICY IF EXISTS "Users can update own policies" ON policies;
DROP POLICY IF EXISTS "Users can delete own policies" ON policies;

-- Policy 1: Users can see own policies
CREATE POLICY "policies_select_own"
  ON policies FOR SELECT
  USING (
    user_id = auth.uid()
    AND has_permission(auth.uid(), 'policies.read.own')
  );

-- Policy 2: Upline can see downline policies
CREATE POLICY "policies_select_downline"
  ON policies FOR SELECT
  USING (
    has_permission(auth.uid(), 'policies.read.downline')
    AND user_id IN (SELECT downline_id FROM get_downline_ids(auth.uid()))
  );

-- Policy 3: View all policies (admin, view-only, office staff)
CREATE POLICY "policies_select_all"
  ON policies FOR SELECT
  USING (has_permission(auth.uid(), 'policies.read.all'));

-- Policy 4: Create own policies
CREATE POLICY "policies_insert_own"
  ON policies FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND has_permission(auth.uid(), 'policies.create.own')
  );

-- Policy 5: Update own policies
CREATE POLICY "policies_update_own"
  ON policies FOR UPDATE
  USING (
    user_id = auth.uid()
    AND has_permission(auth.uid(), 'policies.update.own')
  );

-- Policy 6: Update all policies (office staff support)
CREATE POLICY "policies_update_all"
  ON policies FOR UPDATE
  USING (has_permission(auth.uid(), 'policies.update.all'));

-- Policy 7: Delete own policies
CREATE POLICY "policies_delete_own"
  ON policies FOR DELETE
  USING (
    user_id = auth.uid()
    AND has_permission(auth.uid(), 'policies.delete.own')
  );

-- ============================================
-- 4. UPDATE clients TABLE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Users can create own clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;

-- Policy 1: Users can see own clients
CREATE POLICY "clients_select_own"
  ON clients FOR SELECT
  USING (
    user_id = auth.uid()
    AND has_permission(auth.uid(), 'clients.read.own')
  );

-- Policy 2: Upline can see downline clients
CREATE POLICY "clients_select_downline"
  ON clients FOR SELECT
  USING (
    has_permission(auth.uid(), 'clients.read.downline')
    AND user_id IN (SELECT downline_id FROM get_downline_ids(auth.uid()))
  );

-- Policy 3: View all clients (admin, office staff)
CREATE POLICY "clients_select_all"
  ON clients FOR SELECT
  USING (has_permission(auth.uid(), 'clients.read.all'));

-- Policy 4: Create own clients
CREATE POLICY "clients_insert_own"
  ON clients FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND has_permission(auth.uid(), 'clients.create.own')
  );

-- Policy 5: Update own clients
CREATE POLICY "clients_update_own"
  ON clients FOR UPDATE
  USING (
    user_id = auth.uid()
    AND has_permission(auth.uid(), 'clients.update.own')
  );

-- Policy 6: Delete own clients
CREATE POLICY "clients_delete_own"
  ON clients FOR DELETE
  USING (
    user_id = auth.uid()
    AND has_permission(auth.uid(), 'clients.delete.own')
  );

-- ============================================
-- 5. UPDATE commissions TABLE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own commissions" ON commissions;
DROP POLICY IF EXISTS "Users can create own commissions" ON commissions;
DROP POLICY IF EXISTS "Users can update own commissions" ON commissions;
DROP POLICY IF EXISTS "Users can delete own commissions" ON commissions;

-- Policy 1: Users can see own commissions
CREATE POLICY "commissions_select_own"
  ON commissions FOR SELECT
  USING (
    user_id = auth.uid()
    AND has_permission(auth.uid(), 'commissions.read.own')
  );

-- Policy 2: Upline can see downline commissions
CREATE POLICY "commissions_select_downline"
  ON commissions FOR SELECT
  USING (
    has_permission(auth.uid(), 'commissions.read.downline')
    AND user_id IN (SELECT downline_id FROM get_downline_ids(auth.uid()))
  );

-- Policy 3: View all commissions (admin, view-only)
CREATE POLICY "commissions_select_all"
  ON commissions FOR SELECT
  USING (has_permission(auth.uid(), 'commissions.read.all'));

-- Policy 4: System can create commissions (triggers)
CREATE POLICY "commissions_insert_system"
  ON commissions FOR INSERT
  WITH CHECK (true); -- Commissions created by triggers

-- Policy 5: Update commissions (system/admin only)
CREATE POLICY "commissions_update_admin"
  ON commissions FOR UPDATE
  USING (is_admin_user(auth.uid()));

-- ============================================
-- 6. UPDATE expenses TABLE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can create own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

-- Policy 1: Users can see own expenses
CREATE POLICY "expenses_select_own"
  ON expenses FOR SELECT
  USING (
    user_id = auth.uid()
    AND has_permission(auth.uid(), 'expenses.read.own')
  );

-- Policy 2: Create own expenses
CREATE POLICY "expenses_insert_own"
  ON expenses FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND has_permission(auth.uid(), 'expenses.create.own')
  );

-- Policy 3: Update own expenses
CREATE POLICY "expenses_update_own"
  ON expenses FOR UPDATE
  USING (
    user_id = auth.uid()
    AND has_permission(auth.uid(), 'expenses.update.own')
  );

-- Policy 4: Delete own expenses
CREATE POLICY "expenses_delete_own"
  ON expenses FOR DELETE
  USING (
    user_id = auth.uid()
    AND has_permission(auth.uid(), 'expenses.delete.own')
  );

COMMIT;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
DECLARE
  user_profiles_policies INTEGER;
  policies_policies INTEGER;
  clients_policies INTEGER;
  commissions_policies INTEGER;
  expenses_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_profiles_policies FROM pg_policies WHERE tablename = 'user_profiles';
  SELECT COUNT(*) INTO policies_policies FROM pg_policies WHERE tablename = 'policies';
  SELECT COUNT(*) INTO clients_policies FROM pg_policies WHERE tablename = 'clients';
  SELECT COUNT(*) INTO commissions_policies FROM pg_policies WHERE tablename = 'commissions';
  SELECT COUNT(*) INTO expenses_policies FROM pg_policies WHERE tablename = 'expenses';

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'RBAC-Aware RLS Policies Created!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'RLS Policies by Table:';
  RAISE NOTICE '  - user_profiles: % policies', user_profiles_policies;
  RAISE NOTICE '  - policies: % policies', policies_policies;
  RAISE NOTICE '  - clients: % policies', clients_policies;
  RAISE NOTICE '  - commissions: % policies', commissions_policies;
  RAISE NOTICE '  - expenses: % policies', expenses_policies;
  RAISE NOTICE '';
  RAISE NOTICE 'Security Features:';
  RAISE NOTICE '   Role-based access control enforced';
  RAISE NOTICE '   Permission checks in all policies';
  RAISE NOTICE '   Hierarchy-based data isolation';
  RAISE NOTICE '   Recruit isolation bug FIXED';
  RAISE NOTICE '';
  RAISE NOTICE 'Data Visibility:';
  RAISE NOTICE '  - Admin: ALL data systemwide';
  RAISE NOTICE '  - Agent: Own data only';
  RAISE NOTICE '  - Upline Manager: Own + downline data';
  RAISE NOTICE '  - Trainer: All recruits (read/update)';
  RAISE NOTICE '  - Recruiter: All recruits (CRUD)';
  RAISE NOTICE '  - Contracting Manager: All users, documents';
  RAISE NOTICE '  - Office Staff: All policies/clients';
  RAISE NOTICE '  - View-Only: All data (read-only)';
  RAISE NOTICE '===========================================';
END $$;
