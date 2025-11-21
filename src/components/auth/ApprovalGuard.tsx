// /home/nneessen/projects/commissionTracker/src/components/auth/ApprovalGuard.tsx

import React from 'react';
import { useAuthorizationStatus } from '../../hooks/admin/useUserApproval';
import { PendingApproval } from '../../features/auth/PendingApproval';
import { DeniedAccess } from '../../features/auth/DeniedAccess';

interface ApprovalGuardProps {
  children: React.ReactNode;
}

/**
 * ApprovalGuard component
 * Wraps protected routes and checks user approval status
 * - Shows PendingApproval screen if user is pending
 * - Shows DeniedAccess screen if user is denied
 * - Allows access if user is approved or is admin
 */
export const ApprovalGuard: React.FC<ApprovalGuardProps> = ({ children }) => {
  const {
    isApproved,
    isPending,
    isDenied,
    denialReason,
    isLoading,
    profile,
  } = useAuthorizationStatus();

  // Show loading state while checking approval status
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

  // Show pending approval screen
  if (isPending) {
    return <PendingApproval email={profile?.email} />;
  }

  // Show denied access screen
  if (isDenied) {
    return <DeniedAccess email={profile?.email} reason={denialReason} />;
  }

  // Allow access if approved or admin
  if (isApproved) {
    return <>{children}</>;
  }

  // Fallback: show pending screen if status is unclear
  return <PendingApproval email={profile?.email} />;
};
