-- Migration: Fix admin RPC functions to exclude soft-deleted users
-- Issue: admin_get_all_users, admin_get_pending_users, and admin_get_user_profile
-- were returning soft-deleted users (is_deleted = true), causing them to appear
-- in the admin panel even after deletion from the recruiting page.

-- ============================================
-- FIX 1: admin_get_all_users - filter out deleted users
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  roles TEXT[],
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
  contract_level INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- If admin, return all ACTIVE users (exclude soft-deleted)
  RETURN QUERY
  SELECT
    up.id,
    up.email,
    COALESCE(
      CASE
        WHEN up.first_name IS NOT NULL AND up.last_name IS NOT NULL
          THEN up.first_name || ' ' || up.last_name
        WHEN up.first_name IS NOT NULL
          THEN up.first_name
        WHEN up.last_name IS NOT NULL
          THEN up.last_name
        ELSE NULL
      END,
      NULL
    ) AS full_name,
    up.roles,
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
    up.contract_level
  FROM user_profiles up
  WHERE up.is_deleted IS NOT TRUE  -- CRITICAL: Exclude soft-deleted users
  ORDER BY up.created_at DESC;
END;
$$;

-- ============================================
-- FIX 2: admin_get_pending_users - filter out deleted users
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_pending_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  roles TEXT[],
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
  contract_level INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- If admin, return pending users (exclude soft-deleted)
  RETURN QUERY
  SELECT
    up.id,
    up.email,
    COALESCE(
      CASE
        WHEN up.first_name IS NOT NULL AND up.last_name IS NOT NULL
          THEN up.first_name || ' ' || up.last_name
        WHEN up.first_name IS NOT NULL
          THEN up.first_name
        WHEN up.last_name IS NOT NULL
          THEN up.last_name
        ELSE NULL
      END,
      NULL
    ) AS full_name,
    up.roles,
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
    up.contract_level
  FROM user_profiles up
  WHERE up.approval_status = 'pending'
    AND up.is_deleted IS NOT TRUE  -- CRITICAL: Exclude soft-deleted users
  ORDER BY up.created_at DESC;
END;
$$;

-- ============================================
-- FIX 3: admin_get_user_profile - filter out deleted users
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_user_profile(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  roles TEXT[],
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
  contract_level INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- If admin, return the requested user (but not if deleted)
  RETURN QUERY
  SELECT
    up.id,
    up.email,
    COALESCE(
      CASE
        WHEN up.first_name IS NOT NULL AND up.last_name IS NOT NULL
          THEN up.first_name || ' ' || up.last_name
        WHEN up.first_name IS NOT NULL
          THEN up.first_name
        WHEN up.last_name IS NOT NULL
          THEN up.last_name
        ELSE NULL
      END,
      NULL
    ) AS full_name,
    up.roles,
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
    up.contract_level
  FROM user_profiles up
  WHERE up.id = target_user_id
    AND up.is_deleted IS NOT TRUE;  -- CRITICAL: Exclude soft-deleted users
END;
$$;

-- ============================================
-- FIX 4: admin_get_all_users_v2 - filter out deleted users
-- ============================================
CREATE OR REPLACE FUNCTION admin_get_all_users_v2()
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_is_admin BOOLEAN := FALSE;
BEGIN
  -- Get the caller's ID
  caller_id := auth.uid();

  -- Check if caller exists and is admin in user_profiles
  SELECT up.is_admin INTO caller_is_admin
  FROM user_profiles up
  WHERE up.id = caller_id;

  -- If not admin or user not found, return empty
  IF NOT COALESCE(caller_is_admin, FALSE) THEN
    RETURN;
  END IF;

  -- Return all ACTIVE users (exclude soft-deleted)
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
  WHERE up.is_deleted IS NOT TRUE  -- CRITICAL: Exclude soft-deleted users
  ORDER BY up.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_pending_users() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_users_v2() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION admin_get_all_users() IS 'Returns all active (non-deleted) user profiles for admin users. Soft-deleted users (is_deleted=true) are excluded.';
COMMENT ON FUNCTION admin_get_pending_users() IS 'Returns all pending (non-deleted) user profiles for admin users. Soft-deleted users are excluded.';
COMMENT ON FUNCTION admin_get_user_profile(UUID) IS 'Returns a specific user profile by ID for admin users. Soft-deleted users are excluded.';
