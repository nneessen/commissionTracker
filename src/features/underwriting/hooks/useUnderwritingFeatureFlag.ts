// src/features/underwriting/hooks/useUnderwritingFeatureFlag.ts

import { useAuth } from "@/contexts/AuthContext";
import { useUwWizardAddonAccess } from "@/hooks/admin";

/**
 * Hook to check if the underwriting wizard feature is enabled for the current user.
 * Access is granted if:
 * 1. User is a super admin (always has access), OR
 * 2. User has uw_wizard_enabled = true (manual override), OR
 * 3. User has purchased the UW Wizard add-on
 */
export function useUnderwritingFeatureFlag() {
  const { user, loading: userLoading } = useAuth();

  // Super admins always have access
  const isSuperAdmin = user?.is_super_admin === true;

  // User-level flag (manual override)
  const hasManualAccess = user?.uw_wizard_enabled === true;

  // Check for purchased add-on (only if not already granted)
  const { data: hasAddonAccess, isLoading: addonLoading } =
    useUwWizardAddonAccess(
      // Only query if user doesn't already have access through other means
      !isSuperAdmin && !hasManualAccess ? user?.id : undefined,
    );

  const isLoading =
    userLoading ||
    (!!user?.id && !isSuperAdmin && !hasManualAccess && addonLoading);
  const isEnabled = isSuperAdmin || hasManualAccess || hasAddonAccess === true;

  return {
    isEnabled,
    isLoading,
    error: null,
    canAccess: isEnabled,
    // Additional info for UI
    accessSource: isSuperAdmin
      ? "super_admin"
      : hasManualAccess
        ? "manual_grant"
        : hasAddonAccess
          ? "purchased"
          : "none",
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
