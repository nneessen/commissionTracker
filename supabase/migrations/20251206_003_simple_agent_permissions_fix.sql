-- Migration: Simple fix for agent permissions and active_agent role
-- Purpose:
--   1. Create active_agent role with full permissions
--   2. Update existing users with contract_level >= 50 to active_agent
-- Created: 2025-12-06

BEGIN;

-- ============================================
-- 1. CREATE ACTIVE_AGENT ROLE IF NOT EXISTS
-- ============================================

INSERT INTO roles (name, display_name, description, parent_role_id, respects_hierarchy, is_system_role)
SELECT
  'active_agent'::TEXT,
  'Active Agent'::TEXT,
  'Full-featured agent with complete access to all agent tools'::TEXT,
  (SELECT id FROM roles WHERE name = 'agent'),
  true,
  false -- Not a system role, so it can be modified
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'active_agent');

-- ============================================
-- 2. ADD PERMISSIONS TO ACTIVE_AGENT ROLE
-- ============================================

-- First, give active_agent all the base agent permissions (through inheritance)
-- The parent_role_id relationship handles this

-- Then add additional permissions specific to active_agent
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'active_agent'),
  id
FROM permissions
WHERE code IN (
  -- Base navigation that all agents should have
  'nav.dashboard',
  'nav.policies',
  'nav.clients',
  'nav.commissions',
  'nav.team_dashboard',
  'nav.recruiting_pipeline',
  'nav.downline_reports',

  -- Own data permissions
  'policies.create.own',
  'policies.read.own',
  'policies.update.own',
  'policies.delete.own',
  'clients.create.own',
  'clients.read.own',
  'clients.update.own',
  'clients.delete.own',
  'commissions.read.own',
  'expenses.create.own',
  'expenses.read.own',
  'expenses.update.own',
  'expenses.delete.own',
  'recruiting.create.own',
  'recruiting.read.own',
  'recruiting.update.own',
  'recruiting.delete.own',

  -- Downline permissions (what makes them "active")
  'policies.read.downline',
  'clients.read.downline',
  'commissions.read.downline',
  'recruiting.read.downline',
  'recruiting.update.downline',
  'nav.commission_overrides',
  'commission_overrides.manage'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. UPDATE EXISTING USERS TO ACTIVE_AGENT
-- ============================================

-- Update users who were created as "agents" but should be "active_agents"
-- This includes anyone with approval_status = 'approved' and contract_level >= 50
UPDATE user_profiles
SET roles = ARRAY['active_agent']
WHERE
  approval_status = 'approved'
  AND ('agent' = ANY(roles) OR roles IS NULL OR array_length(roles, 1) = 0)
  AND (contract_level IS NULL OR contract_level >= 50)  -- If no contract level, assume they're active
  AND email NOT IN ('nick@nickneessen.com', 'kerryglass.ffl@gmail.com'); -- Exclude admins

-- ============================================
-- 4. CREATE/UPDATE ROLE ASSIGNMENT FUNCTION
-- ============================================

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
  ELSIF p_contract_level IS NULL OR p_contract_level >= 50 THEN
    -- Default to active_agent for most users
    v_roles := ARRAY['active_agent'];
  ELSE
    v_roles := ARRAY['agent'];
  END IF;

  RETURN v_roles;
END;
$$;

-- ============================================
-- 5. VERIFICATION
-- ============================================

DO $$
DECLARE
  active_agent_id UUID;
  active_agent_perms INTEGER;
  updated_users INTEGER;
BEGIN
  -- Get the active_agent role ID
  SELECT id INTO active_agent_id FROM roles WHERE name = 'active_agent';

  -- Count permissions for active_agent role
  SELECT COUNT(*) INTO active_agent_perms
  FROM role_permissions
  WHERE role_id = active_agent_id;

  -- Count updated users
  SELECT COUNT(*) INTO updated_users
  FROM user_profiles
  WHERE 'active_agent' = ANY(roles);

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Active Agent Role Setup Complete!';
  RAISE NOTICE '===========================================';

  IF active_agent_id IS NOT NULL THEN
    RAISE NOTICE 'Active Agent role created/verified';
    RAISE NOTICE 'Permissions assigned: %', active_agent_perms;
    RAISE NOTICE 'Users with active_agent role: %', updated_users;
  ELSE
    RAISE NOTICE 'WARNING: Active Agent role creation may have failed';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Test login with an active agent user';
  RAISE NOTICE '  2. Verify all navigation items are visible';
  RAISE NOTICE '  3. Check that permissions are working correctly';
  RAISE NOTICE '===========================================';
END $$;

COMMIT;