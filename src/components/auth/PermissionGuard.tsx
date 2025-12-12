import React from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {usePermissionCheck} from '@/hooks/permissions/usePermissions';
import type {PermissionCode} from '@/types/permissions.types';
import {PermissionDenied} from '@/features/auth';

interface PermissionGuardProps {
  children: React.ReactNode;
  /** Single permission code required */
  permission?: PermissionCode;
  /** Multiple permission codes */
  permissions?: PermissionCode[];
  /** If true, require ALL permissions. If false (default), require ANY */
  requireAll?: boolean;
  /** Optional: Also require specific email (for super-admin pages) */
  requireEmail?: string;
  /** Optional: Custom fallback component instead of PermissionDenied */
  fallback?: React.ReactNode;
}

/**
 * PermissionGuard component
 * Wraps protected routes and checks user permissions
 *
 * @example
 * ```tsx
 * // Protect a page with single permission
 * <PermissionGuard permission="nav.role_management">
 *   <RoleManagementPage />
 * </PermissionGuard>
 *
 * // Protect with multiple permissions (require any)
 * <PermissionGuard permissions={["nav.user_management", "users.manage"]}>
 *   <UserManagementPage />
 * </PermissionGuard>
 *
 * // Protect super-admin page (permission + email)
 * <PermissionGuard
 *   permission="nav.role_management"
 *   requireEmail="nick@nickneessen.com"
 * >
 *   <RoleManagementPage />
 * </PermissionGuard>
 * ```
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  requireEmail,
  fallback,
}) => {
  const { supabaseUser } = useAuth();
  const { can, canAny, canAll, isLoading } = usePermissionCheck();

  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mb-4 shadow-lg animate-pulse">
            CT
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check email requirement if specified
  if (requireEmail && supabaseUser?.email !== requireEmail) {
    return <>{fallback || <PermissionDenied />}</>;
  }

  // Check permission requirement
  let hasPermission = true;

  if (permission) {
    hasPermission = can(permission);
  } else if (permissions && permissions.length > 0) {
    hasPermission = requireAll ? canAll(permissions) : canAny(permissions);
  }

  // Show fallback if permission check fails
  if (!hasPermission) {
    return <>{fallback || <PermissionDenied />}</>;
  }

  // Allow access if all checks pass
  return <>{children}</>;
};
