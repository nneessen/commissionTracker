// src/features/underwriting/hooks/useUWWizardUsage.ts
// Hook for tracking UW Wizard usage and quota

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/services/base/supabase";

export interface UWWizardUsage {
  runs_used: number;
  runs_limit: number;
  runs_remaining: number;
  usage_percent: number;
  billing_period_start: string;
  billing_period_end: string;
  tier_id: string;
  tier_name: string;
  source: "team_owner" | "team_seat" | "addon";
}

export const uwWizardUsageKeys = {
  all: ["uw-wizard", "usage"] as const,
  user: (userId: string) => ["uw-wizard", "usage", userId] as const,
};

/**
 * Hook to fetch the current user's UW Wizard usage statistics.
 * Returns runs used, remaining, tier info, and billing period.
 */
export function useUWWizardUsage() {
  const { user, supabaseUser } = useAuth();
  const userId = supabaseUser?.id || user?.id;

  return useQuery({
    queryKey: uwWizardUsageKeys.user(userId || ""),
    queryFn: async (): Promise<UWWizardUsage | null> => {
      if (!userId) return null;

      const { data, error } = await supabase.rpc("get_uw_wizard_usage", {
        p_user_id: userId,
      });

      if (error) {
        console.error("[useUWWizardUsage] Error fetching usage:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        // Return default values for users without usage records yet
        return {
          runs_used: 0,
          runs_limit: 100, // Default starter tier
          runs_remaining: 100,
          usage_percent: 0,
          billing_period_start: new Date().toISOString().split("T")[0],
          billing_period_end: new Date().toISOString().split("T")[0],
          tier_id: "starter",
          tier_name: "Starter",
          source: "addon",
        };
      }

      return data[0] as UWWizardUsage;
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds - refresh frequently during wizard use
    refetchOnWindowFocus: true,
  });
}

/**
 * Helper function to determine usage status for UI display
 */
export function getUsageStatus(usage: UWWizardUsage | null | undefined): {
  status: "ok" | "warning" | "critical" | "exceeded";
  color: "default" | "yellow" | "orange" | "red";
  message: string;
} {
  if (!usage) {
    return {
      status: "ok",
      color: "default",
      message: "Loading usage...",
    };
  }

  const percent = usage.usage_percent;

  if (usage.runs_remaining <= 0) {
    return {
      status: "exceeded",
      color: "red",
      message: "Monthly limit reached",
    };
  }

  if (percent >= 90) {
    return {
      status: "critical",
      color: "red",
      message: `Only ${usage.runs_remaining} runs remaining`,
    };
  }

  if (percent >= 75) {
    return {
      status: "warning",
      color: "orange",
      message: `${usage.runs_remaining} runs remaining`,
    };
  }

  return {
    status: "ok",
    color: "default",
    message: `${usage.runs_used}/${usage.runs_limit} runs used`,
  };
}

/**
 * Calculate days remaining in current billing period
 */
export function getDaysRemaining(
  usage: UWWizardUsage | null | undefined,
): number {
  if (!usage?.billing_period_end) return 0;

  const endDate = new Date(usage.billing_period_end);
  const today = new Date();
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}
