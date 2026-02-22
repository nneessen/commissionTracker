// src/types/permissions.types.ts

/**
 * Role names matching the database roles table
 * These are the system-defined roles that determine user access levels
 */
export type RoleName =
  | "super_admin"
  | "admin"
  | "agent"
  | "recruit"
  | "upline_manager"
  | "trainer"
  | "recruiter"
  | "contracting_manager"
  | "office_staff"
  | "view_only";

/**
 * LOW-2 fix: Role name constants to avoid magic strings
 * Use these instead of hardcoded string literals
 */
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  AGENT: "agent",
  RECRUIT: "recruit",
  UPLINE_MANAGER: "upline_manager",
  TRAINER: "trainer",
  RECRUITER: "recruiter",
  CONTRACTING_MANAGER: "contracting_manager",
  OFFICE_STAFF: "office_staff",
  VIEW_ONLY: "view_only",
} as const satisfies Record<string, RoleName>;

/**
 * Permission scopes that determine the boundary of data access
 */
export type PermissionScope = "own" | "downline" | "all" | "self";

/**
 * Permission actions that can be performed on resources
 */
export type PermissionAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "manage"
  | "access";

/**
 * Resources that permissions apply to
 */
export type PermissionResource =
  | "policies"
  | "clients"
  | "commissions"
  | "commission_overrides"
  | "recruiting"
  | "expenses"
  | "navigation"
  | "users"
  | "roles"
  | "carriers"
  | "contracts"
  | "documents";

/**
 * Full permission code format: resource.action.scope
 * Examples:
 * - policies.read.own
 * - clients.create.own
 * - recruiting.read.all
 * - nav.dashboard
 */
export type PermissionCode = string;

/**
 * Database role entity
 */
export interface Role {
  id: string;
  name: RoleName;
  display_name: string;
  description: string | null;
  parent_role_id: string | null;
  respects_hierarchy: boolean;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
  permissions?: PermissionWithSource[]; // Optional - populated when needed for UI
}

/**
 * Role with permissions populated (for UI display)
 */
export interface RoleWithPermissions extends Role {
  permissions: PermissionWithSource[];
}

/**
 * Database permission entity
 */
export interface Permission {
  id: string;
  code: PermissionCode;
  resource: PermissionResource;
  action: PermissionAction;
  scope: PermissionScope;
  description: string | null;
  is_system_permission?: boolean; // Optional - system permissions cannot be modified
  created_at: string;
}

/**
 * Role-Permission mapping
 */
export interface RolePermission {
  role_id: string;
  permission_id: string;
  created_at: string;
}

/**
 * User roles and permissions context
 * This is what the frontend uses to check access
 */
export interface UserPermissions {
  userId: string;
  roles: RoleName[];
  permissions: PermissionCode[];
  customPermissions?: Record<string, boolean>;
}

/**
 * Navigation item permission requirements
 */
export interface NavPermission {
  path: string;
  requiredPermission: PermissionCode;
  requiredRoles?: RoleName[];
  matchAny?: boolean; // If true, user needs ANY of the permissions/roles. If false, needs ALL
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  hasPermission: boolean;
  reason?: string; // Why permission was granted or denied
}

/**
 * Role display info for UI
 */
export interface RoleDisplayInfo {
  name: RoleName;
  displayName: string;
  description: string;
  color?: string;
  icon?: string;
}

/**
 * Permission categories for organization in UI
 */
export type PermissionCategory =
  | "policies"
  | "clients"
  | "commissions"
  | "recruiting"
  | "expenses"
  | "navigation"
  | "admin";

/**
 * Grouped permissions for display in role management UI
 */
export interface PermissionGroup {
  category: PermissionCategory;
  label: string;
  permissions: Permission[];
}

/**
 * Permission with source information (direct vs inherited)
 * Used for role management UI to show where permissions come from
 */
export interface PermissionWithSource extends Permission {
  permissionType: "direct" | "inherited";
  inheritedFromRoleName?: string;
}
