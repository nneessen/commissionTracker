-- Migration: Fix admin_get_all_users to include contract_level
-- Problem: User Management Dashboard shows "Not set" for all users' contract levels
-- Root Cause: admin_get_all_users() function doesn't include contract_level in its return type
-- Solution: Add contract_level to RETURNS TABLE and SELECT statements

BEGIN;

-- ============================================
-- Update admin_get_all_users() to include contract_level
-- ============================================

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
  hierarchy_depth INTEGER,
  contract_level INTEGER  -- ADDED
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  caller_is_admin BOOLEAN;
BEGIN
  -- Check if caller is admin WITHOUT querying user_profiles (avoid recursion)
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
    up.hierarchy_depth,
    up.contract_level  -- ADDED
  FROM user_profiles up
  ORDER BY up.created_at DESC;
END;
$$;

-- ============================================
-- Update admin_get_pending_users() to include contract_level
-- ============================================

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
  hierarchy_depth INTEGER,
  contract_level INTEGER  -- ADDED
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
    up.hierarchy_depth,
    up.contract_level  -- ADDED
  FROM user_profiles up
  WHERE up.approval_status = 'pending'
  ORDER BY up.created_at DESC;
END;
$$;

-- ============================================
-- Update admin_get_user_profile() to include contract_level
-- ============================================

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
  hierarchy_depth INTEGER,
  contract_level INTEGER  -- ADDED
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
    up.hierarchy_depth,
    up.contract_level  -- ADDED
  FROM user_profiles up
  WHERE up.id = target_user_id;
END;
$$;

COMMIT;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Migration: Fix admin functions - contract_level';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Updated 3 admin functions to include contract_level:';
    RAISE NOTICE '  1. admin_get_all_users() - now returns contract_level';
    RAISE NOTICE '  2. admin_get_pending_users() - now returns contract_level';
    RAISE NOTICE '  3. admin_get_user_profile(UUID) - now returns contract_level';
    RAISE NOTICE '';
    RAISE NOTICE 'User Management Dashboard will now display contract levels correctly.';
    RAISE NOTICE '===========================================';
END $$;
