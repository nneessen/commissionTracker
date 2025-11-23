-- Migration: Update RLS Policies for Hierarchical Data Access
-- Purpose: Allow uplines to VIEW downline data (policies, commissions, clients)
--          Users can still only MODIFY their own data (not downlines')
-- CRITICAL: Does NOT modify user_profiles RLS policies or approval system
-- Created: 2025-11-23

BEGIN;

-- ============================================
-- CRITICAL REMINDER
-- ============================================
-- DO NOT MODIFY user_profiles RLS POLICIES
-- DO NOT MODIFY is_user_approved() FUNCTION
-- Admin access MUST always work
-- ============================================

-- ============================================
-- 1. UPDATE POLICIES TABLE RLS
-- ============================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own policies" ON policies;
DROP POLICY IF EXISTS "Users can view own and downline policies" ON policies;
DROP POLICY IF EXISTS "Approved users can view own policies" ON policies;

-- Create new SELECT policy: users can view own + all downlines' policies
CREATE POLICY "Users can view own and downline policies" ON policies
  FOR SELECT
  USING (
    user_id IN (SELECT downline_id FROM get_downline_ids(auth.uid()))
    AND is_user_approved()
  );

-- Keep existing modification policies (users can only modify OWN policies, not downlines')
DROP POLICY IF EXISTS "Users can create own policies" ON policies;
DROP POLICY IF EXISTS "Approved users can create own policies" ON policies;

CREATE POLICY "Approved users can create own policies" ON policies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_user_approved());

DROP POLICY IF EXISTS "Users can update own policies" ON policies;
DROP POLICY IF EXISTS "Approved users can update own policies" ON policies;

CREATE POLICY "Approved users can update own policies" ON policies
  FOR UPDATE
  USING (auth.uid() = user_id AND is_user_approved());

DROP POLICY IF EXISTS "Users can delete own policies" ON policies;
DROP POLICY IF EXISTS "Approved users can delete own policies" ON policies;

CREATE POLICY "Approved users can delete own policies" ON policies
  FOR DELETE
  USING (auth.uid() = user_id AND is_user_approved());

-- ============================================
-- 2. UPDATE COMMISSIONS TABLE RLS
-- ============================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own commissions" ON commissions;
DROP POLICY IF EXISTS "Users can view own and downline commissions" ON commissions;
DROP POLICY IF EXISTS "Approved users can view own commissions" ON commissions;

-- Create new SELECT policy: users can view own + all downlines' commissions
CREATE POLICY "Users can view own and downline commissions" ON commissions
  FOR SELECT
  USING (
    user_id IN (SELECT downline_id FROM get_downline_ids(auth.uid()))
    AND is_user_approved()
  );

-- Keep existing modification policies (users can only modify OWN commissions, not downlines')
DROP POLICY IF EXISTS "Users can create own commissions" ON commissions;
DROP POLICY IF EXISTS "Approved users can create own commissions" ON commissions;

CREATE POLICY "Approved users can create own commissions" ON commissions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_user_approved());

DROP POLICY IF EXISTS "Users can update own commissions" ON commissions;
DROP POLICY IF EXISTS "Approved users can update own commissions" ON commissions;

CREATE POLICY "Approved users can update own commissions" ON commissions
  FOR UPDATE
  USING (auth.uid() = user_id AND is_user_approved());

DROP POLICY IF EXISTS "Users can delete own commissions" ON commissions;
DROP POLICY IF EXISTS "Approved users can delete own commissions" ON commissions;

CREATE POLICY "Approved users can delete own commissions" ON commissions
  FOR DELETE
  USING (auth.uid() = user_id AND is_user_approved());

-- ============================================
-- 3. UPDATE CLIENTS TABLE RLS
-- ============================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Users can view own and downline clients" ON clients;

-- Create new SELECT policy: users can view own + all downlines' clients
CREATE POLICY "Users can view own and downline clients" ON clients
  FOR SELECT
  USING (
    user_id IN (SELECT downline_id FROM get_downline_ids(auth.uid()))
    AND is_user_approved()
  );

-- Keep existing modification policies (users can only modify OWN clients, not downlines')
DROP POLICY IF EXISTS "Users can create own clients" ON clients;

CREATE POLICY "Users can create own clients" ON clients
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_user_approved());

DROP POLICY IF EXISTS "Users can update own clients" ON clients;

CREATE POLICY "Users can update own clients" ON clients
  FOR UPDATE
  USING (auth.uid() = user_id AND is_user_approved());

DROP POLICY IF EXISTS "Users can delete own clients" ON clients;

CREATE POLICY "Users can delete own clients" ON clients
  FOR DELETE
  USING (auth.uid() = user_id AND is_user_approved());

-- ============================================
-- 4. ADD POLICY FOR VIEWING DOWNLINE PROFILES
-- ============================================

-- Users can view profiles of their downlines (read-only)
-- IMPORTANT: This does NOT modify existing user_profiles policies for viewing own profile
DROP POLICY IF EXISTS "Users can view downline profiles" ON user_profiles;

CREATE POLICY "Users can view downline profiles" ON user_profiles
  FOR SELECT
  USING (
    -- User can view profiles in their downline tree
    id IN (SELECT downline_id FROM get_downline_ids(auth.uid()))
    AND is_user_approved()
  );

-- Note: This policy will work alongside existing "Users can view own profile" policy
-- Multiple SELECT policies are combined with OR, so users can view own + downlines

COMMIT;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Migration 4: Hierarchical RLS Policies!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Updated RLS for hierarchical access:';
    RAISE NOTICE '';
    RAISE NOTICE 'VIEWING (uplines can see downline data):';
    RAISE NOTICE '  ý policies: view own + all downlines';
    RAISE NOTICE '  ý commissions: view own + all downlines';
    RAISE NOTICE '  ý clients: view own + all downlines';
    RAISE NOTICE '  ý user_profiles: view own + all downlines';
    RAISE NOTICE '';
    RAISE NOTICE 'MODIFICATION (users can only modify OWN data):';
    RAISE NOTICE '  ý policies: create/update/delete OWN only';
    RAISE NOTICE '  ý commissions: create/update/delete OWN only';
    RAISE NOTICE '  ý clients: create/update/delete OWN only';
    RAISE NOTICE '  ý user_profiles: NOT modified (existing policies preserved)';
    RAISE NOTICE '';
    RAISE NOTICE 'Uses get_downline_ids() function from Migration 1';
    RAISE NOTICE 'Admin access preserved (existing admin policies untouched)';
    RAISE NOTICE 'Approval system NOT modified (is_user_approved() still used)';
    RAISE NOTICE '===========================================';
END $$;
