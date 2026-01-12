-- Migration: Role management RLS policies
-- Allow super admins full CRUD on roles, role_permissions, and permissions tables

BEGIN;

-- Enable RLS on tables if not already enabled
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ROLES TABLE POLICIES
-- ========================================

-- Keep existing read policy (everyone can read roles)
-- DROP POLICY IF EXISTS "read_roles" ON roles; -- Keep this one

-- Super admins can insert roles
DROP POLICY IF EXISTS "super_admin_insert_roles" ON roles;
CREATE POLICY "super_admin_insert_roles"
ON roles FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

-- Super admins can update roles
DROP POLICY IF EXISTS "super_admin_update_roles" ON roles;
CREATE POLICY "super_admin_update_roles"
ON roles FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Super admins can delete roles (but not system roles)
DROP POLICY IF EXISTS "super_admin_delete_roles" ON roles;
CREATE POLICY "super_admin_delete_roles"
ON roles FOR DELETE
TO authenticated
USING (is_super_admin() AND is_system_role = false);

-- ========================================
-- ROLE_PERMISSIONS TABLE POLICIES
-- ========================================

-- Keep existing read policy
-- DROP POLICY IF EXISTS "read_role_permissions" ON role_permissions; -- Keep this

-- Existing admin insert/delete policies exist - update them
DROP POLICY IF EXISTS "admin_manage_role_permissions_insert" ON role_permissions;
CREATE POLICY "admin_manage_role_permissions_insert"
ON role_permissions FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "admin_manage_role_permissions_delete" ON role_permissions;
CREATE POLICY "admin_manage_role_permissions_delete"
ON role_permissions FOR DELETE
TO authenticated
USING (is_super_admin());

-- Add update policy (was missing)
DROP POLICY IF EXISTS "admin_manage_role_permissions_update" ON role_permissions;
CREATE POLICY "admin_manage_role_permissions_update"
ON role_permissions FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ========================================
-- PERMISSIONS TABLE POLICIES
-- ========================================

-- Keep existing read policy
-- DROP POLICY IF EXISTS "read_permissions" ON permissions; -- Keep this

-- Super admins can insert permissions
DROP POLICY IF EXISTS "super_admin_insert_permissions" ON permissions;
CREATE POLICY "super_admin_insert_permissions"
ON permissions FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

-- Super admins can update permissions
DROP POLICY IF EXISTS "super_admin_update_permissions" ON permissions;
CREATE POLICY "super_admin_update_permissions"
ON permissions FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Super admins can delete permissions
DROP POLICY IF EXISTS "super_admin_delete_permissions" ON permissions;
CREATE POLICY "super_admin_delete_permissions"
ON permissions FOR DELETE
TO authenticated
USING (is_super_admin());

COMMIT;
