// src/components/permissions/PermissionGate.tsx

import React from 'react';
import { usePermissionCheck } from '@/hooks/permissions/usePermissions';
import type { PermissionCode, RoleName } from '@/types/permissions.types';

interface PermissionGateProps {
  children: React.ReactNode;

  /** Required permission code(s) */
  permission?: PermissionCode | PermissionCode[];

  /** Required role(s) */
  role?: RoleName | RoleName[];

  /** If true, user needs ANY of the permissions/roles. If false (default), needs ALL */
  matchAny?: boolean;

  /** What to render when user doesn't have permission */
  fallback?: React.ReactNode;

  /** Show loading state while checking permissions */
  showLoading?: boolean;
}

/**
 * PermissionGate - Conditionally render children based on user permissions/roles
 *
 * Usage:
 * ```tsx
 * // Single permission
 * <PermissionGate permission="policies.create.own">
 *   <CreatePolicyButton />
 * </PermissionGate>
 *
 * // Multiple permissions (must have ALL)
 * <PermissionGate permission={['policies.read.all', 'clients.read.all']}>
 *   <AdminPanel />
 * </PermissionGate>
 *
 * // Multiple permissions (must have ANY)
 * <PermissionGate permission={['policies.read.own', 'policies.read.downline']} matchAny>
 *   <ViewPolicies />
 * </PermissionGate>
 *
 * // Role-based
 * <PermissionGate role="admin">
 *   <AdminTools />
 * </PermissionGate>
 *
 * // Combined permission + role
 * <PermissionGate permission="recruiting.update.all" role="trainer">
 *   <UpdateRecruitButton />
 * </PermissionGate>
 *
 * // With fallback
 * <PermissionGate permission="policies.delete.own" fallback={<p>No access</p>}>
 *   <DeleteButton />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  children,
  permission,
  role,
  matchAny = false,
  fallback = null,
  showLoading = false,
}: PermissionGateProps) {
  const { can, canAny, canAll, is, isAnyRole, isLoading } = usePermissionCheck();

  // Show loading state
  if (isLoading && showLoading) {
    return <div className="text-muted-foreground text-sm">Loading permissions...</div>;
  }

  // Don't render if still loading and not showing loading state
  if (isLoading) {
    return null;
  }

  let hasAccess = true;

  // Check permissions
  if (permission) {
    const permissionArray = Array.isArray(permission) ? permission : [permission];

    if (matchAny) {
      hasAccess = hasAccess && canAny(permissionArray);
    } else {
      hasAccess = hasAccess && canAll(permissionArray);
    }
  }

  // Check roles
  if (role && hasAccess) {
    const roleArray = Array.isArray(role) ? role : [role];

    if (matchAny) {
      hasAccess = hasAccess && isAnyRole(roleArray);
    } else {
      hasAccess = hasAccess && roleArray.every((r) => is(r));
    }
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Hook version for use in component logic
 */
export function useHasAccess({
  permission,
  role,
  matchAny = false,
}: {
  permission?: PermissionCode | PermissionCode[];
  role?: RoleName | RoleName[];
  matchAny?: boolean;
}): boolean {
  const { can, canAny, canAll, is, isAnyRole, isLoading } = usePermissionCheck();

  if (isLoading) return false;

  let hasAccess = true;

  if (permission) {
    const permissionArray = Array.isArray(permission) ? permission : [permission];
    hasAccess = matchAny ? canAny(permissionArray) : canAll(permissionArray);
  }

  if (role && hasAccess) {
    const roleArray = Array.isArray(role) ? role : [role];
    hasAccess = matchAny ? isAnyRole(roleArray) : roleArray.every((r) => is(r));
  }

  return hasAccess;
}
