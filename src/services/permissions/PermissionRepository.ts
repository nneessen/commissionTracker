// src/services/permissions/PermissionRepository.ts

import { supabase } from "../base/supabase";
import { logger } from "../base/logger";
import type { PostgrestError } from "@supabase/supabase-js";
import type {
  Role,
  Permission,
  PermissionCode,
  RoleName,
  PermissionWithSource,
} from "../../types/permissions.types";

/**
 * PermissionRepository
 *
 * Data access layer for permission-related operations.
 * Wraps RPC functions and direct table access.
 *
 * Note: Does not extend BaseRepository because Permission type
 * uses string dates (matching DB format) rather than Date objects.
 */
export class PermissionRepository {
  protected readonly tableName = "permissions";

  /**
   * Handle PostgreSQL errors
   */
  protected handleError(error: PostgrestError, operation: string): Error {
    const message = `${this.tableName}.${operation} failed: ${error.message}`;
    logger.error(
      message,
      error instanceof Error ? error : String(error),
      `PermissionRepository`,
    );
    return new Error(message);
  }

  // ---------------------------------------------------------------------------
  // RPC FUNCTIONS - User Permissions
  // ---------------------------------------------------------------------------

  /**
   * Get all permissions for a user (including inherited from role hierarchy)
   * Uses database function: get_user_permissions(user_id)
   */
  async getUserPermissions(userId: string): Promise<PermissionCode[]> {
    const { data, error } = await supabase.rpc("get_user_permissions", {
      target_user_id: userId,
    });

    if (error) {
      throw this.handleError(error, "getUserPermissions");
    }

    return (data || []).map((row: { code: string }) => row.code);
  }

  /**
   * Check if user has a specific permission
   * Uses database function: has_permission(user_id, permission_code)
   */
  async hasPermission(
    userId: string,
    permissionCode: PermissionCode,
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc("has_permission", {
      target_user_id: userId,
      permission_code: permissionCode,
    });

    if (error) {
      console.error("Error checking permission:", error);
      return false;
    }

    return data || false;
  }

  /**
   * Check if user has a specific role
   * Uses database function: has_role(user_id, role_name)
   */
  async hasRole(userId: string, roleName: RoleName): Promise<boolean> {
    const { data, error } = await supabase.rpc("has_role", {
      target_user_id: userId,
      role_name: roleName,
    });

    if (error) {
      console.error("Error checking role:", error);
      return false;
    }

    return data || false;
  }

  /**
   * Check if user is an admin
   * Uses database function: is_admin_user(user_id)
   */
  async isAdminUser(userId?: string): Promise<boolean> {
    const { data, error } = await supabase.rpc("is_admin_user", {
      target_user_id: userId || null,
    });

    if (error) {
      console.error("Error checking admin status:", error);
      return false;
    }

    return data || false;
  }

  /**
   * Get all permissions for a role including inherited permissions
   * Uses database function: get_role_permissions_with_inheritance
   */
  async getRolePermissionsWithInheritance(
    roleId: string,
  ): Promise<PermissionWithSource[]> {
    const { data, error } = await supabase.rpc(
      "get_role_permissions_with_inheritance",
      { p_role_id: roleId },
    );

    if (error) {
      throw this.handleError(error, "getRolePermissionsWithInheritance");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- database function result type
    return (data || []).map((row: any) => ({
      id: row.permission_id,
      code: row.permission_code,
      resource: row.permission_resource,
      action: row.permission_action,
      scope: row.permission_scope,
      description: row.permission_description,
      created_at: new Date().toISOString(),
      permissionType: row.permission_type,
      inheritedFromRoleName: row.inherited_from_role_name,
    }));
  }

  // ---------------------------------------------------------------------------
  // USER PROFILES - Roles Access
  // ---------------------------------------------------------------------------

  /**
   * Get user's roles from user_profiles
   */
  async getUserRoles(userId: string): Promise<RoleName[]> {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("roles")
      .eq("id", userId)
      .single();

    if (error) {
      throw this.handleError(error, "getUserRoles");
    }

    return (data?.roles || ["agent"]) as RoleName[];
  }

  /**
   * Update user's roles in user_profiles
   */
  async updateUserRoles(userId: string, roles: RoleName[]): Promise<void> {
    const { error } = await supabase
      .from("user_profiles")
      .update({ roles })
      .eq("id", userId);

    if (error) {
      throw this.handleError(error, "updateUserRoles");
    }
  }

  /**
   * Count users with admin role
   */
  async countAdminUsers(excludeUserId?: string): Promise<number> {
    let query = supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .contains("roles", ["admin"]);

    if (excludeUserId) {
      query = query.neq("id", excludeUserId);
    }

    const { count, error } = await query;

    if (error) {
      throw this.handleError(error, "countAdminUsers");
    }

    return count || 0;
  }

  /**
   * Count users with a specific role
   */
  async countUsersWithRole(roleName: string): Promise<number> {
    const { count, error } = await supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .contains("roles", [roleName]);

    if (error) {
      throw this.handleError(error, "countUsersWithRole");
    }

    return count || 0;
  }

  // ---------------------------------------------------------------------------
  // ROLES TABLE
  // ---------------------------------------------------------------------------

  /**
   * Get all roles
   */
  async getAllRoles(): Promise<Role[]> {
    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .order("name");

    if (error) {
      throw this.handleError(error, "getAllRoles");
    }

    return data || [];
  }

  /**
   * Get role by name
   */
  async getRoleByName(roleName: RoleName): Promise<Role | null> {
    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .eq("name", roleName)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw this.handleError(error, "getRoleByName");
    }

    return data;
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId: string): Promise<Role | null> {
    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .eq("id", roleId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw this.handleError(error, "getRoleById");
    }

    return data;
  }

  /**
   * Create a new role
   */
  async createRole(input: {
    name: string;
    display_name: string;
    description?: string;
    parent_role_id?: string | null;
    respects_hierarchy?: boolean;
  }): Promise<Role> {
    const { data, error } = await supabase
      .from("roles")
      .insert({
        ...input,
        is_system_role: false,
      })
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "createRole");
    }

    return data;
  }

  /**
   * Update a role
   */
  async updateRole(
    roleId: string,
    input: {
      display_name?: string;
      description?: string;
      parent_role_id?: string | null;
      respects_hierarchy?: boolean;
    },
  ): Promise<Role> {
    const { data, error } = await supabase
      .from("roles")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roleId)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "updateRole");
    }

    return data;
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId: string): Promise<void> {
    const { error } = await supabase.from("roles").delete().eq("id", roleId);

    if (error) {
      throw this.handleError(error, "deleteRole");
    }
  }

  // ---------------------------------------------------------------------------
  // PERMISSIONS TABLE
  // ---------------------------------------------------------------------------

  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    const { data, error } = await supabase
      .from("permissions")
      .select("*")
      .order("code");

    if (error) {
      throw this.handleError(error, "getAllPermissions");
    }

    return data || [];
  }

  /**
   * Get permission by code
   */
  async getPermissionByCode(code: PermissionCode): Promise<Permission | null> {
    const { data, error } = await supabase
      .from("permissions")
      .select("*")
      .eq("code", code)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw this.handleError(error, "getPermissionByCode");
    }

    return data;
  }

  /**
   * Create a permission
   */
  async createPermission(input: {
    code: string;
    resource: string;
    action: string;
    scope?: string;
    description?: string;
  }): Promise<Permission> {
    const { data, error } = await supabase
      .from("permissions")
      .insert(input)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "createPermission");
    }

    return data;
  }

  /**
   * Update a permission
   */
  async updatePermission(
    permissionId: string,
    input: {
      resource?: string;
      action?: string;
      scope?: string;
      description?: string;
    },
  ): Promise<Permission> {
    const { data, error } = await supabase
      .from("permissions")
      .update(input)
      .eq("id", permissionId)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "updatePermission");
    }

    return data;
  }

  /**
   * Delete a permission
   */
  async deletePermission(permissionId: string): Promise<void> {
    const { error } = await supabase
      .from("permissions")
      .delete()
      .eq("id", permissionId);

    if (error) {
      throw this.handleError(error, "deletePermission");
    }
  }

  // ---------------------------------------------------------------------------
  // ROLE_PERMISSIONS TABLE
  // ---------------------------------------------------------------------------

  /**
   * Get direct permissions for a role (no inheritance)
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const { data, error } = await supabase
      .from("role_permissions")
      .select("permission:permissions (*)")
      .eq("role_id", roleId);

    if (error) {
      throw this.handleError(error, "getRolePermissions");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join result type
    return (data || []).map((row: any) => row.permission);
  }

  /**
   * Assign permission to role
   */
  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("role_permissions")
      .insert({ role_id: roleId, permission_id: permissionId });

    if (error) {
      if (error.message.includes("system role")) {
        throw new Error("Cannot modify permissions for system roles");
      }
      throw this.handleError(error, "assignPermissionToRole");
    }
  }

  /**
   * Remove permission from role
   */
  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .eq("permission_id", permissionId);

    if (error) {
      if (error.message.includes("system role")) {
        throw new Error("Cannot modify permissions for system roles");
      }
      throw this.handleError(error, "removePermissionFromRole");
    }
  }
}

// Singleton instance
export const permissionRepository = new PermissionRepository();
