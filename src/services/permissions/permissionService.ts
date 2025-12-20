// src/services/permissions/permissionService.ts

import { supabase } from "@/services/base/supabase";
import { permissionRepository } from "./PermissionRepository";
import type {
  Role,
  Permission,
  UserPermissions,
  PermissionCode,
  RoleName,
  PermissionCheckResult,
  PermissionWithSource,
} from "@/types/permissions.types";

/**
 * Permission Service
 * Interfaces with Supabase RBAC system for role and permission management
 * Delegates database operations to PermissionRepository.
 */

// ============================================
// USER PERMISSIONS
// ============================================

/**
 * Get all permissions for a user (including inherited from role hierarchy)
 */
export async function getUserPermissions(
  userId: string,
): Promise<PermissionCode[]> {
  return permissionRepository.getUserPermissions(userId);
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
  userId: string,
  permissionCode: PermissionCode,
): Promise<boolean> {
  return permissionRepository.hasPermission(userId, permissionCode);
}

/**
 * Check if user has a specific role
 */
export async function hasRole(
  userId: string,
  roleName: RoleName,
): Promise<boolean> {
  return permissionRepository.hasRole(userId, roleName);
}

/**
 * Check if user is an admin
 */
export async function isAdminUser(userId?: string): Promise<boolean> {
  return permissionRepository.isAdminUser(userId);
}

/**
 * Get user's roles from user_profiles
 */
export async function getUserRoles(userId: string): Promise<RoleName[]> {
  return permissionRepository.getUserRoles(userId);
}

/**
 * Get complete user permissions context (roles + permissions)
 */
export async function getUserPermissionsContext(
  userId: string,
): Promise<UserPermissions> {
  const [roles, permissions] = await Promise.all([
    permissionRepository.getUserRoles(userId),
    permissionRepository.getUserPermissions(userId),
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
  permissionCode: PermissionCode,
): Promise<PermissionCheckResult> {
  const hasAccess = await permissionRepository.hasPermission(
    userId,
    permissionCode,
  );

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
  permissionCodes: PermissionCode[],
): Promise<boolean> {
  const userPermissions = await permissionRepository.getUserPermissions(userId);
  return permissionCodes.some((code) => userPermissions.includes(code));
}

/**
 * Check if user has ALL of the specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  permissionCodes: PermissionCode[],
): Promise<boolean> {
  const userPermissions = await permissionRepository.getUserPermissions(userId);
  return permissionCodes.every((code) => userPermissions.includes(code));
}

// ============================================
// ROLE MANAGEMENT (ADMIN ONLY)
// ============================================

/**
 * Get all roles from database
 */
export async function getAllRoles(): Promise<Role[]> {
  return permissionRepository.getAllRoles();
}

/**
 * Get all roles with their permissions populated (for UI display)
 */
export async function getAllRolesWithPermissions(): Promise<Role[]> {
  const roles = await permissionRepository.getAllRoles();

  const rolesWithPermissions = await Promise.all(
    roles.map(async (role) => {
      const permissions =
        await permissionRepository.getRolePermissionsWithInheritance(role.id);
      return {
        ...role,
        permissions,
      };
    }),
  );

  return rolesWithPermissions;
}

/**
 * Get role by name
 */
export async function getRoleByName(roleName: RoleName): Promise<Role | null> {
  return permissionRepository.getRoleByName(roleName);
}

/**
 * Get permissions for a specific role (direct permissions only, no inheritance)
 */
export async function getRolePermissions(
  roleId: string,
): Promise<Permission[]> {
  return permissionRepository.getRolePermissions(roleId);
}

/**
 * Get all permissions for a role including inherited permissions
 */
export async function getRolePermissionsWithInheritance(
  roleId: string,
): Promise<PermissionWithSource[]> {
  return permissionRepository.getRolePermissionsWithInheritance(roleId);
}

/**
 * Assign role to user (admin only)
 */
export async function assignRoleToUser(
  userId: string,
  roleName: RoleName,
): Promise<void> {
  const currentRoles = await permissionRepository.getUserRoles(userId);

  if (!currentRoles.includes(roleName)) {
    const updatedRoles = [...currentRoles, roleName];
    await permissionRepository.updateUserRoles(userId, updatedRoles);
  }
}

/**
 * Remove role from user (admin only)
 */
export async function removeRoleFromUser(
  userId: string,
  roleName: RoleName,
): Promise<void> {
  const currentRoles = await permissionRepository.getUserRoles(userId);
  const updatedRoles = currentRoles.filter((role) => role !== roleName);

  // Ensure user always has at least 'agent' role
  if (updatedRoles.length === 0) {
    updatedRoles.push("agent");
  }

  await permissionRepository.updateUserRoles(userId, updatedRoles);
}

/**
 * Set user roles (replaces all existing roles)
 */
export async function setUserRoles(
  userId: string,
  roles: RoleName[],
): Promise<void> {
  // Get current user ID
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user is trying to modify their own roles
  if (user && userId === user.id) {
    const currentRoles = await permissionRepository.getUserRoles(userId);
    const wasAdmin = currentRoles.includes("admin");
    const willBeAdmin = roles.includes("admin");

    // Prevent admin from removing their own admin role
    if (wasAdmin && !willBeAdmin) {
      const adminCount = await permissionRepository.countAdminUsers(userId);

      if (adminCount === 0) {
        throw new Error(
          "Cannot remove your admin role: You are the last admin in the system. Promote another user to admin first.",
        );
      }

      throw new Error(
        "Cannot remove your own admin role. Ask another admin to change your role if needed.",
      );
    }
  }

  // Check if trying to remove admin role from any user when they're the last admin
  const targetCurrentRoles = await permissionRepository.getUserRoles(userId);
  const targetWasAdmin = targetCurrentRoles.includes("admin");
  const targetWillBeAdmin = roles.includes("admin");

  if (targetWasAdmin && !targetWillBeAdmin) {
    const totalAdminCount = await permissionRepository.countAdminUsers();

    if (totalAdminCount === 1) {
      throw new Error(
        "Cannot remove admin role: This is the last admin in the system. Promote another user to admin first.",
      );
    }
  }

  // Ensure at least one role
  const finalRoles: RoleName[] = roles.length > 0 ? roles : ["agent"];

  await permissionRepository.updateUserRoles(userId, finalRoles);
}

// ============================================
// PERMISSION MANAGEMENT (ADMIN ONLY)
// ============================================

/**
 * Get all permissions from database
 */
export async function getAllPermissions(): Promise<Permission[]> {
  return permissionRepository.getAllPermissions();
}

/**
 * Get permission by code
 */
export async function getPermissionByCode(
  code: PermissionCode,
): Promise<Permission | null> {
  return permissionRepository.getPermissionByCode(code);
}

/**
 * Assign permission to role (admin only)
 */
export async function assignPermissionToRole(
  roleId: string,
  permissionId: string,
): Promise<void> {
  return permissionRepository.assignPermissionToRole(roleId, permissionId);
}

/**
 * Remove permission from role (admin only)
 */
export async function removePermissionFromRole(
  roleId: string,
  permissionId: string,
): Promise<void> {
  return permissionRepository.removePermissionFromRole(roleId, permissionId);
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
 */
export async function createRole(input: CreateRoleInput): Promise<Role> {
  return permissionRepository.createRole(input);
}

/**
 * Update an existing role (admin only)
 */
export async function updateRole(
  roleId: string,
  input: UpdateRoleInput,
): Promise<Role> {
  // First check if it's a system role
  const existingRole = await permissionRepository.getRoleById(roleId);

  if (!existingRole) {
    throw new Error("Role not found");
  }

  if (existingRole.is_system_role) {
    throw new Error("Cannot modify system roles");
  }

  return permissionRepository.updateRole(roleId, input);
}

/**
 * Delete a role (admin only)
 */
export async function deleteRole(roleId: string): Promise<void> {
  // First check if it's a system role
  const existingRole = await permissionRepository.getRoleById(roleId);

  if (!existingRole) {
    throw new Error("Role not found");
  }

  if (existingRole.is_system_role) {
    throw new Error("Cannot delete system roles");
  }

  // Check if role is assigned to any users
  const userCount = await permissionRepository.countUsersWithRole(
    existingRole.name,
  );

  if (userCount > 0) {
    throw new Error(
      `Cannot delete role: ${userCount} user(s) currently have this role. Remove the role from all users first.`,
    );
  }

  await permissionRepository.deleteRole(roleId);
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
export async function createPermission(
  input: CreatePermissionInput,
): Promise<Permission> {
  // Validate permission code format: resource.action.scope
  if (!/^[a-z_.]+$/.test(input.code)) {
    throw new Error(
      "Permission code must use lowercase letters, underscores, and dots only",
    );
  }

  const parts = input.code.split(".");
  if (parts.length !== 3) {
    throw new Error(
      "Permission code must follow format: resource.action.scope (e.g., policies.read.own)",
    );
  }

  const [codeResource, codeAction, codeScope] = parts;
  if (input.resource !== codeResource) {
    throw new Error(
      `Resource "${input.resource}" doesn't match code resource "${codeResource}"`,
    );
  }
  if (input.action !== codeAction) {
    throw new Error(
      `Action "${input.action}" doesn't match code action "${codeAction}"`,
    );
  }
  if (input.scope !== codeScope) {
    throw new Error(
      `Scope "${input.scope}" doesn't match code scope "${codeScope}"`,
    );
  }

  return permissionRepository.createPermission(input);
}

/**
 * Update an existing permission (admin only)
 */
export async function updatePermission(
  permissionId: string,
  input: UpdatePermissionInput,
): Promise<Permission> {
  return permissionRepository.updatePermission(permissionId, input);
}

/**
 * Delete a permission (admin only)
 */
export async function deletePermission(permissionId: string): Promise<void> {
  return permissionRepository.deletePermission(permissionId);
}
