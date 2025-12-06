-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251206_CRITICAL_fix_permissions_and_security.sql
-- CRITICAL FIX: Permissions and Security Issues
-- Priority: P0 - Must run immediately

-- ============================================
-- PART 1: Fix Missing Permissions
-- ============================================

-- Ensure all navigation permissions exist
INSERT INTO permissions (id, code, resource, action, scope, description)
VALUES
  (gen_random_uuid(), 'nav.dashboard', 'navigation', 'access', 'own', 'Access dashboard'),
  (gen_random_uuid(), 'nav.analytics', 'navigation', 'access', 'own', 'Access analytics'),
  (gen_random_uuid(), 'nav.targets', 'navigation', 'access', 'own', 'Access targets'),
  (gen_random_uuid(), 'nav.policies', 'navigation', 'access', 'own', 'Access policies'),
  (gen_random_uuid(), 'nav.team_dashboard', 'navigation', 'access', 'downline', 'Access team dashboard'),
  (gen_random_uuid(), 'nav.recruiting_pipeline', 'navigation', 'access', 'all', 'Access recruiting pipeline'),
  (gen_random_uuid(), 'nav.downline_reports', 'navigation', 'access', 'downline', 'Access reports'),
  (gen_random_uuid(), 'nav.expenses', 'navigation', 'access', 'own', 'Access expenses'),
  (gen_random_uuid(), 'nav.user_management', 'navigation', 'access', 'all', 'Access user management (admin)'),
  (gen_random_uuid(), 'expenses.read.own', 'expenses', 'read', 'own', 'Read own expenses'),
  (gen_random_uuid(), 'expenses.write.own', 'expenses', 'create', 'own', 'Create own expenses'),
  (gen_random_uuid(), 'expenses.update.own', 'expenses', 'update', 'own', 'Update own expenses'),
  (gen_random_uuid(), 'expenses.delete.own', 'expenses', 'delete', 'own', 'Delete own expenses')
ON CONFLICT (code) DO NOTHING;

-- Ensure policy permissions exist
INSERT INTO permissions (id, code, resource, action, scope, description)
SELECT
  gen_random_uuid(),
  'policies.' || action || '.' || scope,
  'policies',
  action,
  scope,
  'Policy permission: ' || action || ' ' || scope
FROM
  (VALUES ('read'), ('create'), ('update'), ('delete')) AS actions(action),
  (VALUES ('own'), ('downline'), ('all')) AS scopes(scope)
ON CONFLICT (code) DO NOTHING;

-- Ensure commission permissions exist
INSERT INTO permissions (id, code, resource, action, scope, description)
SELECT
  gen_random_uuid(),
  'commissions.' || action || '.' || scope,
  'commissions',
  action,
  scope,
  'Commission permission: ' || action || ' ' || scope
FROM
  (VALUES ('read'), ('create'), ('update'), ('delete')) AS actions(action),
  (VALUES ('own'), ('downline'), ('all')) AS scopes(scope)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- PART 2: Fix active_agent Role Permissions
-- ============================================

DO $$
DECLARE
  v_role_id uuid;
  v_admin_role_id uuid;
  v_agent_role_id uuid;
  v_recruit_role_id uuid;
BEGIN
  -- Ensure roles exist with proper configuration
  INSERT INTO roles (id, name, display_name, description, is_system_role)
  VALUES
    (gen_random_uuid(), 'active_agent', 'Active Agent', 'Licensed agent with contract level >= 50', true),
    (gen_random_uuid(), 'agent', 'Agent', 'Licensed agent with contract level < 50', true),
    (gen_random_uuid(), 'recruit', 'Recruit', 'Unlicensed recruit in training', true),
    (gen_random_uuid(), 'admin', 'Administrator', 'System administrator', true)
  ON CONFLICT (name) DO UPDATE
  SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

  -- Get role IDs
  SELECT id INTO v_role_id FROM roles WHERE name = 'active_agent';
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'admin';
  SELECT id INTO v_agent_role_id FROM roles WHERE name = 'agent';
  SELECT id INTO v_recruit_role_id FROM roles WHERE name = 'recruit';

  -- Clear and rebuild active_agent permissions
  DELETE FROM role_permissions WHERE role_id = v_role_id;

  -- Grant all non-admin permissions to active_agent
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, id
  FROM permissions
  WHERE code NOT LIKE 'admin.%'
    AND code NOT LIKE 'system.%'
    AND code != 'nav.user_management'
    AND code NOT LIKE '%.delete.all'
  ON CONFLICT DO NOTHING;

  -- Grant standard agent permissions
  DELETE FROM role_permissions WHERE role_id = v_agent_role_id;

  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_agent_role_id, id
  FROM permissions
  WHERE code IN (
    'nav.dashboard',
    'nav.policies',
    'nav.expenses',
    'policies.read.own',
    'policies.create.own',
    'policies.update.own',
    'commissions.read.own',
    'expenses.read.own',
    'expenses.create.own',
    'expenses.update.own'
  )
  ON CONFLICT DO NOTHING;

  -- Grant minimal permissions to recruits
  DELETE FROM role_permissions WHERE role_id = v_recruit_role_id;

  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_recruit_role_id, id
  FROM permissions
  WHERE code IN (
    'nav.dashboard',
    'policies.read.own'
  )
  ON CONFLICT DO NOTHING;

  -- Admin gets everything
  DELETE FROM role_permissions WHERE role_id = v_admin_role_id;

  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_admin_role_id, id
  FROM permissions
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Permissions rebuilt for all roles';
END $$;

-- ============================================
-- PART 3: Fix Specific User Issues
-- ============================================

-- Fix Nick Neessen's account specifically
UPDATE user_profiles
SET
  roles = CASE
    WHEN email = 'nick@nickneessen.com' THEN ARRAY['admin']::text[]
    WHEN email = 'nick.neessen@gmail.com' THEN ARRAY['active_agent']::text[]
    ELSE roles
  END,
  agent_status = CASE
    WHEN email IN ('nick@nickneessen.com', 'nick.neessen@gmail.com') THEN 'licensed'
    ELSE agent_status
  END,
  approval_status = 'approved',
  is_admin = (email = 'nick@nickneessen.com'),
  is_super_admin = (email = 'nick@nickneessen.com')
WHERE email IN ('nick@nickneessen.com', 'nick.neessen@gmail.com');

-- ============================================
-- PART 4: Add Validation Constraints
-- ============================================

-- Create a function to validate roles
CREATE OR REPLACE FUNCTION validate_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure roles array only contains valid role names
  IF NEW.roles IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM unnest(NEW.roles) AS r
      WHERE r NOT IN (
        'admin', 'active_agent', 'agent', 'recruit',
        'upline_manager', 'trainer', 'recruiter',
        'contracting_manager', 'office_staff', 'view_only'
      )
    ) THEN
      RAISE EXCEPTION 'Invalid role name in roles array';
    END IF;
  END IF;

  -- Auto-set agent_status based on roles
  IF 'active_agent' = ANY(NEW.roles) OR 'agent' = ANY(NEW.roles) OR 'admin' = ANY(NEW.roles) THEN
    NEW.agent_status := 'licensed';
  ELSIF 'recruit' = ANY(NEW.roles) THEN
    NEW.agent_status := 'unlicensed';
  END IF;

  -- Ensure contract level consistency
  IF NEW.contract_level IS NOT NULL THEN
    IF NEW.contract_level >= 50 AND 'agent' = ANY(NEW.roles) THEN
      -- Upgrade to active_agent
      NEW.roles := array_replace(NEW.roles, 'agent', 'active_agent');
    ELSIF NEW.contract_level < 50 AND 'active_agent' = ANY(NEW.roles) THEN
      -- Downgrade to agent
      NEW.roles := array_replace(NEW.roles, 'active_agent', 'agent');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for role validation
DROP TRIGGER IF EXISTS validate_user_roles_trigger ON user_profiles;
CREATE TRIGGER validate_user_roles_trigger
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_roles();

-- ============================================
-- PART 5: Create Permission Audit Log
-- ============================================

CREATE TABLE IF NOT EXISTS permission_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  target_user_id uuid,
  action text NOT NULL,
  details jsonb,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

-- Create audit function
CREATE OR REPLACE FUNCTION log_permission_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO permission_audit_log (user_id, target_user_id, action, details)
  VALUES (
    auth.uid(),
    NEW.id,
    TG_OP,
    jsonb_build_object(
      'old_roles', OLD.roles,
      'new_roles', NEW.roles,
      'old_approval', OLD.approval_status,
      'new_approval', NEW.approval_status
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auditing
DROP TRIGGER IF EXISTS audit_permission_changes ON user_profiles;
CREATE TRIGGER audit_permission_changes
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  WHEN (OLD.roles IS DISTINCT FROM NEW.roles
    OR OLD.approval_status IS DISTINCT FROM NEW.approval_status
    OR OLD.is_admin IS DISTINCT FROM NEW.is_admin)
  EXECUTE FUNCTION log_permission_change();

-- ============================================
-- PART 6: Add Missing Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_roles ON user_profiles USING GIN(roles);
CREATE INDEX IF NOT EXISTS idx_user_profiles_approval ON user_profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- ============================================
-- PART 7: Create Helper Functions
-- ============================================

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id uuid,
  p_permission_code text
) RETURNS boolean AS $$
DECLARE
  v_has_permission boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM user_profiles up
    JOIN roles r ON r.name = ANY(up.roles)
    JOIN role_permissions rp ON rp.role_id = r.id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE up.user_id = p_user_id
      AND p.code = p_permission_code
  ) INTO v_has_permission;

  RETURN COALESCE(v_has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(target_user_id uuid)
RETURNS TABLE(permission_code text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.code
  FROM user_profiles up
  JOIN roles r ON r.name = ANY(up.roles)
  JOIN role_permissions rp ON rp.role_id = r.id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE up.user_id = target_user_id
  ORDER BY p.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify active_agent has permissions
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM roles r
  JOIN role_permissions rp ON r.id = rp.role_id
  WHERE r.name = 'active_agent';

  IF v_count = 0 THEN
    RAISE WARNING 'active_agent still has no permissions!';
  ELSE
    RAISE NOTICE 'active_agent now has % permissions', v_count;
  END IF;
END $$;

-- List users with invalid roles
SELECT email, roles
FROM user_profiles
WHERE roles IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM unnest(roles) AS r
    WHERE r NOT IN (
      SELECT name FROM roles
    )
  );

-- Show permission counts by role
SELECT
  r.name as role_name,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.name
ORDER BY permission_count DESC;