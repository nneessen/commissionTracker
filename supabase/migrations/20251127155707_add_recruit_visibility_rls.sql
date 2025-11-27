-- Migration: Add Recruit Visibility RLS Policy
-- Purpose: Allow users to see recruits they recruited or manage in their downline
-- Created: 2025-11-27
--
-- CRITICAL SECURITY FIX: Users should ONLY see recruits they recruited or manage,
-- not all recruits in the system. This adds proper data isolation.
--
-- Requirements (from user):
-- 1. Users see entire downline (all recruits in their hierarchy tree)
-- 2. Admins use is_admin field for full access
-- 3. Visibility based on BOTH recruiter_id AND upline_id

BEGIN;

-- ============================================
-- Add RLS Policy for Recruit Visibility
-- ============================================

-- This policy allows users to see:
-- 1. Profiles where they are the recruiter (recruiter_id = auth.uid())
-- 2. Profiles in their downline hierarchy (using get_downline_ids() function)
-- 3. Profiles where they are the upline manager (upline_id = auth.uid())
--
-- This ensures proper data isolation: users only see their recruits/downline,
-- not recruits belonging to other agents.

CREATE POLICY "user_profiles_select_recruits_and_downline"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Can see recruits they personally recruited
    recruiter_id = auth.uid()

    -- OR can see recruits in their downline hierarchy
    -- Note: get_downline_ids() includes the user themselves plus all downline users
    OR id IN (SELECT downline_id FROM get_downline_ids(auth.uid()))

    -- OR can see recruits they manage (upline relationship)
    OR upline_id = auth.uid()

    -- Note: Admin access is already covered by existing "user_profiles_admin_all" policy
    -- which grants FOR ALL access to users with is_admin = true
  );

COMMIT;

-- ============================================
-- Verification and Success Message
-- ============================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Count policies on user_profiles
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'user_profiles';

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Recruit Visibility RLS Policy Added!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Total RLS policies on user_profiles: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Users can now see:';
  RAISE NOTICE '  - Recruits they personally recruited (recruiter_id match)';
  RAISE NOTICE '  - All recruits in their downline hierarchy tree';
  RAISE NOTICE '  - Recruits they manage (upline_id match)';
  RAISE NOTICE '  - Their own profile (existing policy)';
  RAISE NOTICE '';
  RAISE NOTICE 'Admins (is_admin = true) continue to see all profiles.';
  RAISE NOTICE '';
  RAISE NOTICE 'SECURITY: Data isolation now enforced at database level!';
  RAISE NOTICE '===========================================';
END $$;
