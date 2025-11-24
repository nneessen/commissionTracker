-- Migration: Fix Override Commissions RLS Policies
-- Purpose: Fix RLS policies that query auth.users table (not allowed)
-- Created: 2025-11-24
--
-- PROBLEM: RLS policies on override_commissions table query auth.users directly,
--          causing "permission denied for table users" errors.
--
-- SOLUTION: Replace policies to check admin status via user_profiles.is_admin
--          instead of querying auth.users.

BEGIN;

-- ============================================
-- Drop old policies that query auth.users
-- ============================================

DROP POLICY IF EXISTS "Admins can view all overrides" ON override_commissions;
DROP POLICY IF EXISTS "Admins can update override commissions" ON override_commissions;
DROP POLICY IF EXISTS "Admins can delete override commissions" ON override_commissions;

-- ============================================
-- Create new admin policies using is_admin helper
-- ============================================

-- Helper function to check if user is admin (already exists, but recreating for clarity)
-- This queries user_profiles, not auth.users, avoiding permission issues
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$;

-- New admin policies using is_admin()
CREATE POLICY "Admins can view all override commissions"
  ON override_commissions
  FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update override commissions"
  ON override_commissions
  FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete override commissions"
  ON override_commissions
  FOR DELETE
  USING (is_admin());

CREATE POLICY "Admins can insert override commissions"
  ON override_commissions
  FOR INSERT
  WITH CHECK (is_admin());

-- ============================================
-- Verify user policies are correct
-- ============================================
-- These policies should already exist and don't query auth.users
-- Just verifying they're still there:

DO $$
BEGIN
  -- Check if user policies exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'override_commissions'
    AND policyname = 'Users can view own override commissions'
  ) THEN
    RAISE EXCEPTION 'User policy "Users can view own override commissions" is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'override_commissions'
    AND policyname = 'Users can view overrides from own policies'
  ) THEN
    RAISE EXCEPTION 'User policy "Users can view overrides from own policies" is missing';
  END IF;
END $$;

COMMIT;

-- ============================================
-- Success message
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Override Commissions RLS Policies Fixed!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Replaced auth.users queries with is_admin()';
  RAISE NOTICE 'Admin policies now work correctly';
  RAISE NOTICE 'User policies verified';
  RAISE NOTICE '===========================================';
END $$;
