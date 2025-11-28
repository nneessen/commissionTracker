-- Migration: Fix admin_get_all_users to include roles and full_name
-- Problem: Admin Control Center shows wrong stats because RPC doesn't return roles array
-- Root Cause: admin_get_all_users() function doesn't include roles TEXT[] or computed full_name
-- Solution: Add roles and full_name (first_name + last_name) to RETURNS TABLE and SELECT

BEGIN;

-- ============================================
-- Drop existing functions first (return type changed)
-- ============================================

DROP FUNCTION IF EXISTS admin_get_all_users();
DROP FUNCTION IF EXISTS admin_get_pending_users();
DROP FUNCTION IF EXISTS admin_get_user_profile(UUID);

-- ============================================
-- Update admin_get_all_users() to include roles and full_name
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

  -- If admin, return all users with computed full_name and roles
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
  ORDER BY up.created_at DESC;
END;
$$;

-- ============================================
-- Update admin_get_pending_users() to include roles and full_name
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

  -- If admin, return pending users with computed full_name and roles
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
  ORDER BY up.created_at DESC;
END;
$$;

-- ============================================
-- Update admin_get_user_profile() to include roles and full_name
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

  -- If admin, return the requested user with computed full_name and roles
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
    RAISE NOTICE 'Migration: Fix admin functions - roles and full_name';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Updated 3 admin functions to include:';
    RAISE NOTICE '  - roles TEXT[] (from user_profiles.roles)';
    RAISE NOTICE '  - full_name (computed from first_name + last_name)';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions updated:';
    RAISE NOTICE '  1. admin_get_all_users()';
    RAISE NOTICE '  2. admin_get_pending_users()';
    RAISE NOTICE '  3. admin_get_user_profile(UUID)';
    RAISE NOTICE '';
    RAISE NOTICE 'Admin Control Center stats will now be accurate.';
    RAISE NOTICE '===========================================';
END $$;
