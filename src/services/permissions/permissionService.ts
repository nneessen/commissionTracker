// src/services/permissions/permissionService.ts

import {supabase} from '@/services/base/supabase';
import type {Role, Permission, UserPermissions, PermissionCode, RoleName, PermissionCheckResult, PermissionWithSource} from '@/types/permissions.types';

/**
 * Permission Service
 * Interfaces with Supabase RBAC system for role and permission management
 */

// ============================================
// USER PERMISSIONS
// ============================================

/**
 * Get all permissions for a user (including inherited from role hierarchy)
 * Uses database function: get_user_permissions(user_id)
 */
export async function getUserPermissions(userId: string): Promise<PermissionCode[]> {
  const { data, error } = await supabase.rpc('get_user_permissions', {
    target_user_id: userId,
  });

  if (error) {
    console.error('Error fetching user permissions:', error);
    throw new Error(`Failed to fetch user permissions: ${error.message}`);
  }

  // RPC returns { code: string } not { permission_code: string }
  return (data || []).map((row: { code: string }) => row.code);
}

/**
 * Check if user has a specific permission
 * Uses database function: has_permission(user_id, permission_code)
 */
export async function hasPermission(
  userId: string,
  permissionCode: PermissionCode
): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_permission', {
    target_user_id: userId,
    permission_code: permissionCode,
  });

  if (error) {
    console.error('Error checking permission:', error);
    return false;
  }

  return data || false;
}

/**
 * Check if user has a specific role
 * Uses database function: has_role(user_id, role_name)
 */
export async function hasRole(userId: string, roleName: RoleName): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_role', {
    target_user_id: userId,
    role_name: roleName,
  });

  if (error) {
    console.error('Error checking role:', error);
    return false;
  }

  return data || false;
}

/**
 * Check if user is an admin
 * Uses database function: is_admin_user(user_id)
 */
export async function isAdminUser(userId?: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin_user', {
    target_user_id: userId || null,
  });

  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }

  return data || false;
}

/**
 * Get user's roles from user_profiles
 */
export async function getUserRoles(userId: string): Promise<RoleName[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('roles')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user roles:', error);
    throw new Error(`Failed to fetch user roles: ${error.message}`);
  }

  return (data?.roles || ['agent']) as RoleName[];
}

/**
 * Get complete user permissions context (roles + permissions)
 */
export async function getUserPermissionsContext(userId: string): Promise<UserPermissions> {
  const [roles, permissions] = await Promise.all([
    getUserRoles(userId),
    getUserPermissions(userId),
  ]);

  return {
    userId,
    roles,
    permissions,
  };
}

/**
 * Check if user has permission with detailed result
 */
export async function checkPermission(
  userId: string,
  permissionCode: PermissionCode
): Promise<PermissionCheckResult> {
  const hasAccess = await hasPermission(userId, permissionCode);

  return {
    hasPermission: hasAccess,
    reason: hasAccess
      ? `User has permission: ${permissionCode}`
      : `User does not have permission: ${permissionCode}`,
  };
}

/**
 * Check if user has ANY of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  permissionCodes: PermissionCode[]
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  return permissionCodes.some((code) => userPermissions.includes(code));
}

/**
 * Check if user has ALL of the specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  permissionCodes: PermissionCode[]
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  return permissionCodes.every((code) => userPermissions.includes(code));
}

// ============================================
// ROLE MANAGEMENT (ADMIN ONLY)
// ============================================

/**
 * Get all roles from database
 */
export async function getAllRoles(): Promise<Role[]> {
  const { data, error } = await supabase.from('roles').select('*').order('name');

  if (error) {
    console.error('Error fetching roles:', error);
    throw new Error(`Failed to fetch roles: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all roles with their permissions populated (for UI display)
 */
export async function getAllRolesWithPermissions(): Promise<Role[]> {
  const roles = await getAllRoles();

  const rolesWithPermissions = await Promise.all(
    roles.map(async (role) => {
      const permissions = await getRolePermissionsWithInheritance(role.id);
      return {
        ...role,
        permissions,
      };
    })
  );

  return rolesWithPermissions;
}

/**
 * Get role by name
 */
export async function getRoleByName(roleName: RoleName): Promise<Role | null> {
  const { data, error } = await supabase.from('roles').select('*').eq('name', roleName).single();

  if (error) {
    console.error('Error fetching role:', error);
    return null;
  }

  return data;
}

/**
 * Get permissions for a specific role (direct permissions only, no inheritance)
 */
export async function getRolePermissions(roleId: string): Promise<Permission[]> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select(
      `
      permission:permissions (*)
    `
    )
    .eq('role_id', roleId);

  if (error) {
    console.error('Error fetching role permissions:', error);
    throw new Error(`Failed to fetch role permissions: ${error.message}`);
  }

  return (data || []).map((row: any) => row.permission);
}

/**
 * Get all permissions for a role including inherited permissions
 * Uses database recursive CTE for efficient single-query fetching
 */
export async function getRolePermissionsWithInheritance(
  roleId: string
): Promise<PermissionWithSource[]> {
  const { data, error } = await supabase.rpc('get_role_permissions_with_inheritance', {
    p_role_id: roleId,
  });

  if (error) {
    console.error('Error fetching role permissions with inheritance:', error);
    throw new Error(`Failed to fetch role permissions: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    id: row.permission_id,
    code: row.permission_code,
    resource: row.permission_resource,
    action: row.permission_action,
    scope: row.permission_scope,
    description: row.permission_description,
    created_at: new Date().toISOString(), // Not returned by function, use placeholder
    permissionType: row.permission_type,
    inheritedFromRoleName: row.inherited_from_role_name,
  }));
}

/**
 * Assign role to user (admin only)
 */
export async function assignRoleToUser(userId: string, roleName: RoleName): Promise<void> {
  // Get current roles
  const currentRoles = await getUserRoles(userId);

  // Add new role if not already present
  if (!currentRoles.includes(roleName)) {
    const updatedRoles = [...currentRoles, roleName];

    const { error } = await supabase
      .from('user_profiles')
      .update({ roles: updatedRoles })
      .eq('id', userId);

    if (error) {
      console.error('Error assigning role:', error);
      throw new Error(`Failed to assign role: ${error.message}`);
    }
  }
}

/**
 * Remove role from user (admin only)
 */
export async function removeRoleFromUser(userId: string, roleName: RoleName): Promise<void> {
  const currentRoles = await getUserRoles(userId);
  const updatedRoles = currentRoles.filter((role) => role !== roleName);

  // Ensure user always has at least 'agent' role
  if (updatedRoles.length === 0) {
    updatedRoles.push('agent');
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({ roles: updatedRoles })
    .eq('id', userId);

  if (error) {
    console.error('Error removing role:', error);
    throw new Error(`Failed to remove role: ${error.message}`);
  }
}

/**
 * Set user roles (replaces all existing roles)
 */
export async function setUserRoles(userId: string, roles: RoleName[]): Promise<void> {
  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser();
  
  // Check if user is trying to modify their own roles
  if (user && userId === user.id) {
    // Get current roles for this user
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('roles')
      .eq('id', userId)
      .single();
      
    const currentRoles = currentUserProfile?.roles || [];
    const wasAdmin = currentRoles.includes('admin');
    const willBeAdmin = roles.includes('admin');
    
    // Prevent admin from removing their own admin role
    if (wasAdmin && !willBeAdmin) {
      // Check if there are other admins
      const { count } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .contains('roles', ['admin'])
        .neq('id', userId);
        
      if (count === 0) {
        throw new Error('Cannot remove your admin role: You are the last admin in the system. Promote another user to admin first.');
      }
      
      throw new Error('Cannot remove your own admin role. Ask another admin to change your role if needed.');
    }
  }
  
  // Check if trying to remove admin role from any user when they're the last admin
  const { data: targetUserProfile } = await supabase
    .from('user_profiles')
    .select('roles')
    .eq('id', userId)
    .single();
    
  const targetCurrentRoles = targetUserProfile?.roles || [];
  const targetWasAdmin = targetCurrentRoles.includes('admin');
  const targetWillBeAdmin = roles.includes('admin');
  
  if (targetWasAdmin && !targetWillBeAdmin) {
    // Check total admin count
    const { count } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .contains('roles', ['admin']);
      
    if (count === 1) {
      throw new Error('Cannot remove admin role: This is the last admin in the system. Promote another user to admin first.');
    }
  }
  
  // Ensure at least one role
  const finalRoles = roles.length > 0 ? roles : ['agent'];

  // Note: id IS the auth user id (no separate user_id column)
  const { error } = await supabase.from('user_profiles').update({ roles: finalRoles }).eq('id', userId);

  if (error) {
    console.error('Error setting user roles:', error);
    throw new Error(`Failed to set user roles: ${error.message}`);
  }
}

// ============================================
// PERMISSION MANAGEMENT (ADMIN ONLY)
// ============================================

/**
 * Get all permissions from database
 */
export async function getAllPermissions(): Promise<Permission[]> {
  const { data, error } = await supabase.from('permissions').select('*').order('code');

  if (error) {
    console.error('Error fetching permissions:', error);
    throw new Error(`Failed to fetch permissions: ${error.message}`);
  }

  return data || [];
}

/**
 * Get permission by code
 */
export async function getPermissionByCode(code: PermissionCode): Promise<Permission | null> {
  const { data, error } = await supabase.from('permissions').select('*').eq('code', code).single();

  if (error) {
    console.error('Error fetching permission:', error);
    return null;
  }

  return data;
}

/**
 * Assign permission to role (admin only)
 * Backend validation via database trigger prevents system role modification
 */
export async function assignPermissionToRole(
  roleId: string,
  permissionId: string
): Promise<void> {
  const { error } = await supabase
    .from('role_permissions')
    .insert({ role_id: roleId, permission_id: permissionId });

  if (error) {
    // Check if it's a system role error from our trigger
    if (error.message.includes('system role')) {
      throw new Error('Cannot modify permissions for system roles');
    }
    console.error('Error assigning permission to role:', error);
    throw new Error(`Failed to assign permission: ${error.message}`);
  }
}

/**
 * Remove permission from role (admin only)
 * Backend validation via database trigger prevents system role modification
 */
export async function removePermissionFromRole(
  roleId: string,
  permissionId: string
): Promise<void> {
  const { error } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)
    .eq('permission_id', permissionId);

  if (error) {
    // Check if it's a system role error from our trigger
    if (error.message.includes('system role')) {
      throw new Error('Cannot modify permissions for system roles');
    }
    console.error('Error removing permission from role:', error);
    throw new Error(`Failed to remove permission: ${error.message}`);
  }
}

// ============================================
// ROLE CRUD OPERATIONS (ADMIN ONLY)
// ============================================

export interface CreateRoleInput {
  name: string;
  display_name: string;
  description?: string;
  parent_role_id?: string | null;
  respects_hierarchy?: boolean;
}

export interface UpdateRoleInput {
  display_name?: string;
  description?: string;
  parent_role_id?: string | null;
  respects_hierarchy?: boolean;
}

/**
 * Create a new role (admin only)
 * System roles cannot be created via this function
 */
export async function createRole(input: CreateRoleInput): Promise<Role> {
  const { data, error } = await supabase
    .from('roles')
    .insert({
      ...input,
      is_system_role: false, // Custom roles are never system roles
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating role:', error);
    throw new Error(`Failed to create role: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing role (admin only)
 * Cannot update system roles or change the name field
 */
export async function updateRole(roleId: string, input: UpdateRoleInput): Promise<Role> {
  // First check if it's a system role
  const { data: existingRole, error: fetchError } = await supabase
    .from('roles')
    .select('is_system_role')
    .eq('id', roleId)
    .single();

  if (fetchError) {
    console.error('Error fetching role:', fetchError);
    throw new Error(`Failed to fetch role: ${fetchError.message}`);
  }

  if (existingRole.is_system_role) {
    throw new Error('Cannot modify system roles');
  }

  const { data, error } = await supabase
    .from('roles')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating role:', error);
    throw new Error(`Failed to update role: ${error.message}`);
  }

  return data;
}

/**
 * Delete a role (admin only)
 * Cannot delete system roles or roles assigned to users
 */
export async function deleteRole(roleId: string): Promise<void> {
  // First check if it's a system role
  const { data: existingRole, error: fetchError } = await supabase
    .from('roles')
    .select('is_system_role, name')
    .eq('id', roleId)
    .single();

  if (fetchError) {
    console.error('Error fetching role:', fetchError);
    throw new Error(`Failed to fetch role: ${fetchError.message}`);
  }

  if (existingRole.is_system_role) {
    throw new Error('Cannot delete system roles');
  }

  // Check if role is assigned to any users
  const { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select('id')
    .contains('roles', [existingRole.name]);

  if (usersError) {
    console.error('Error checking role usage:', usersError);
    throw new Error(`Failed to check role usage: ${usersError.message}`);
  }

  if (users && users.length > 0) {
    throw new Error(
      `Cannot delete role: ${users.length} user(s) currently have this role. Remove the role from all users first.`
    );
  }

  const { error } = await supabase.from('roles').delete().eq('id', roleId);

  if (error) {
    console.error('Error deleting role:', error);
    throw new Error(`Failed to delete role: ${error.message}`);
  }
}

// ============================================
// PERMISSION CRUD OPERATIONS (ADMIN ONLY)
// ============================================

export interface CreatePermissionInput {
  code: string;
  resource: string;
  action: string;
  scope?: string;
  description?: string;
}

export interface UpdatePermissionInput {
  resource?: string;
  action?: string;
  scope?: string;
  description?: string;
}

/**
 * Create a new permission (admin only)
 */
export async function createPermission(input: CreatePermissionInput): Promise<Permission> {
  // Validate permission code format: resource.action.scope
  if (!/^[a-z_.]+$/.test(input.code)) {
    throw new Error('Permission code must use lowercase letters, underscores, and dots only');
  }
  
  const parts = input.code.split('.');
  if (parts.length !== 3) {
    throw new Error('Permission code must follow format: resource.action.scope (e.g., policies.read.own)');
  }
  
  // Validate that resource, action, and scope match the code
  const [codeResource, codeAction, codeScope] = parts;
  if (input.resource !== codeResource) {
    throw new Error(`Resource "${input.resource}" doesn't match code resource "${codeResource}"`);
  }
  if (input.action !== codeAction) {
    throw new Error(`Action "${input.action}" doesn't match code action "${codeAction}"`);
  }
  if (input.scope !== codeScope) {
    throw new Error(`Scope "${input.scope}" doesn't match code scope "${codeScope}"`);
  }
  
  const { data, error } = await supabase.from('permissions').insert(input).select().single();

  if (error) {
    console.error('Error creating permission:', error);
    throw new Error(`Failed to create permission: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing permission (admin only)
 * Cannot update the code field (permission identifier)
 */
export async function updatePermission(
  permissionId: string,
  input: UpdatePermissionInput
): Promise<Permission> {
  const { data, error } = await supabase
    .from('permissions')
    .update(input)
    .eq('id', permissionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating permission:', error);
    throw new Error(`Failed to update permission: ${error.message}`);
  }

  return data;
}

/**
 * Delete a permission (admin only)
 * Will cascade delete from role_permissions due to foreign key constraint
 */
export async function deletePermission(permissionId: string): Promise<void> {
  const { error } = await supabase.from('permissions').delete().eq('id', permissionId);

  if (error) {
    console.error('Error deleting permission:', error);
    throw new Error(`Failed to delete permission: ${error.message}`);
  }
}
