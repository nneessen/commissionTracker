// /home/nneessen/projects/commissionTracker/src/components/auth/ApprovalGuard.tsx

import React, { useEffect, useState } from "react";
import { Navigate } from "@tanstack/react-router";
import { useAuthorizationStatus } from "../../hooks/admin/useUserApproval";
import { PendingApproval } from "../../features/auth/PendingApproval";
import { DeniedAccess } from "../../features/auth/DeniedAccess";
import { supabase } from "@/services/base/supabase";
import { usePermissionCheck } from "@/hooks/permissions/usePermissions";

interface ApprovalGuardProps {
  children: React.ReactNode;
}

/**
 * ApprovalGuard component
 * Wraps protected routes and checks user approval status
 * - Shows PendingApproval screen if user is pending (EXCEPT for recruits)
 * - Recruits with pending approval are routed directly to /recruiting/my-pipeline
 * - Shows DeniedAccess screen if user is denied
 * - Allows access if user is approved or is admin
 */
export const ApprovalGuard: React.FC<ApprovalGuardProps> = ({ children }) => {
  const { isApproved, isPending, isDenied, denialReason, isLoading, profile } =
    useAuthorizationStatus();

  const { is, isLoading: permissionsLoading } = usePermissionCheck();
  const isRecruit = is("recruit");
  const isActiveAgent = is("active_agent");
  const isAgent = is("agent");
  const isAdmin = is("admin");

  const [currentUserEmail, setCurrentUserEmail] = useState<string | undefined>(
    undefined,
  );
  const [authCheckLoading, setAuthCheckLoading] = useState(true);

  // Admin email - hardcoded for security
  const ADMIN_EMAIL = "nick@nickneessen.com";

  useEffect(() => {
    // Get the current auth user email directly
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserEmail(data.user.email || undefined);
      }
      setAuthCheckLoading(false);
    });
  }, []);

  // Show loading state while checking approval status, auth, or permissions
  if (isLoading || authCheckLoading || permissionsLoading) {
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

  // Admin bypass - if current user email matches admin email, always allow
  if (currentUserEmail === ADMIN_EMAIL) {
    return <>{children}</>;
  }

  // NEW: Recruit handling - recruits should only see their onboarding pipeline
  // Check if we're already on the pipeline page to avoid infinite redirect
  const currentPath = window.location.pathname;
  const isOnPipelinePage = currentPath === "/recruiting/my-pipeline";

  // Only redirect if user is ONLY a recruit and not an agent or active_agent
  // This ensures that users with active_agent or agent roles are not redirected
  if (isRecruit && !isActiveAgent && !isAgent && !isAdmin) {
    // If already on pipeline page, render children (the pipeline component)
    if (isOnPipelinePage) {
      return <>{children}</>;
    }
    // Otherwise, redirect recruits to their pipeline
    return <Navigate to="/recruiting/my-pipeline" replace />;
  }

  // Show pending approval screen (for non-recruits)
  if (isPending) {
    return <PendingApproval email={profile?.email ?? currentUserEmail} />;
  }

  // Show denied access screen
  if (isDenied) {
    return (
      <DeniedAccess
        email={profile?.email ?? currentUserEmail}
        reason={denialReason || undefined}
      />
    );
  }

  // Allow access if approved or admin
  if (isApproved) {
    return <>{children}</>;
  }

  // Fallback: show pending screen if status is unclear
  return <PendingApproval email={profile?.email ?? currentUserEmail} />;
};
