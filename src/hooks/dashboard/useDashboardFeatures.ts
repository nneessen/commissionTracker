// src/hooks/dashboard/useDashboardFeatures.ts
// Hook to determine which dashboard features are available based on subscription tier

import { useMemo } from "react";
import {
  useSubscription,
  useOwnerDownlineAccess,
  isOwnerDownlineGrantedFeature,
} from "@/hooks/subscription";
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
 *
 * Direct downlines of owners get Team-tier features
 */
export function useDashboardFeatures(): DashboardFeatures {
  const { subscription, isLoading } = useSubscription();
  const { supabaseUser } = useAuth();
  const { isDirectDownlineOfOwner, isLoading: downlineLoading } =
    useOwnerDownlineAccess();

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

    // Still loading subscription or downline data
    if (isLoading || downlineLoading) {
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

    // Helper to check feature access (subscription OR owner downline)
    const hasFeature = (feature: string): boolean => {
      // Check subscription plan
      if (
        subscription?.plan?.features?.[
          feature as keyof typeof subscription.plan.features
        ]
      ) {
        return true;
      }
      // Check owner downline access
      if (isDirectDownlineOfOwner && isOwnerDownlineGrantedFeature(feature)) {
        return true;
      }
      return false;
    };

    // Get plan name for tier display
    const planName = subscription?.plan?.name?.toLowerCase() || "free";
    const baseTier = (
      ["free", "starter", "pro", "team"].includes(planName) ? planName : "free"
    ) as "free" | "starter" | "pro" | "team";

    // If direct downline of owner, treat as team tier
    const tier = isDirectDownlineOfOwner ? "team" : baseTier;

    return {
      // Expense features require 'expenses' feature flag
      canViewExpenses: hasFeature("expenses"),
      canAddExpense: hasFeature("expenses"),

      // Report features
      canViewReports: hasFeature("reports_view"),
      canExportReports: hasFeature("reports_export"),

      // Target features
      canViewBasicTargets: hasFeature("targets_basic"),
      canViewFullTargets: hasFeature("targets_full"),

      tier,
      isLoading: false,
      isAdmin: false,
    };
  }, [
    subscription,
    isLoading,
    downlineLoading,
    isDirectDownlineOfOwner,
    supabaseUser?.email,
  ]);
}
