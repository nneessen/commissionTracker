// src/hooks/dashboard/useDashboardFeatures.ts
// Hook to determine which dashboard features are available based on subscription tier

import { useMemo } from "react";
import { useSubscription } from "@/hooks/subscription";
import { useAuth } from "@/contexts/AuthContext";

// Admin emails that bypass all gating
const ADMIN_EMAILS = ["nick@nickneessen.com", "nickneessen@thestandardhq.com"];

export interface DashboardFeatures {
  // Expense-related features (Starter+)
  canViewExpenses: boolean;
  canAddExpense: boolean;

  // Reports features (Starter+)
  canViewReports: boolean;
  canExportReports: boolean; // Pro+

  // Target features
  canViewBasicTargets: boolean; // Starter+
  canViewFullTargets: boolean; // Pro+

  // Tier info
  tier: "free" | "starter" | "pro" | "team";
  isLoading: boolean;
  isAdmin: boolean;
}

/**
 * Hook to determine which dashboard features are available for the current user
 *
 * Feature access by tier:
 * - Free: Basic dashboard (no expenses, no reports, no targets)
 * - Starter: + expenses, reports_view, targets_basic
 * - Pro: + reports_export, targets_full
 * - Team: Same as Pro for dashboard
 */
export function useDashboardFeatures(): DashboardFeatures {
  const { subscription, isLoading } = useSubscription();
  const { supabaseUser } = useAuth();

  return useMemo(() => {
    // Check if user is admin (bypass all gating)
    const userEmail = supabaseUser?.email;
    const isAdmin = userEmail ? ADMIN_EMAILS.includes(userEmail) : false;

    // If admin, grant full access
    if (isAdmin) {
      return {
        canViewExpenses: true,
        canAddExpense: true,
        canViewReports: true,
        canExportReports: true,
        canViewBasicTargets: true,
        canViewFullTargets: true,
        tier: "team" as const,
        isLoading: false,
        isAdmin: true,
      };
    }

    // Still loading subscription data
    if (isLoading) {
      return {
        canViewExpenses: false,
        canAddExpense: false,
        canViewReports: false,
        canExportReports: false,
        canViewBasicTargets: false,
        canViewFullTargets: false,
        tier: "free" as const,
        isLoading: true,
        isAdmin: false,
      };
    }

    // Get features from subscription plan
    const features = subscription?.plan?.features;
    const planName = subscription?.plan?.name?.toLowerCase() || "free";

    // Map plan name to tier type
    const tier = (
      ["free", "starter", "pro", "team"].includes(planName) ? planName : "free"
    ) as "free" | "starter" | "pro" | "team";

    return {
      // Expense features require 'expenses' feature flag
      canViewExpenses: features?.expenses ?? false,
      canAddExpense: features?.expenses ?? false,

      // Report features
      canViewReports: features?.reports_view ?? false,
      canExportReports: features?.reports_export ?? false,

      // Target features
      canViewBasicTargets: features?.targets_basic ?? false,
      canViewFullTargets: features?.targets_full ?? false,

      tier,
      isLoading: false,
      isAdmin: false,
    };
  }, [subscription, isLoading, supabaseUser?.email]);
}
