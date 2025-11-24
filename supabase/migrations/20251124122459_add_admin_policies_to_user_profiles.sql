-- Migration: Add Admin Policies to user_profiles
-- Purpose: Allow admins to read all user profiles for hierarchy management
-- Created: 2025-11-24
--
-- PROBLEM: Hierarchy validation fails because code needs to read arbitrary user profiles
--          to validate upline assignments, but there's no RLS policy allowing this.
--          We removed admin policies earlier due to infinite recursion with is_admin check.
--
-- SOLUTION: Add admin policies using is_admin() helper function (which we already created)
--          This avoids infinite recursion because is_admin() is SECURITY DEFINER.

BEGIN;

-- ============================================
-- Ensure is_admin() helper exists and is correct
-- ============================================

-- This function should already exist from the override_commissions migration
-- But let's ensure it's correct
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.is_admin = true
  );
END;
$$;

-- ============================================
-- Add admin policies to user_profiles
-- ============================================

-- Admin can view all profiles (needed for hierarchy management)
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  USING (is_admin());

-- Admin can update all profiles (needed for approval, hierarchy changes)
CREATE POLICY "Admins can update all user profiles"
  ON user_profiles
  FOR UPDATE
  USING (is_admin());

-- Admin can delete profiles if needed
CREATE POLICY "Admins can delete user profiles"
  ON user_profiles
  FOR DELETE
  USING (is_admin());

COMMIT;

-- ============================================
-- Verification and Success message
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
  RAISE NOTICE 'Admin Policies Added to user_profiles!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Total RLS policies on user_profiles: %', policy_count;
  RAISE NOTICE 'Admins can now:';
  RAISE NOTICE '  - View all user profiles';
  RAISE NOTICE '  - Update all user profiles';
  RAISE NOTICE '  - Delete user profiles';
  RAISE NOTICE '';
  RAISE NOTICE 'This enables hierarchy validation and user management.';
  RAISE NOTICE '===========================================';
END $$;
