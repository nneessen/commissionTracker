// src/services/permissions/permissionService.ts

import { supabase } from '@/services/base/supabase';
import type {
  Role,
  Permission,
  RolePermission,
  UserPermissions,
  PermissionCode,
  RoleName,
  PermissionCheckResult,
} from '@/types/permissions.types';

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

  return (data || []).map((row: { permission_code: string }) => row.permission_code);
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
 * Get permissions for a specific role
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
  // Ensure at least one role
  const finalRoles = roles.length > 0 ? roles : ['agent'];

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
 */
export async function assignPermissionToRole(
  roleId: string,
  permissionId: string
): Promise<void> {
  const { error } = await supabase
    .from('role_permissions')
    .insert({ role_id: roleId, permission_id: permissionId });

  if (error) {
    console.error('Error assigning permission to role:', error);
    throw new Error(`Failed to assign permission to role: ${error.message}`);
  }
}

/**
 * Remove permission from role (admin only)
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
    console.error('Error removing permission from role:', error);
    throw new Error(`Failed to remove permission from role: ${error.message}`);
  }
}
