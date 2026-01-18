// src/features/underwriting/hooks/useUnderwritingFeatureFlag.ts

import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to check if the underwriting wizard feature is enabled for the current user.
 * Access is granted if:
 * 1. User is a super admin (always has access), OR
 * 2. User has uw_wizard_enabled = true (manual override), OR
 * 3. Future: User's subscription plan includes UW wizard feature
 */
export function useUnderwritingFeatureFlag() {
  const { user, loading: userLoading } = useAuth();

  // Super admins always have access
  const isSuperAdmin = user?.is_super_admin === true;

  // User-level flag (manual override or future subscription-based)
  const isEnabled = isSuperAdmin || user?.uw_wizard_enabled === true;

  return {
    isEnabled,
    isLoading: userLoading,
    error: null,
    canAccess: isEnabled,
  };
}

/**
 * Hook to check if the current user can manage underwriting settings (guides, decision trees)
 * Only IMO admins and super admins can manage these
 */
export function useCanManageUnderwriting() {
  const { user, loading: isLoading } = useAuth();

  // Check if user is IMO admin or super admin
  const isSuperAdmin = user?.is_super_admin === true;
  const isImoAdmin = user?.is_admin === true;

  return {
    canManage: isSuperAdmin || isImoAdmin,
    isLoading,
    isSuperAdmin,
    isImoAdmin,
  };
}
