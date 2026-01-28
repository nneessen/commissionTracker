// src/hooks/subscription/useSubscriptionSettings.ts
// Hooks for subscription settings (temporary access configuration)

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  subscriptionSettingsService,
  type TemporaryAccessConfig,
  type SubscriptionSettings,
} from "@/services/subscription";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const subscriptionSettingsKeys = {
  all: ["subscription", "settings"] as const,
  temporaryAccess: () =>
    [...subscriptionSettingsKeys.all, "temporaryAccess"] as const,
};

/**
 * Hook to fetch the full subscription settings
 */
export function useSubscriptionSettings() {
  return useQuery({
    queryKey: subscriptionSettingsKeys.all,
    queryFn: () => subscriptionSettingsService.getSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch just the temporary access configuration
 * Optimized for use in useFeatureAccess where only temp access config is needed
 */
export function useTemporaryAccessConfig() {
  return useQuery({
    queryKey: subscriptionSettingsKeys.temporaryAccess(),
    queryFn: () => subscriptionSettingsService.getTemporaryAccessConfig(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to update temporary access settings (admin only)
 */
export function useUpdateTemporaryAccessSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (config: Partial<TemporaryAccessConfig>) => {
      if (!user?.id) {
        throw new Error("User must be logged in to update settings");
      }
      return subscriptionSettingsService.updateTemporaryAccessConfig(
        config,
        user.id,
      );
    },
    onSuccess: () => {
      // Invalidate all subscription settings queries
      queryClient.invalidateQueries({
        queryKey: subscriptionSettingsKeys.all,
      });
      // Also invalidate the main subscription queries so feature access updates
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast.success("Temporary access settings updated");
    },
    onError: (error: Error) => {
      console.error("Failed to update temporary access settings:", error);
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });
}

/**
 * Helper hook that provides the shouldGrantTemporaryAccess function
 * with pre-fetched config from the database
 */
export function useTemporaryAccessCheck() {
  const { data: config, isLoading } = useTemporaryAccessConfig();

  const shouldGrantTemporaryAccess = (
    feature: string,
    userEmail: string | undefined | null,
  ): boolean => {
    if (!config) return false;
    return subscriptionSettingsService.shouldGrantTemporaryAccess(
      feature,
      userEmail,
      config,
    );
  };

  const getDaysRemaining = (): number => {
    if (!config) return 0;
    return subscriptionSettingsService.getDaysRemaining(config.endDate);
  };

  return {
    config,
    isLoading,
    shouldGrantTemporaryAccess,
    getDaysRemaining,
  };
}

// Re-export types for convenience
export type { TemporaryAccessConfig, SubscriptionSettings };
