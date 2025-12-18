// src/hooks/subscription/useFeatureAccess.ts
// Hook for checking subscription feature access

import { useMemo } from "react";
import { useSubscription } from "./useSubscription";
import type { SubscriptionFeatures } from "@/services/subscription/subscriptionService";

export type FeatureKey = keyof SubscriptionFeatures;

// Map features to the minimum required plan
export const FEATURE_PLAN_REQUIREMENTS: Record<FeatureKey, string> = {
  dashboard: "Free",
  policies: "Free",
  comp_guide: "Free",
  settings: "Free",
  connect_upline: "Free",
  expenses: "Starter",
  targets_basic: "Starter",
  reports_view: "Starter",
  targets_full: "Pro",
  reports_export: "Pro",
  email: "Pro",
  sms: "Team",
  hierarchy: "Team",
  recruiting: "Team",
  overrides: "Team",
  downline_reports: "Team",
};

// Map features to user-friendly names
export const FEATURE_DISPLAY_NAMES: Record<FeatureKey, string> = {
  dashboard: "Dashboard",
  policies: "Policy Management",
  comp_guide: "Compensation Guide",
  settings: "Settings",
  connect_upline: "Connect Upline",
  expenses: "Expense Tracking",
  targets_basic: "Basic Targets",
  reports_view: "Reports View",
  targets_full: "Full Targets & Goals",
  reports_export: "Export Reports",
  email: "Email Messaging",
  sms: "SMS Messaging",
  hierarchy: "Team Hierarchy",
  recruiting: "Recruiting Pipeline",
  overrides: "Override Tracking",
  downline_reports: "Downline Reports",
};

export interface UseFeatureAccessResult {
  /** Whether the user has access to the feature */
  hasAccess: boolean;
  /** Whether subscription data is still loading */
  isLoading: boolean;
  /** The user's current plan name */
  currentPlan: string;
  /** The minimum plan required for this feature */
  requiredPlan: string;
  /** Whether user needs to upgrade to access this feature */
  upgradeRequired: boolean;
  /** User-friendly feature name */
  featureName: string;
  /** Whether the user is currently grandfathered */
  isGrandfathered: boolean;
  /** Days remaining in grandfather period */
  grandfatherDaysRemaining: number;
}

/**
 * Hook to check if the current user has access to a specific feature
 * based on their subscription plan.
 *
 * @param feature - The feature key to check access for
 * @returns Feature access status and related metadata
 *
 * @example
 * const { hasAccess, requiredPlan } = useFeatureAccess("recruiting");
 * if (!hasAccess) {
 *   return <UpgradePrompt feature="recruiting" />;
 * }
 */
export function useFeatureAccess(feature: FeatureKey): UseFeatureAccessResult {
  const {
    subscription,
    isLoading,
    isGrandfathered,
    grandfatherDaysRemaining,
    tierName,
  } = useSubscription();

  return useMemo(() => {
    // While loading, assume no access (will update once loaded)
    if (isLoading) {
      return {
        hasAccess: false,
        isLoading: true,
        currentPlan: "Loading...",
        requiredPlan: FEATURE_PLAN_REQUIREMENTS[feature],
        upgradeRequired: false,
        featureName: FEATURE_DISPLAY_NAMES[feature],
        isGrandfathered: false,
        grandfatherDaysRemaining: 0,
      };
    }

    // Check if feature is enabled in the user's plan
    const features = subscription?.plan?.features;
    const hasAccess = features?.[feature] ?? false;

    return {
      hasAccess,
      isLoading: false,
      currentPlan: tierName,
      requiredPlan: FEATURE_PLAN_REQUIREMENTS[feature],
      upgradeRequired: !hasAccess,
      featureName: FEATURE_DISPLAY_NAMES[feature],
      isGrandfathered,
      grandfatherDaysRemaining,
    };
  }, [
    subscription,
    isLoading,
    feature,
    isGrandfathered,
    grandfatherDaysRemaining,
    tierName,
  ]);
}

/**
 * Hook to check multiple features at once.
 * Returns true if user has access to ANY of the specified features.
 */
export function useAnyFeatureAccess(features: FeatureKey[]): {
  hasAccess: boolean;
  isLoading: boolean;
  accessibleFeatures: FeatureKey[];
  lockedFeatures: FeatureKey[];
} {
  const { subscription, isLoading } = useSubscription();

  return useMemo(() => {
    if (isLoading) {
      return {
        hasAccess: false,
        isLoading: true,
        accessibleFeatures: [],
        lockedFeatures: features,
      };
    }

    const planFeatures = subscription?.plan?.features;
    const accessibleFeatures = features.filter((f) => planFeatures?.[f]);
    const lockedFeatures = features.filter((f) => !planFeatures?.[f]);

    return {
      hasAccess: accessibleFeatures.length > 0,
      isLoading: false,
      accessibleFeatures,
      lockedFeatures,
    };
  }, [subscription, isLoading, features]);
}

/**
 * Hook to check ALL features at once.
 * Returns true only if user has access to ALL specified features.
 */
export function useAllFeaturesAccess(features: FeatureKey[]): {
  hasAccess: boolean;
  isLoading: boolean;
  missingFeatures: FeatureKey[];
} {
  const { subscription, isLoading } = useSubscription();

  return useMemo(() => {
    if (isLoading) {
      return {
        hasAccess: false,
        isLoading: true,
        missingFeatures: features,
      };
    }

    const planFeatures = subscription?.plan?.features;
    const missingFeatures = features.filter((f) => !planFeatures?.[f]);

    return {
      hasAccess: missingFeatures.length === 0,
      isLoading: false,
      missingFeatures,
    };
  }, [subscription, isLoading, features]);
}
