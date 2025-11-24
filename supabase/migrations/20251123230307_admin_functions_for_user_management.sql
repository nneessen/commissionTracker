-- Migration: Admin Functions for User Management
-- Purpose: Create SECURITY DEFINER functions that bypass RLS for admin operations
-- Created: 2025-11-23
--
-- PROBLEM: After removing user_profiles_admin_all policy (infinite recursion fix),
--          admins can only see their own profile + downline profiles.
--          New users with no upline are invisible to admins.
--
-- SOLUTION: Create SECURITY DEFINER functions that:
--          1. Check if caller is admin
--          2. Bypass RLS to return all users (only if admin)
--          3. Are safe from infinite recursion (don't query user_profiles to check admin status)

BEGIN;

-- ============================================
-- Step 0: Ensure admin user has is_admin in auth.users metadata
-- ============================================
-- This is required for the functions to work correctly
-- They check auth.users.raw_user_meta_data instead of user_profiles.is_admin

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
WHERE email = 'nick@nickneessen.com';

-- ============================================
-- Function 1: Get All Users (Admin Only)
-- ============================================
-- Returns all user profiles for admin users
-- SECURITY DEFINER: Runs with postgres privileges, bypassing RLS
-- Safe from infinite recursion: Uses auth.jwt() to check admin status

CREATE OR REPLACE FUNCTION admin_get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  approval_status TEXT,
  is_admin BOOLEAN,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  upline_id UUID,
  hierarchy_path TEXT,
  hierarchy_depth INTEGER
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  caller_is_admin BOOLEAN;
BEGIN
  -- Check if caller is admin WITHOUT querying user_profiles (avoid recursion)
  -- This queries auth.users metadata directly
  SELECT
    COALESCE(
      (raw_user_meta_data->>'is_admin')::BOOLEAN,
      FALSE
    ) INTO caller_is_admin
  FROM auth.users
  WHERE auth.users.id = auth.uid();

  -- If not admin, return empty result
  IF NOT COALESCE(caller_is_admin, FALSE) THEN
    RETURN;
  END IF;

  -- If admin, return all users (bypassing RLS due to SECURITY DEFINER)
  RETURN QUERY
  SELECT
    up.id,
    up.email,
    up.approval_status,
    up.is_admin,
    up.approved_by,
    up.approved_at,
    up.denied_at,
    up.denial_reason,
    up.created_at,
    up.updated_at,
    up.upline_id,
    up.hierarchy_path,
    up.hierarchy_depth
  FROM user_profiles up
  ORDER BY up.created_at DESC;
END;
$$;

-- ============================================
-- Function 2: Get Pending Users (Admin Only)
-- ============================================
-- Returns only pending users for admin users
-- Same security model as admin_get_all_users

CREATE OR REPLACE FUNCTION admin_get_pending_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  approval_status TEXT,
  is_admin BOOLEAN,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  upline_id UUID,
  hierarchy_path TEXT,
  hierarchy_depth INTEGER
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  caller_is_admin BOOLEAN;
BEGIN
  -- Check if caller is admin WITHOUT querying user_profiles
  SELECT
    COALESCE(
      (raw_user_meta_data->>'is_admin')::BOOLEAN,
      FALSE
    ) INTO caller_is_admin
  FROM auth.users
  WHERE auth.users.id = auth.uid();

  -- If not admin, return empty result
  IF NOT COALESCE(caller_is_admin, FALSE) THEN
    RETURN;
  END IF;

  -- If admin, return pending users only
  RETURN QUERY
  SELECT
    up.id,
    up.email,
    up.approval_status,
    up.is_admin,
    up.approved_by,
    up.approved_at,
    up.denied_at,
    up.denial_reason,
    up.created_at,
    up.updated_at,
    up.upline_id,
    up.hierarchy_path,
    up.hierarchy_depth
  FROM user_profiles up
  WHERE up.approval_status = 'pending'
  ORDER BY up.created_at DESC;
END;
$$;

-- ============================================
-- Function 3: Get User Profile by ID (Admin Only)
-- ============================================
-- Returns a specific user's profile for admin users
-- Useful for viewing/editing other users' profiles

CREATE OR REPLACE FUNCTION admin_get_user_profile(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  approval_status TEXT,
  is_admin BOOLEAN,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  upline_id UUID,
  hierarchy_path TEXT,
  hierarchy_depth INTEGER
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  caller_is_admin BOOLEAN;
BEGIN
  -- Check if caller is admin WITHOUT querying user_profiles
  SELECT
    COALESCE(
      (raw_user_meta_data->>'is_admin')::BOOLEAN,
      FALSE
    ) INTO caller_is_admin
  FROM auth.users
  WHERE auth.users.id = auth.uid();

  -- If not admin, return empty result
  IF NOT COALESCE(caller_is_admin, FALSE) THEN
    RETURN;
  END IF;

  -- If admin, return the requested user profile
  RETURN QUERY
  SELECT
    up.id,
    up.email,
    up.approval_status,
    up.is_admin,
    up.approved_by,
    up.approved_at,
    up.denied_at,
    up.denial_reason,
    up.created_at,
    up.updated_at,
    up.upline_id,
    up.hierarchy_path,
    up.hierarchy_depth
  FROM user_profiles up
  WHERE up.id = target_user_id;
END;
$$;

-- ============================================
-- Grant Execute Permissions
-- ============================================

GRANT EXECUTE ON FUNCTION admin_get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_pending_users() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user_profile(UUID) TO authenticated;

COMMIT;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Admin Functions Created Successfully!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Created 3 SECURITY DEFINER functions:';
    RAISE NOTICE '  1. admin_get_all_users()';
    RAISE NOTICE '  2. admin_get_pending_users()';
    RAISE NOTICE '  3. admin_get_user_profile(UUID)';
    RAISE NOTICE '';
    RAISE NOTICE 'These functions bypass RLS and are safe from infinite recursion.';
    RAISE NOTICE 'They check admin status using auth.users.raw_user_meta_data.';
    RAISE NOTICE '';
    RAISE NOTICE 'Admin user updated: nick@nickneessen.com';
    RAISE NOTICE '===========================================';
END $$;
