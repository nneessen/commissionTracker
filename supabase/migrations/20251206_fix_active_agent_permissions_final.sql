-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251206_fix_active_agent_permissions_final.sql
-- FINAL FIX for active_agent role permissions
-- This ensures active agents have full application access

-- First, ensure the active_agent role exists
INSERT INTO roles (id, name, display_name, description, is_system_role)
VALUES (
  gen_random_uuid(),
  'active_agent',
  'Active Agent',
  'Licensed agent with full application access',
  false
)
ON CONFLICT (name) DO UPDATE
SET
  display_name = 'Active Agent',
  description = 'Licensed agent with full application access';

-- Get the role ID
DO $$
DECLARE
  v_role_id uuid;
  v_permission_id uuid;
BEGIN
  -- Get active_agent role ID
  SELECT id INTO v_role_id FROM roles WHERE name = 'active_agent';

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'active_agent role not found';
  END IF;

  -- Clear existing permissions for active_agent to start fresh
  DELETE FROM role_permissions WHERE role_id = v_role_id;

  -- Grant ALL navigation permissions
  -- Dashboard access
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id FROM permissions WHERE code = 'nav.dashboard'
  ON CONFLICT DO NOTHING;

  -- Analytics access
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id FROM permissions WHERE code = 'nav.analytics'
  ON CONFLICT DO NOTHING;

  -- Targets access
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id FROM permissions WHERE code = 'nav.targets'
  ON CONFLICT DO NOTHING;

  -- Policies access
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id FROM permissions WHERE code = 'nav.policies'
  ON CONFLICT DO NOTHING;

  -- Team/Hierarchy access
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id FROM permissions WHERE code = 'nav.team_dashboard'
  ON CONFLICT DO NOTHING;

  -- Recruiting pipeline access
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id FROM permissions WHERE code = 'nav.recruiting_pipeline'
  ON CONFLICT DO NOTHING;

  -- Reports access
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id FROM permissions WHERE code = 'nav.downline_reports'
  ON CONFLICT DO NOTHING;

  -- Expenses access
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id FROM permissions WHERE code IN ('nav.expenses', 'expenses.read.own')
  ON CONFLICT DO NOTHING;

  -- Grant ALL standard permissions an active agent should have
  -- This includes all nav.* permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id
  FROM permissions
  WHERE code LIKE 'nav.%'
  ON CONFLICT DO NOTHING;

  -- Grant policy permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id
  FROM permissions
  WHERE code LIKE 'policies.%'
  ON CONFLICT DO NOTHING;

  -- Grant commission permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id
  FROM permissions
  WHERE code LIKE 'commissions.%'
  ON CONFLICT DO NOTHING;

  -- Grant expense permissions (own expenses)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id
  FROM permissions
  WHERE code IN ('expenses.read.own', 'expenses.write.own', 'expenses.update.own', 'expenses.delete.own')
  ON CONFLICT DO NOTHING;

  -- Grant target permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id
  FROM permissions
  WHERE code LIKE 'targets.%'
  ON CONFLICT DO NOTHING;

  -- Grant hierarchy permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id
  FROM permissions
  WHERE code IN ('hierarchy.read.own', 'hierarchy.read.downline')
  ON CONFLICT DO NOTHING;

  -- Grant email permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id
  FROM permissions
  WHERE code LIKE 'email.%'
  ON CONFLICT DO NOTHING;

  -- Grant analytics permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id
  FROM permissions
  WHERE code LIKE 'analytics.%'
  ON CONFLICT DO NOTHING;

  -- Grant reports permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id
  FROM permissions
  WHERE code LIKE 'reports.%'
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Permissions granted to active_agent role';
END $$;

-- Verify the fix by listing what permissions active_agent now has
SELECT
  'active_agent has ' || COUNT(*) || ' permissions' as status
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.name = 'active_agent';

-- Also update nick.neessen@gmail.com specifically to ensure they have active_agent role
UPDATE user_profiles
SET
  roles = ARRAY['active_agent']::text[],
  agent_status = 'licensed',
  approval_status = 'approved',
  contract_level = 100,
  onboarding_status = NULL,
  current_onboarding_phase = NULL
WHERE email = 'nick.neessen@gmail.com';

-- Create a function to easily grant all permissions to active agents
CREATE OR REPLACE FUNCTION grant_active_agent_permissions()
RETURNS void AS $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'active_agent';

  -- Grant all non-admin permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id
  FROM permissions
  WHERE code NOT LIKE 'admin.%'
    AND code NOT LIKE 'system.%'
    AND code NOT IN ('nav.user_management', 'users.delete.all')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Run the function to ensure active_agent has permissions
SELECT grant_active_agent_permissions();