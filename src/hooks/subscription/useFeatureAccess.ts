// src/hooks/subscription/useFeatureAccess.ts
// Hook for checking subscription feature access

import { useMemo } from "react";
import { useSubscription } from "./useSubscription";
import { useSubscriptionPlans } from "./useSubscriptionPlans";
import { usePermissionCheck } from "@/hooks/permissions";
import type {
  SubscriptionFeatures,
  SubscriptionPlan,
} from "@/services/subscription";
import {
  useOwnerDownlineAccess,
  isOwnerDownlineGrantedFeature,
} from "./useOwnerDownlineAccess";
import { shouldGrantTemporaryAccess } from "@/lib/temporaryAccess";

// Roles that bypass subscription checks (staff roles)
// Note: trainer and contracting_manager removed - they should have limited access
// only to Training Hub, Messages, and Trainer Dashboard
const SUBSCRIPTION_BYPASS_ROLES = [] as const;

export type FeatureKey = keyof SubscriptionFeatures;

// Plan tier order for determining "minimum required plan"
// Note: Starter tier was removed - consolidated to 3-tier system
const PLAN_TIER_ORDER = ["free", "pro", "team"];

/**
 * Get the minimum required plan for a feature by checking all plans
 * and finding the lowest tier that has the feature enabled.
 */
export function getRequiredPlanForFeature(
  feature: FeatureKey,
  plans: SubscriptionPlan[],
): string {
  // Sort plans by tier order
  const sortedPlans = [...plans].sort(
    (a, b) =>
      PLAN_TIER_ORDER.indexOf(a.name.toLowerCase()) -
      PLAN_TIER_ORDER.indexOf(b.name.toLowerCase()),
  );

  // Find the first plan that has this feature enabled
  for (const plan of sortedPlans) {
    if (plan.features[feature]) {
      return plan.display_name;
    }
  }

  // If no plan has this feature, return "Team" as highest tier
  return "Team";
}

// Map features to user-friendly names (using feature registry)
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
  instagram_messaging: "Instagram Messaging",
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

  // Get all plans for dynamic required plan lookup
  const { plans } = useSubscriptionPlans();

  // Check if user is a direct downline of the owner
  const { isDirectDownlineOfOwner, isLoading: isLoadingDownlineCheck } =
    useOwnerDownlineAccess();

  // Check if user has a staff role that bypasses subscription
  const { isAnyRole, isLoading: isLoadingRoles } = usePermissionCheck();
  const hasStaffBypass = isAnyRole([...SUBSCRIPTION_BYPASS_ROLES]);

  return useMemo(() => {
    // Dynamically determine required plan from database
    const requiredPlan = plans?.length
      ? getRequiredPlanForFeature(feature, plans)
      : FEATURE_DISPLAY_NAMES[feature]; // Fallback to feature name if plans not loaded

    // While loading, assume no access (will update once loaded)
    if (isLoading || isLoadingDownlineCheck || isLoadingRoles) {
      return {
        hasAccess: false,
        isLoading: true,
        currentPlan: "Loading...",
        requiredPlan,
        upgradeRequired: false,
        featureName: FEATURE_DISPLAY_NAMES[feature],
        isGrandfathered: false,
        grandfatherDaysRemaining: 0,
      };
    }

    // Staff roles (trainer, contracting_manager) bypass subscription checks
    if (hasStaffBypass) {
      return {
        hasAccess: true,
        isLoading: false,
        currentPlan: "Staff",
        requiredPlan,
        upgradeRequired: false,
        featureName: FEATURE_DISPLAY_NAMES[feature],
        isGrandfathered: false,
        grandfatherDaysRemaining: 0,
      };
    }

    // Check if feature is enabled in the user's plan
    const features = subscription?.plan?.features;
    const hasSubscriptionAccess = features?.[feature] ?? false;

    // Direct downlines of owner get access to granted features
    // (Team-tier features, but NOT admin features)
    const hasOwnerDownlineAccess =
      isDirectDownlineOfOwner && isOwnerDownlineGrantedFeature(feature);

    // Temporary free access period (until Feb 1, 2026)
    // Grants access to all features EXCEPT recruiting
    const hasTemporaryAccess = shouldGrantTemporaryAccess(feature);

    const hasAccess =
      hasSubscriptionAccess || hasOwnerDownlineAccess || hasTemporaryAccess;

    return {
      hasAccess,
      isLoading: false,
      currentPlan: hasOwnerDownlineAccess ? "Team (via upline)" : tierName,
      requiredPlan,
      upgradeRequired: !hasAccess,
      featureName: FEATURE_DISPLAY_NAMES[feature],
      isGrandfathered,
      grandfatherDaysRemaining,
    };
  }, [
    subscription,
    isLoading,
    isLoadingDownlineCheck,
    isLoadingRoles,
    isDirectDownlineOfOwner,
    hasStaffBypass,
    feature,
    isGrandfathered,
    grandfatherDaysRemaining,
    tierName,
    plans,
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
  const { isDirectDownlineOfOwner, isLoading: isLoadingDownlineCheck } =
    useOwnerDownlineAccess();
  const { isAnyRole, isLoading: isLoadingRoles } = usePermissionCheck();
  const hasStaffBypass = isAnyRole([...SUBSCRIPTION_BYPASS_ROLES]);

  return useMemo(() => {
    if (isLoading || isLoadingDownlineCheck || isLoadingRoles) {
      return {
        hasAccess: false,
        isLoading: true,
        accessibleFeatures: [],
        lockedFeatures: features,
      };
    }

    // Staff roles bypass subscription - all features accessible
    if (hasStaffBypass) {
      return {
        hasAccess: true,
        isLoading: false,
        accessibleFeatures: features,
        lockedFeatures: [],
      };
    }

    const planFeatures = subscription?.plan?.features;

    // Check subscription access, owner downline access, and temporary access
    const accessibleFeatures = features.filter(
      (f) =>
        planFeatures?.[f] ||
        (isDirectDownlineOfOwner && isOwnerDownlineGrantedFeature(f)) ||
        shouldGrantTemporaryAccess(f),
    );
    const lockedFeatures = features.filter(
      (f) =>
        !planFeatures?.[f] &&
        !(isDirectDownlineOfOwner && isOwnerDownlineGrantedFeature(f)) &&
        !shouldGrantTemporaryAccess(f),
    );

    return {
      hasAccess: accessibleFeatures.length > 0,
      isLoading: false,
      accessibleFeatures,
      lockedFeatures,
    };
  }, [
    subscription,
    isLoading,
    isLoadingDownlineCheck,
    isLoadingRoles,
    isDirectDownlineOfOwner,
    hasStaffBypass,
    features,
  ]);
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
  const { isDirectDownlineOfOwner, isLoading: isLoadingDownlineCheck } =
    useOwnerDownlineAccess();
  const { isAnyRole, isLoading: isLoadingRoles } = usePermissionCheck();
  const hasStaffBypass = isAnyRole([...SUBSCRIPTION_BYPASS_ROLES]);

  return useMemo(() => {
    if (isLoading || isLoadingDownlineCheck || isLoadingRoles) {
      return {
        hasAccess: false,
        isLoading: true,
        missingFeatures: features,
      };
    }

    // Staff roles bypass subscription - all features accessible
    if (hasStaffBypass) {
      return {
        hasAccess: true,
        isLoading: false,
        missingFeatures: [],
      };
    }

    const planFeatures = subscription?.plan?.features;

    // Check subscription access, owner downline access, and temporary access
    const missingFeatures = features.filter(
      (f) =>
        !planFeatures?.[f] &&
        !(isDirectDownlineOfOwner && isOwnerDownlineGrantedFeature(f)) &&
        !shouldGrantTemporaryAccess(f),
    );

    return {
      hasAccess: missingFeatures.length === 0,
      isLoading: false,
      missingFeatures,
    };
  }, [
    subscription,
    isLoading,
    isLoadingDownlineCheck,
    isLoadingRoles,
    isDirectDownlineOfOwner,
    hasStaffBypass,
    features,
  ]);
}
