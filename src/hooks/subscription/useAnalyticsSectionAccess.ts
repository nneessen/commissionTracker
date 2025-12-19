// src/hooks/subscription/useAnalyticsSectionAccess.ts
// Hook for checking analytics section access based on subscription tier

import { useMemo } from "react";
import { useSubscription } from "./useSubscription";
import { useOwnerDownlineAccess } from "./useOwnerDownlineAccess";

// Analytics section identifiers that match database analytics_sections array
export type AnalyticsSectionKey =
  | "pace_metrics"
  | "policy_status_breakdown"
  | "product_matrix"
  | "carriers_products"
  | "geographic"
  | "client_segmentation"
  | "game_plan"
  | "commission_pipeline"
  | "predictive_analytics";

// Map sections to user-friendly names
export const ANALYTICS_SECTION_NAMES: Record<AnalyticsSectionKey, string> = {
  pace_metrics: "Pace Metrics",
  policy_status_breakdown: "Policy Status Breakdown",
  product_matrix: "Product Matrix",
  carriers_products: "Carriers & Products",
  geographic: "Geographic Analysis",
  client_segmentation: "Client Segmentation",
  game_plan: "Game Plan",
  commission_pipeline: "Commission Pipeline",
  predictive_analytics: "Predictive Analytics",
};

// Map sections to minimum required tier for display purposes
export const ANALYTICS_SECTION_TIERS: Record<AnalyticsSectionKey, string> = {
  pace_metrics: "Free",
  carriers_products: "Free",
  product_matrix: "Free",
  policy_status_breakdown: "Starter",
  geographic: "Starter",
  client_segmentation: "Starter",
  game_plan: "Pro",
  commission_pipeline: "Pro",
  predictive_analytics: "Pro",
};

export interface UseAnalyticsSectionAccessResult {
  /** Whether the user has access to the section */
  hasAccess: boolean;
  /** Whether subscription data is still loading */
  isLoading: boolean;
  /** The user's current plan name */
  currentPlan: string;
  /** The minimum plan required for this section */
  requiredPlan: string;
  /** User-friendly section name */
  sectionName: string;
}

/**
 * Hook to check if the current user has access to a specific analytics section
 * based on their subscription plan.
 *
 * Direct downlines of owners get access to ALL analytics sections.
 *
 * @param section - The analytics section key to check access for
 * @returns Section access status and related metadata
 *
 * @example
 * const { hasAccess, requiredPlan } = useAnalyticsSectionAccess("game_plan");
 * if (!hasAccess) {
 *   return <UpgradePrompt requiredPlan={requiredPlan} />;
 * }
 */
export function useAnalyticsSectionAccess(
  section: AnalyticsSectionKey,
): UseAnalyticsSectionAccessResult {
  const { subscription, isLoading, tierName } = useSubscription();
  const { isDirectDownlineOfOwner, isLoading: downlineLoading } =
    useOwnerDownlineAccess();

  return useMemo(() => {
    if (isLoading || downlineLoading) {
      return {
        hasAccess: false,
        isLoading: true,
        currentPlan: "Loading...",
        requiredPlan: ANALYTICS_SECTION_TIERS[section],
        sectionName: ANALYTICS_SECTION_NAMES[section],
      };
    }

    // Direct downlines of owner get access to ALL analytics sections
    if (isDirectDownlineOfOwner) {
      return {
        hasAccess: true,
        isLoading: false,
        currentPlan: "Team (via upline)",
        requiredPlan: ANALYTICS_SECTION_TIERS[section],
        sectionName: ANALYTICS_SECTION_NAMES[section],
      };
    }

    // Get analytics sections from the plan
    const analyticsSections = subscription?.plan?.analytics_sections || [];
    const hasAccess = analyticsSections.includes(section);

    return {
      hasAccess,
      isLoading: false,
      currentPlan: tierName,
      requiredPlan: ANALYTICS_SECTION_TIERS[section],
      sectionName: ANALYTICS_SECTION_NAMES[section],
    };
  }, [
    subscription,
    isLoading,
    downlineLoading,
    isDirectDownlineOfOwner,
    section,
    tierName,
  ]);
}

/**
 * Hook to get all accessible analytics sections for the current user.
 *
 * Direct downlines of owners get access to ALL analytics sections.
 *
 * @returns Object with accessible sections array and loading state
 */
export function useAccessibleAnalyticsSections(): {
  accessibleSections: AnalyticsSectionKey[];
  lockedSections: AnalyticsSectionKey[];
  isLoading: boolean;
  tierName: string;
} {
  const { subscription, isLoading, tierName } = useSubscription();
  const { isDirectDownlineOfOwner, isLoading: downlineLoading } =
    useOwnerDownlineAccess();

  return useMemo(() => {
    const allSections: AnalyticsSectionKey[] = [
      "pace_metrics",
      "policy_status_breakdown",
      "product_matrix",
      "carriers_products",
      "geographic",
      "client_segmentation",
      "game_plan",
      "commission_pipeline",
      "predictive_analytics",
    ];

    if (isLoading || downlineLoading) {
      return {
        accessibleSections: [],
        lockedSections: allSections,
        isLoading: true,
        tierName: "Loading...",
      };
    }

    // Direct downlines of owner get access to ALL analytics sections
    if (isDirectDownlineOfOwner) {
      return {
        accessibleSections: allSections,
        lockedSections: [],
        isLoading: false,
        tierName: "Team (via upline)",
      };
    }

    const analyticsSections = (subscription?.plan?.analytics_sections ||
      []) as AnalyticsSectionKey[];

    const accessibleSections = allSections.filter((s) =>
      analyticsSections.includes(s),
    );
    const lockedSections = allSections.filter(
      (s) => !analyticsSections.includes(s),
    );

    return {
      accessibleSections,
      lockedSections,
      isLoading: false,
      tierName,
    };
  }, [
    subscription,
    isLoading,
    downlineLoading,
    isDirectDownlineOfOwner,
    tierName,
  ]);
}
