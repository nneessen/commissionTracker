// src/components/auth/RouteGuard.tsx

import React from "react";
import { Navigate } from "@tanstack/react-router";
import { useAuthorizationStatus } from "@/hooks/admin/useUserApproval";
import { usePermissionCheck } from "@/hooks/permissions/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { PendingApproval } from "@/features/auth/PendingApproval";
import { PermissionDenied } from "@/features/auth";
import type { PermissionCode } from "@/types/permissions.types";

interface RouteGuardProps {
  children: React.ReactNode;
  /** Required permission to access this route */
  permission?: PermissionCode;
  /** Multiple permissions (require any by default) */
  permissions?: PermissionCode[];
  /** If true, require ALL permissions */
  requireAll?: boolean;
  /** If true, allow pending users to access (for settings page) */
  allowPending?: boolean;
  /** If true, only recruits can access this route */
  recruitOnly?: boolean;
  /** If true, recruits are NOT allowed (redirects to pipeline) */
  noRecruits?: boolean;
  /** Required email for super-admin routes */
  requireEmail?: string;
  /** Custom fallback component */
  fallback?: React.ReactNode;
}

/**
 * RouteGuard component - unified route protection
 *
 * Combines approval status, permissions, and role checks:
 * - Blocks pending users (unless allowPending is true)
 * - Blocks/redirects recruits (unless recruitOnly or explicitly allowed)
 * - Checks permissions
 *
 * @example
 * ```tsx
 * // Standard protected route (blocks pending and recruits)
 * <RouteGuard permission="nav.dashboard" noRecruits>
 *   <DashboardPage />
 * </RouteGuard>
 *
 * // Settings page (allow pending users)
 * <RouteGuard allowPending>
 *   <SettingsPage />
 * </RouteGuard>
 *
 * // Recruit-only route
 * <RouteGuard recruitOnly allowPending>
 *   <MyRecruitingPipeline />
 * </RouteGuard>
 * ```
 */
export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  allowPending = false,
  recruitOnly = false,
  noRecruits = false,
  requireEmail,
  fallback,
}) => {
  const { supabaseUser } = useAuth();
  const {
    isApproved,
    isPending,
    isDenied,
    profile,
    isLoading: authLoading,
  } = useAuthorizationStatus();
  const {
    can,
    canAny,
    canAll,
    is,
    isLoading: permLoading,
  } = usePermissionCheck();

  // Admin email - hardcoded for security
  const ADMIN_EMAIL = "nick@nickneessen.com";

  // Show loading state while checking
  if (authLoading || permLoading) {
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

  // Admin bypass - always allow admin email
  const currentEmail = supabaseUser?.email;
  if (currentEmail === ADMIN_EMAIL) {
    return <>{children}</>;
  }

  // Check email requirement for super-admin routes
  if (requireEmail && currentEmail !== requireEmail) {
    return <>{fallback || <PermissionDenied />}</>;
  }

  // Role checks
  const isRecruit = is("recruit");
  const isAgent = is("agent");
  const isActiveAgent = is("active_agent");
  const isAdmin = is("admin");

  // Determine if user is ONLY a recruit (not also an agent)
  const isRecruitOnly = isRecruit && !isAgent && !isActiveAgent && !isAdmin;

  // Check recruitOnly routes - only recruits can access
  if (recruitOnly && !isRecruitOnly) {
    // Non-recruits trying to access recruit-only route
    return <>{fallback || <PermissionDenied />}</>;
  }

  // Check noRecruits routes - recruits are NOT allowed
  if (noRecruits && isRecruitOnly) {
    // Redirect recruits to their pipeline
    return <Navigate to="/recruiting/my-pipeline" replace />;
  }

  // Check approval status (unless allowPending is true)
  if (!allowPending) {
    if (isDenied) {
      return <Navigate to="/auth/denied" replace />;
    }

    if (isPending) {
      return <PendingApproval email={profile?.email ?? currentEmail} />;
    }
  }

  // Check permission requirements
  let hasPermission = true;
  if (permission) {
    hasPermission = can(permission);
  } else if (permissions && permissions.length > 0) {
    hasPermission = requireAll ? canAll(permissions) : canAny(permissions);
  }

  // Show permission denied if check fails (and not approved)
  if (!hasPermission && !isApproved) {
    return <>{fallback || <PermissionDenied />}</>;
  }

  // All checks passed - render children
  return <>{children}</>;
};

export default RouteGuard;
