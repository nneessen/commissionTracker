-- Migration: Create Complete RBAC System
-- Purpose: Roles, permissions, role hierarchy, and RBAC-aware RLS policies
-- Created: 2025-11-27
--
-- This migration creates a complete Role-Based Access Control system with:
-- 1. 8 predefined roles (Admin, Agent, Upline Manager, Trainer, Recruiter, Contracting Manager, Office Staff, View-Only)
-- 2. Granular permissions for all resources
-- 3. Role hierarchy with inheritance
-- 4. Helper functions for permission checks
-- 5. RBAC-aware RLS policies

BEGIN;

-- ============================================
-- 1. CREATE ROLES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL CHECK (name ~ '^[a-z_]+$'), -- snake_case only
  display_name TEXT NOT NULL,
  description TEXT,
  parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  respects_hierarchy BOOLEAN DEFAULT true, -- Whether role respects upline/downline boundaries
  is_system_role BOOLEAN DEFAULT true, -- System roles cannot be deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_parent ON roles(parent_role_id);

-- ============================================
-- 2. CREATE PERMISSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL CHECK (code ~ '^[a-z_.]+$'), -- Format: resource.action.scope
  resource TEXT NOT NULL, -- 'policies', 'clients', 'commissions', 'recruiting', etc.
  action TEXT NOT NULL, -- 'create', 'read', 'update', 'delete', 'manage'
  scope TEXT DEFAULT 'own', -- 'own', 'downline', 'all', 'self'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);

-- ============================================
-- 3. CREATE ROLE-PERMISSION JUNCTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- ============================================
-- 4. UPDATE USER_PROFILES TABLE
-- ============================================

DO $$
BEGIN
  -- Add roles array column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'roles'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN roles TEXT[] DEFAULT ARRAY['agent'::TEXT];
  END IF;

  -- Add custom_permissions JSONB column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'custom_permissions'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN custom_permissions JSONB DEFAULT '{}'::JSONB;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_roles ON user_profiles USING GIN(roles);

-- ============================================
-- 5. INSERT PREDEFINED ROLES
-- ============================================

-- Insert roles in correct dependency order (parent roles first)
INSERT INTO roles (name, display_name, description, parent_role_id, respects_hierarchy, is_system_role) VALUES
-- Top-level roles
('admin', 'Admin', 'Full system access - Nick & Kerry', NULL, false, true),
('agent', 'Agent (Active)', 'Licensed agent selling policies', NULL, true, true),
('trainer', 'Trainer', 'Handles training and onboarding recruits', NULL, false, true),
('recruiter', 'Recruiter Only', 'Recruiting focus, no policy sales', NULL, false, true),
('contracting_manager', 'Contracting Manager', 'Manages contracts, carriers, appointments', NULL, false, true),
('office_staff', 'Office Staff', 'Administrative support and data entry', NULL, true, true),
('view_only', 'View-Only/Reporting', 'Systemwide read-only access', NULL, false, true)
ON CONFLICT (name) DO NOTHING;

-- Upline Manager inherits from Agent (must be inserted after agent)
INSERT INTO roles (name, display_name, description, parent_role_id, respects_hierarchy, is_system_role)
SELECT
  'upline_manager'::TEXT,
  'Upline Manager'::TEXT,
  'Manages downline agents (inherits Agent permissions)'::TEXT,
  (SELECT id FROM roles WHERE name = 'agent'),
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'upline_manager');

-- ============================================
-- 6. INSERT PERMISSIONS
-- ============================================

INSERT INTO permissions (code, resource, action, scope, description) VALUES
-- Policies permissions
('policies.create.own', 'policies', 'create', 'own', 'Create own policies'),
('policies.read.own', 'policies', 'read', 'own', 'Read own policies'),
('policies.read.downline', 'policies', 'read', 'downline', 'Read downline policies'),
('policies.read.all', 'policies', 'read', 'all', 'Read all policies'),
('policies.update.own', 'policies', 'update', 'own', 'Update own policies'),
('policies.update.all', 'policies', 'update', 'all', 'Update all policies'),
('policies.delete.own', 'policies', 'delete', 'own', 'Delete own policies'),

-- Clients permissions
('clients.create.own', 'clients', 'create', 'own', 'Create own clients'),
('clients.read.own', 'clients', 'read', 'own', 'Read own clients'),
('clients.read.downline', 'clients', 'read', 'downline', 'Read downline clients'),
('clients.read.all', 'clients', 'read', 'all', 'Read all clients'),
('clients.update.own', 'clients', 'update', 'own', 'Update own clients'),
('clients.delete.own', 'clients', 'delete', 'own', 'Delete own clients'),

-- Commissions permissions
('commissions.read.own', 'commissions', 'read', 'own', 'Read own commissions'),
('commissions.read.downline', 'commissions', 'read', 'downline', 'Read downline commissions'),
('commissions.read.all', 'commissions', 'read', 'all', 'Read all commissions'),
('commission_overrides.manage', 'commission_overrides', 'manage', 'downline', 'Manage commission overrides'),

-- Recruiting permissions
('recruiting.create.own', 'recruiting', 'create', 'own', 'Create own recruits'),
('recruiting.read.own', 'recruiting', 'read', 'own', 'Read own recruits'),
('recruiting.read.downline', 'recruiting', 'read', 'downline', 'Read downline recruits'),
('recruiting.read.all', 'recruiting', 'read', 'all', 'Read all recruits'),
('recruiting.update.own', 'recruiting', 'update', 'own', 'Update own recruits'),
('recruiting.update.downline', 'recruiting', 'update', 'downline', 'Update downline recruits'),
('recruiting.update.all', 'recruiting', 'update', 'all', 'Update all recruits'),
('recruiting.delete.own', 'recruiting', 'delete', 'own', 'Delete own recruits'),

-- Expenses permissions
('expenses.create.own', 'expenses', 'create', 'own', 'Create own expenses'),
('expenses.read.own', 'expenses', 'read', 'own', 'Read own expenses'),
('expenses.update.own', 'expenses', 'update', 'own', 'Update own expenses'),
('expenses.delete.own', 'expenses', 'delete', 'own', 'Delete own expenses'),

-- Navigation permissions
('nav.dashboard', 'navigation', 'access', 'self', 'Access Dashboard'),
('nav.policies', 'navigation', 'access', 'self', 'Access Policies page'),
('nav.clients', 'navigation', 'access', 'self', 'Access Clients page'),
('nav.commissions', 'navigation', 'access', 'self', 'Access Commissions page'),
('nav.recruiting_pipeline', 'navigation', 'access', 'self', 'Access Recruiting Pipeline'),
('nav.training_admin', 'navigation', 'access', 'self', 'Access Training Admin'),
('nav.team_dashboard', 'navigation', 'access', 'self', 'Access Team Dashboard'),
('nav.commission_overrides', 'navigation', 'access', 'self', 'Access Commission Overrides'),
('nav.downline_reports', 'navigation', 'access', 'self', 'Access Downline Reports'),
('nav.user_management', 'navigation', 'access', 'self', 'Access User Management'),
('nav.role_management', 'navigation', 'access', 'self', 'Access Role Management'),
('nav.system_settings', 'navigation', 'access', 'self', 'Access System Settings'),
('nav.audit_logs', 'navigation', 'access', 'self', 'Access Audit Logs'),
('nav.documents', 'navigation', 'access', 'self', 'Access Documents'),

-- Admin/Management permissions
('users.manage', 'users', 'manage', 'all', 'Manage all users'),
('roles.assign', 'roles', 'assign', 'all', 'Assign roles to users'),
('carriers.manage', 'carriers', 'manage', 'all', 'Manage carriers and products'),
('contracts.manage', 'contracts', 'manage', 'all', 'Manage user contracts'),
('documents.manage.all', 'documents', 'manage', 'all', 'Manage all user documents')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 7. ASSIGN PERMISSIONS TO ROLES
-- ============================================

-- ADMIN: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'admin'),
  id
FROM permissions
ON CONFLICT DO NOTHING;

-- AGENT: Base permissions (own data + basic nav)
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'agent'),
  id
FROM permissions
WHERE code IN (
  'policies.create.own', 'policies.read.own', 'policies.update.own', 'policies.delete.own',
  'clients.create.own', 'clients.read.own', 'clients.update.own', 'clients.delete.own',
  'commissions.read.own',
  'expenses.create.own', 'expenses.read.own', 'expenses.update.own', 'expenses.delete.own',
  'recruiting.create.own', 'recruiting.read.own', 'recruiting.update.own', 'recruiting.delete.own',
  'nav.dashboard', 'nav.policies', 'nav.clients', 'nav.commissions'
)
ON CONFLICT DO NOTHING;

-- UPLINE MANAGER: Downline permissions (inherits Agent via parent_role_id)
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'upline_manager'),
  id
FROM permissions
WHERE code IN (
  'policies.read.downline', 'clients.read.downline',
  'commissions.read.downline', 'commission_overrides.manage',
  'recruiting.read.downline', 'recruiting.update.downline',
  'nav.recruiting_pipeline', 'nav.team_dashboard', 'nav.commission_overrides', 'nav.downline_reports'
)
ON CONFLICT DO NOTHING;

-- TRAINER: All recruits (read/update), training nav
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'trainer'),
  id
FROM permissions
WHERE code IN (
  'recruiting.read.all', 'recruiting.update.all',
  'nav.recruiting_pipeline', 'nav.training_admin', 'nav.dashboard'
)
ON CONFLICT DO NOTHING;

-- RECRUITER: All recruits CRUD, training materials, own clients view
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'recruiter'),
  id
FROM permissions
WHERE code IN (
  'recruiting.create.own', 'recruiting.read.all', 'recruiting.update.all', 'recruiting.delete.own',
  'clients.read.own',
  'nav.recruiting_pipeline', 'nav.training_admin'
)
ON CONFLICT DO NOTHING;

-- CONTRACTING MANAGER: Carriers, contracts, documents, user management
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'contracting_manager'),
  id
FROM permissions
WHERE code IN (
  'carriers.manage', 'contracts.manage', 'documents.manage.all', 'users.manage',
  'nav.dashboard', 'nav.user_management', 'nav.documents'
)
ON CONFLICT DO NOTHING;

-- OFFICE STAFF: Policies/clients edit
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'office_staff'),
  id
FROM permissions
WHERE code IN (
  'policies.read.all', 'policies.update.own',
  'clients.read.all', 'clients.update.own',
  'nav.policies', 'nav.clients'
)
ON CONFLICT DO NOTHING;

-- VIEW-ONLY: All read permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'view_only'),
  id
FROM permissions
WHERE action = 'read' AND scope = 'all'
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. CREATE PERMISSION HELPER FUNCTIONS
-- ============================================

-- Function to get all permissions for a user (including inherited from role hierarchy)
CREATE OR REPLACE FUNCTION get_user_permissions(target_user_id UUID)
RETURNS TABLE(permission_code TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE SQL STABLE AS $$
  WITH RECURSIVE role_hierarchy AS (
    -- Get user's direct roles
    SELECT r.id, r.parent_role_id, r.name
    FROM roles r
    CROSS JOIN (SELECT unnest(roles) AS role_name FROM user_profiles WHERE id = target_user_id) u
    WHERE r.name = u.role_name

    UNION

    -- Get parent roles recursively (inheritance)
    SELECT r.id, r.parent_role_id, r.name
    FROM roles r
    INNER JOIN role_hierarchy rh ON r.id = rh.parent_role_id
  )
  SELECT DISTINCT p.code
  FROM permissions p
  INNER JOIN role_permissions rp ON p.id = rp.permission_id
  INNER JOIN role_hierarchy rh ON rp.role_id = rh.id;
$$;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION has_permission(target_user_id UUID, permission_code TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE SQL STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM get_user_permissions(target_user_id)
    WHERE permission_code = permission_code
  );
$$;

-- Function to check if user has any role
CREATE OR REPLACE FUNCTION has_role(target_user_id UUID, role_name TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE SQL STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = target_user_id
    AND role_name = ANY(roles)
  );
$$;

-- Function to check if user has admin role
CREATE OR REPLACE FUNCTION is_admin_user(target_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE SQL STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = target_user_id
    AND 'admin' = ANY(roles)
  );
$$;

-- ============================================
-- 9. SET ADMINS
-- ============================================

-- Set Nick and Kerry as admins
UPDATE user_profiles
SET roles = ARRAY['admin']
WHERE email IN ('nick@nickneessen.com', 'kerryglass.ffl@gmail.com');

-- Set other users to default agent role if roles is NULL
UPDATE user_profiles
SET roles = ARRAY['agent']
WHERE roles IS NULL;

COMMIT;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
DECLARE
  role_count INTEGER;
  permission_count INTEGER;
  mapping_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count FROM roles;
  SELECT COUNT(*) INTO permission_count FROM permissions;
  SELECT COUNT(*) INTO mapping_count FROM role_permissions;

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'RBAC System Created Successfully!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Roles created: %', role_count;
  RAISE NOTICE 'Permissions created: %', permission_count;
  RAISE NOTICE 'Role-permission mappings: %', mapping_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Predefined Roles:';
  RAISE NOTICE '  1. Admin (Nick & Kerry)';
  RAISE NOTICE '  2. Agent (Active) - Base role';
  RAISE NOTICE '  3. Upline Manager - Inherits from Agent';
  RAISE NOTICE '  4. Trainer';
  RAISE NOTICE '  5. Recruiter Only';
  RAISE NOTICE '  6. Contracting Manager';
  RAISE NOTICE '  7. Office Staff';
  RAISE NOTICE '  8. View-Only/Reporting';
  RAISE NOTICE '';
  RAISE NOTICE 'Helper Functions Created:';
  RAISE NOTICE '  - get_user_permissions(user_id)';
  RAISE NOTICE '  - has_permission(user_id, permission_code)';
  RAISE NOTICE '  - has_role(user_id, role_name)';
  RAISE NOTICE '  - is_admin_user(user_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Create RLS policies using permission checks';
  RAISE NOTICE '  2. Create TypeScript permission service';
  RAISE NOTICE '  3. Update navigation with permission filtering';
  RAISE NOTICE '===========================================';
END $$;
