-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251207_fix_user_service_and_role_duplicates.sql
-- Fix user service issues: duplicate roles, user categorization, and database functions
-- Created: 2025-12-07

BEGIN;

-- ============================================
-- 1. REMOVE DUPLICATE ROLES
-- ============================================

-- First, identify and keep only one active_agent role (the oldest one)
DO $$
DECLARE
  v_keep_id uuid;
  v_count integer;
BEGIN
  -- Count how many active_agent roles exist
  SELECT COUNT(*) INTO v_count FROM roles WHERE name = 'active_agent';

  IF v_count > 1 THEN
    -- Keep the oldest one
    SELECT id INTO v_keep_id
    FROM roles
    WHERE name = 'active_agent'
    ORDER BY created_at ASC NULLS FIRST, id ASC
    LIMIT 1;

    -- Move all role_permissions from duplicates to the keeper
    UPDATE role_permissions
    SET role_id = v_keep_id
    WHERE role_id IN (
      SELECT id FROM roles
      WHERE name = 'active_agent'
      AND id != v_keep_id
    );

    -- Delete the duplicate roles
    DELETE FROM roles
    WHERE name = 'active_agent'
    AND id != v_keep_id;

    RAISE NOTICE 'Removed % duplicate active_agent roles', v_count - 1;
  END IF;

  -- Do the same for any other potential duplicate roles
  FOR v_count IN
    SELECT COUNT(*) as cnt, name
    FROM roles
    GROUP BY name
    HAVING COUNT(*) > 1
  LOOP
    RAISE WARNING 'Found duplicate role: %', v_count.name;
  END LOOP;
END $$;

-- Add unique constraint to prevent future duplicates
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_unique;
ALTER TABLE roles ADD CONSTRAINT roles_name_unique UNIQUE (name);

-- ============================================
-- 2. FIX SPECIFIC USER DATA
-- ============================================

-- Fix nick.neessen@gmail.com to be properly categorized
UPDATE user_profiles
SET
  roles = ARRAY['active_agent']::text[],
  agent_status = 'licensed',
  approval_status = 'approved',
  is_admin = true,  -- Set as admin per user request
  is_super_admin = true,
  contract_level = 100,
  onboarding_status = NULL,  -- CRITICAL: Clear this to remove from recruiting pipeline
  current_onboarding_phase = NULL,
  onboarding_started_at = NULL,
  onboarding_completed_at = NULL
WHERE email = 'nick.neessen@gmail.com';

-- Also ensure any other active agents don't have onboarding_status
UPDATE user_profiles
SET
  onboarding_status = NULL,
  current_onboarding_phase = NULL
WHERE
  ('active_agent' = ANY(roles) OR 'admin' = ANY(roles))
  AND onboarding_status IS NOT NULL;

-- Fixed user data for active agents and admins

-- ============================================
-- 3. FIX UPDATE USER FUNCTION TO HANDLE SINGLE ROW
-- ============================================

-- Create or replace the admin_update_user function to ensure single row returns
CREATE OR REPLACE FUNCTION admin_update_user(
  p_user_id uuid,
  p_updates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_updated_user jsonb;
BEGIN
  -- Perform the update
  UPDATE user_profiles
  SET
    first_name = COALESCE((p_updates->>'first_name')::text, first_name),
    last_name = COALESCE((p_updates->>'last_name')::text, last_name),
    phone = COALESCE((p_updates->>'phone')::text, phone),
    upline_id = CASE
      WHEN p_updates ? 'upline_id' THEN
        CASE
          WHEN p_updates->>'upline_id' = 'null' THEN NULL
          ELSE (p_updates->>'upline_id')::uuid
        END
      ELSE upline_id
    END,
    roles = CASE
      WHEN p_updates ? 'roles' THEN
        ARRAY(SELECT jsonb_array_elements_text(p_updates->'roles'))::text[]
      ELSE roles
    END,
    approval_status = COALESCE((p_updates->>'approval_status')::text, approval_status),
    contract_level = CASE
      WHEN p_updates ? 'contract_level' THEN
        CASE
          WHEN p_updates->>'contract_level' = 'null' THEN NULL
          ELSE (p_updates->>'contract_level')::integer
        END
      ELSE contract_level
    END,
    street_address = COALESCE((p_updates->>'street_address')::text, street_address),
    city = COALESCE((p_updates->>'city')::text, city),
    state = COALESCE((p_updates->>'state')::text, state),
    zip = COALESCE((p_updates->>'zip')::text, zip),
    resident_state = COALESCE((p_updates->>'resident_state')::text, resident_state),
    license_number = COALESCE((p_updates->>'license_number')::text, license_number),
    license_state = COALESCE((p_updates->>'license_state')::text, license_state),
    linkedin_url = COALESCE((p_updates->>'linkedin_url')::text, linkedin_url),
    instagram_url = COALESCE((p_updates->>'instagram_url')::text, instagram_url),
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING to_jsonb(user_profiles.*) INTO v_updated_user;

  -- Return result as single JSON object
  IF v_updated_user IS NOT NULL THEN
    v_result := jsonb_build_object(
      'success', true,
      'data', v_updated_user
    );
  ELSE
    v_result := jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================
-- 4. CREATE HELPER VIEW FOR USER MANAGEMENT
-- ============================================

-- Create a view that properly categorizes users
CREATE OR REPLACE VIEW user_management_view AS
SELECT
  up.*,
  CASE
    WHEN 'admin' = ANY(up.roles) THEN 'admin'
    WHEN 'active_agent' = ANY(up.roles) THEN 'active_agent'
    WHEN 'agent' = ANY(up.roles) THEN 'agent'
    WHEN 'recruit' = ANY(up.roles) THEN 'recruit'
    ELSE 'other'
  END as primary_role,
  CASE
    WHEN up.onboarding_status IS NOT NULL
      AND NOT ('active_agent' = ANY(up.roles) OR 'admin' = ANY(up.roles))
    THEN true
    ELSE false
  END as in_recruiting_pipeline,
  CASE
    WHEN 'active_agent' = ANY(up.roles)
      OR 'agent' = ANY(up.roles)
      OR up.is_admin = true
    THEN true
    ELSE false
  END as in_users_list
FROM user_profiles up
WHERE up.is_deleted = false OR up.is_deleted IS NULL;

-- Grant appropriate permissions
GRANT SELECT ON user_management_view TO authenticated;

-- ============================================
-- 5. FIX RPC FUNCTIONS FOR PROPER RETURNS
-- ============================================

-- Update admin functions to ensure single row returns
CREATE OR REPLACE FUNCTION admin_get_user_by_id(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user jsonb;
BEGIN
  SELECT to_jsonb(up.*) INTO v_user
  FROM user_profiles up
  WHERE up.id = p_user_id
  LIMIT 1;  -- Ensure single row

  RETURN v_user;
END;
$$;

-- ============================================
-- 6. DATA INTEGRITY CHECKS
-- ============================================

DO $$
DECLARE
  v_active_agent_count integer;
  v_recruiting_count integer;
  v_nick_status record;
BEGIN
  -- Check active agents
  SELECT COUNT(*) INTO v_active_agent_count
  FROM user_profiles
  WHERE 'active_agent' = ANY(roles);

  -- Check recruiting pipeline
  SELECT COUNT(*) INTO v_recruiting_count
  FROM user_profiles
  WHERE onboarding_status IS NOT NULL
    AND NOT ('active_agent' = ANY(roles) OR 'admin' = ANY(roles));

  -- Check nick.neessen specifically
  SELECT
    roles,
    onboarding_status,
    is_admin,
    approval_status
  INTO v_nick_status
  FROM user_profiles
  WHERE email = 'nick.neessen@gmail.com';

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'User Service Fix Applied Successfully!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Active agents: %', v_active_agent_count;
  RAISE NOTICE 'Users in recruiting pipeline: %', v_recruiting_count;
  RAISE NOTICE '';
  RAISE NOTICE 'nick.neessen@gmail.com status:';
  RAISE NOTICE '  Roles: %', v_nick_status.roles;
  RAISE NOTICE '  Onboarding: %', COALESCE(v_nick_status.onboarding_status::text, 'NULL (correct!)');
  RAISE NOTICE '  Is Admin: %', v_nick_status.is_admin;
  RAISE NOTICE '  Approval: %', v_nick_status.approval_status;
  RAISE NOTICE '===========================================';
END $$;

COMMIT;