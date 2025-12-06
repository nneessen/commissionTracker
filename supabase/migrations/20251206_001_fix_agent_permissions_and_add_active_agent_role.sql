-- Migration: Fix agent permissions and add active_agent role
-- Purpose:
--   1. Add missing navigation permissions to base agent role
--   2. Create active_agent role with full agent permissions
--   3. Update existing agents to have proper access
-- Created: 2025-12-06

BEGIN;

-- ============================================
-- 1. ADD MISSING NAVIGATION PERMISSIONS TO AGENT ROLE
-- ============================================

-- First, add the missing navigation permissions that agents should have
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'agent'),
  id
FROM permissions
WHERE code IN (
  -- Missing navigation permissions
  'nav.team_dashboard',       -- Access to Team/Hierarchy page
  'nav.recruiting_pipeline',  -- Access to Recruiting page (for their own recruits)
  'nav.downline_reports'      -- Access to Reports page (for their metrics)
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. CREATE ACTIVE_AGENT ROLE
-- ============================================

-- Insert the active_agent role (inherits from agent)
INSERT INTO roles (name, display_name, description, parent_role_id, respects_hierarchy, is_system_role)
SELECT
  'active_agent'::TEXT,
  'Active Agent'::TEXT,
  'Full-featured agent with complete access to all agent tools'::TEXT,
  (SELECT id FROM roles WHERE name = 'agent'),
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'active_agent');

-- Add additional permissions to active_agent beyond base agent
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'active_agent'),
  id
FROM permissions
WHERE code IN (
  -- Downline permissions (can see their team's data)
  'policies.read.downline',
  'clients.read.downline',
  'commissions.read.downline',
  'recruiting.read.downline',
  'recruiting.update.downline',

  -- Additional navigation
  'nav.commission_overrides'  -- Can manage commission overrides for their team
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. UPDATE EXISTING USERS
-- ============================================

-- Update users who were created as "agents" but should be "active_agents"
-- This includes anyone with approval_status = 'approved' and contract_level >= 50
UPDATE user_profiles
SET roles = ARRAY['active_agent']
WHERE
  approval_status = 'approved'
  AND 'agent' = ANY(roles)
  AND contract_level >= 50
  AND email NOT IN ('nick@nickneessen.com', 'kerryglass.ffl@gmail.com'); -- Exclude admins

-- ============================================
-- 4. CREATE HELPER FUNCTION FOR ROLE ASSIGNMENT
-- ============================================

-- Function to assign appropriate role based on user attributes
CREATE OR REPLACE FUNCTION assign_user_role(
  p_user_id UUID,
  p_contract_level INTEGER DEFAULT NULL,
  p_is_recruit BOOLEAN DEFAULT FALSE,
  p_requested_role TEXT DEFAULT NULL
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roles TEXT[];
BEGIN
  -- If admin explicitly sets a role, use it
  IF p_requested_role IS NOT NULL THEN
    -- Validate the role exists
    IF EXISTS (SELECT 1 FROM roles WHERE name = p_requested_role) THEN
      v_roles := ARRAY[p_requested_role];
    ELSE
      RAISE EXCEPTION 'Invalid role: %', p_requested_role;
    END IF;
  -- Otherwise, auto-assign based on attributes
  ELSIF p_is_recruit THEN
    v_roles := ARRAY['recruit'];
  ELSIF p_contract_level IS NOT NULL AND p_contract_level >= 50 THEN
    v_roles := ARRAY['active_agent'];
  ELSE
    v_roles := ARRAY['agent'];
  END IF;

  RETURN v_roles;
END;
$$;

-- ============================================
-- 5. UPDATE HANDLE_NEW_USER FUNCTION
-- ============================================

-- Update the trigger to assign appropriate roles for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_profile_id uuid;
  user_roles TEXT[];
BEGIN
  SET LOCAL row_security = off;

  -- Check if a user_profile with this email already exists (admin-created profile)
  SELECT id INTO existing_profile_id
  FROM public.user_profiles
  WHERE LOWER(email) = LOWER(NEW.email)
  LIMIT 1;

  IF existing_profile_id IS NOT NULL THEN
    -- Profile exists (admin pre-created) - link the auth account to it
    UPDATE public.user_profiles
    SET
      user_id = NEW.id,
      -- If they're signing up, they should be approved (unless already set)
      approval_status = CASE
        WHEN approval_status = 'pending' AND NEW.email = 'nick@nickneessen.com' THEN 'approved'
        ELSE approval_status
      END,
      is_admin = CASE
        WHEN NEW.email = 'nick@nickneessen.com' THEN true
        ELSE is_admin
      END,
      -- Set appropriate role if not already set
      roles = CASE
        WHEN roles IS NULL OR array_length(roles, 1) = 0 THEN
          CASE
            WHEN NEW.email IN ('nick@nickneessen.com', 'kerryglass.ffl@gmail.com') THEN ARRAY['admin']
            WHEN contract_level >= 50 THEN ARRAY['active_agent']
            ELSE ARRAY['agent']
          END
        ELSE roles
      END,
      updated_at = NOW()
    WHERE id = existing_profile_id;
  ELSE
    -- No existing profile - create a new one
    -- Determine appropriate role
    IF NEW.email IN ('nick@nickneessen.com', 'kerryglass.ffl@gmail.com') THEN
      user_roles := ARRAY['admin'];
    ELSE
      user_roles := ARRAY['agent']; -- Default to basic agent, admin can upgrade later
    END IF;

    INSERT INTO public.user_profiles (
      id,
      user_id,
      email,
      roles,
      is_admin,
      is_super_admin,
      approval_status,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      NEW.id,
      NEW.email,
      user_roles,
      NEW.email = 'nick@nickneessen.com',
      NEW.email = 'nick@nickneessen.com',
      CASE
        WHEN NEW.email IN ('nick@nickneessen.com', 'kerryglass.ffl@gmail.com') THEN 'approved'
        ELSE 'pending'
      END,
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- 6. SUCCESS MESSAGE
-- ============================================

DO $$
DECLARE
  agent_perm_count INTEGER;
  active_agent_count INTEGER;
  updated_users INTEGER;
BEGIN
  -- Count permissions for agent role
  SELECT COUNT(*) INTO agent_perm_count
  FROM role_permissions rp
  JOIN roles r ON r.id = rp.role_id
  WHERE r.name = 'agent';

  -- Count permissions for active_agent role
  SELECT COUNT(*) INTO active_agent_count
  FROM role_permissions rp
  JOIN roles r ON r.id = rp.role_id
  WHERE r.name = 'active_agent';

  -- Count updated users
  SELECT COUNT(*) INTO updated_users
  FROM user_profiles
  WHERE 'active_agent' = ANY(roles);

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Agent Permissions Fixed Successfully!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Agent role now has % permissions', agent_perm_count;
  RAISE NOTICE 'Active Agent role created with % permissions', active_agent_count;
  RAISE NOTICE 'Updated % users to active_agent role', updated_users;
  RAISE NOTICE '';
  RAISE NOTICE 'Role Hierarchy:';
  RAISE NOTICE '  - agent: Basic agent with core permissions';
  RAISE NOTICE '  - active_agent: Full agent with team management (inherits from agent)';
  RAISE NOTICE '  - upline_manager: Team leader (inherits from agent)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Users with contract_level >= 50 now have active_agent role';
  RAISE NOTICE '  2. New users can be assigned appropriate roles';
  RAISE NOTICE '  3. Update the UI to allow role selection';
  RAISE NOTICE '===========================================';
END $$;

COMMIT;