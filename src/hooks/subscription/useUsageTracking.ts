// src/hooks/subscription/useUsageTracking.ts
// Hook for fetching usage tracking data

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscriptionService,
  type UsageStatus,
  PRICING,
} from "@/services/subscription";
import { subscriptionKeys } from "./useSubscription";

export interface UseUsageTrackingResult {
  emailUsage: UsageStatus | null;
  smsUsage: UsageStatus | null;
  isLoading: boolean;
  error: Error | null;
  isEmailWarning: boolean;
  isEmailOverLimit: boolean;
  isSmsEnabled: boolean;
  refetch: () => void;
}

/**
 * Hook to fetch usage tracking for the current user
 */
export function useUsageTracking(): UseUsageTrackingResult {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    data: emailUsage,
    isLoading: emailLoading,
    error: emailError,
  } = useQuery({
    queryKey: subscriptionKeys.usage(userId || "", "emails_sent"),
    queryFn: async () => {
      if (!userId) return null;
      return subscriptionService.getUsageStatus(userId, "emails_sent");
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute - usage changes frequently
    gcTime: 5 * 60 * 1000,
  });

  const {
    data: smsUsage,
    isLoading: smsLoading,
    error: smsError,
    refetch: refetchSms,
  } = useQuery({
    queryKey: subscriptionKeys.usage(userId || "", "sms_sent"),
    queryFn: async () => {
      if (!userId) return null;
      return subscriptionService.getUsageStatus(userId, "sms_sent");
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const isEmailWarning =
    emailUsage?.limit !== undefined &&
    emailUsage.limit > 0 &&
    emailUsage.percentUsed >= PRICING.USAGE_WARNING_THRESHOLD * 100;
  const isEmailOverLimit = emailUsage?.isOverLimit || false;
  const isSmsEnabled = smsUsage?.limit === 0; // SMS is usage-based, no limit

  return {
    emailUsage: emailUsage ?? null,
    smsUsage: smsUsage ?? null,
    isLoading: emailLoading || smsLoading,
    error: (emailError || smsError) as Error | null,
    isEmailWarning,
    isEmailOverLimit,
    isSmsEnabled,
    refetch: refetchSms,
  };
}
