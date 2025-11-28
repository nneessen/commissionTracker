-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251128230740_fix_admin_rpc_check_user_profiles_is_admin.sql
-- Migration: Fix admin RPC functions to check user_profiles.is_admin instead of auth metadata
-- Problem: admin_get_all_users() returns empty because it checks auth.users.raw_user_meta_data->>'is_admin'
--          but admin users have is_admin set in user_profiles table, not in auth metadata
-- Root Cause: Functions check wrong location for admin status
-- Solution: Check user_profiles.is_admin instead of auth metadata

BEGIN;

-- ============================================
-- Fix admin_get_all_users() to check user_profiles.is_admin
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
  contract_level INTEGER,
  onboarding_status TEXT,
  current_onboarding_phase TEXT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  caller_is_admin BOOLEAN;
BEGIN
  -- Check if caller is admin by looking at user_profiles table
  SELECT COALESCE(up.is_admin, FALSE)
  INTO caller_is_admin
  FROM user_profiles up
  WHERE up.id = auth.uid();

  -- If not admin, return empty result
  IF NOT COALESCE(caller_is_admin, FALSE) THEN
    RETURN;
  END IF;

  -- If admin, return all users with computed full_name, roles, and onboarding fields
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
    up.contract_level,
    up.onboarding_status,
    up.current_onboarding_phase
  FROM user_profiles up
  ORDER BY up.created_at DESC;
END;
$$;

-- ============================================
-- Fix admin_get_pending_users() to check user_profiles.is_admin
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
  contract_level INTEGER,
  onboarding_status TEXT,
  current_onboarding_phase TEXT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  caller_is_admin BOOLEAN;
BEGIN
  -- Check if caller is admin by looking at user_profiles table
  SELECT COALESCE(up.is_admin, FALSE)
  INTO caller_is_admin
  FROM user_profiles up
  WHERE up.id = auth.uid();

  -- If not admin, return empty result
  IF NOT COALESCE(caller_is_admin, FALSE) THEN
    RETURN;
  END IF;

  -- If admin, return pending users with computed full_name, roles, and onboarding fields
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
    up.contract_level,
    up.onboarding_status,
    up.current_onboarding_phase
  FROM user_profiles up
  WHERE up.approval_status = 'pending'
  ORDER BY up.created_at DESC;
END;
$$;

-- ============================================
-- Fix admin_get_user_profile() to check user_profiles.is_admin
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
  contract_level INTEGER,
  onboarding_status TEXT,
  current_onboarding_phase TEXT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  caller_is_admin BOOLEAN;
BEGIN
  -- Check if caller is admin by looking at user_profiles table
  SELECT COALESCE(up.is_admin, FALSE)
  INTO caller_is_admin
  FROM user_profiles up
  WHERE up.id = auth.uid();

  -- If not admin, return empty result
  IF NOT COALESCE(caller_is_admin, FALSE) THEN
    RETURN;
  END IF;

  -- If admin, return the requested user with computed full_name, roles, and onboarding fields
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
    up.contract_level,
    up.onboarding_status,
    up.current_onboarding_phase
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
    RAISE NOTICE 'Migration: Fix admin RPC functions';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Updated 3 admin functions to:';
    RAISE NOTICE '  - Check user_profiles.is_admin instead of auth metadata';
    RAISE NOTICE '  - Include onboarding_status and current_onboarding_phase';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions updated:';
    RAISE NOTICE '  1. admin_get_all_users()';
    RAISE NOTICE '  2. admin_get_pending_users()';
    RAISE NOTICE '  3. admin_get_user_profile(UUID)';
    RAISE NOTICE '';
    RAISE NOTICE 'Admin users can now retrieve data properly.';
    RAISE NOTICE '===========================================';
END $$;
