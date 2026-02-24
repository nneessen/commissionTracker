// src/features/the-standard-team/hooks/useLicensingWorkspaceAccess.ts

import { useMemo } from "react";
import { useCurrentUserProfile } from "@/hooks/admin";
import { useFeatureAccess, useSubscription } from "@/hooks/subscription";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const LICENSING_WORKSPACE_TRIAL_DAYS = 7;
export const LICENSING_WORKSPACE_PAID_FEATURE = "hierarchy" as const;

export interface LicensingWorkspaceAccessResult {
  hasAccess: boolean;
  hasPaidAccess: boolean;
  hasTrialAccess: boolean;
  isLoading: boolean;
  trialDaysRemaining: number;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  requiredPlan: string;
}

/**
 * Access model for the licensing/writing workspace:
 * - paid access for Pro/Team tiers (plus existing feature-access bypasses/temp access)
 * - otherwise a 7-day free trial from approval date (fallback to created_at)
 */
export function useLicensingWorkspaceAccess(): LicensingWorkspaceAccessResult {
  const featureAccess = useFeatureAccess(LICENSING_WORKSPACE_PAID_FEATURE);
  const subscription = useSubscription();
  const currentProfileQuery = useCurrentUserProfile();

  return useMemo(() => {
    const base = {
      hasAccess: false,
      hasPaidAccess: false,
      hasTrialAccess: false,
      isLoading: false,
      trialDaysRemaining: 0,
      trialStartedAt: null,
      trialEndsAt: null,
      requiredPlan: "Pro",
    } satisfies LicensingWorkspaceAccessResult;

    if (featureAccess.isLoading || subscription.isLoading) {
      return { ...base, isLoading: true };
    }

    const normalizedPlanName =
      subscription.subscription?.plan?.name?.toLowerCase();
    const hasProOrTeamTierAccess =
      (subscription.isActive || subscription.isGrandfathered) &&
      (normalizedPlanName === "pro" || normalizedPlanName === "team");

    if (featureAccess.hasAccess || hasProOrTeamTierAccess) {
      return {
        ...base,
        hasAccess: true,
        hasPaidAccess: true,
        requiredPlan: "Pro",
      };
    }

    if (currentProfileQuery.isLoading) {
      return { ...base, isLoading: true };
    }

    const trialStartedAt =
      currentProfileQuery.data?.approved_at ??
      currentProfileQuery.data?.created_at;

    if (!trialStartedAt) {
      return base;
    }

    const trialStart = new Date(trialStartedAt);
    if (Number.isNaN(trialStart.getTime())) {
      return base;
    }

    const trialEndsAtDate = new Date(
      trialStart.getTime() + LICENSING_WORKSPACE_TRIAL_DAYS * MS_PER_DAY,
    );
    const now = new Date();
    const hasTrialAccess = now < trialEndsAtDate;

    const trialDaysRemaining = hasTrialAccess
      ? Math.max(
          1,
          Math.ceil((trialEndsAtDate.getTime() - now.getTime()) / MS_PER_DAY),
        )
      : 0;

    return {
      hasAccess: hasTrialAccess,
      hasPaidAccess: false,
      hasTrialAccess,
      isLoading: false,
      trialDaysRemaining,
      trialStartedAt,
      trialEndsAt: trialEndsAtDate.toISOString(),
      requiredPlan: "Pro",
    };
  }, [
    currentProfileQuery.data?.approved_at,
    currentProfileQuery.data?.created_at,
    currentProfileQuery.isLoading,
    featureAccess.hasAccess,
    featureAccess.isLoading,
    subscription.isActive,
    subscription.isGrandfathered,
    subscription.isLoading,
    subscription.subscription?.plan?.name,
  ]);
}
