// src/hooks/subscription/useUserActiveAddons.ts
// Hook for fetching the current user's active addon subscriptions

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscriptionService,
  type UserActiveAddon,
} from "@/services/subscription";
import { subscriptionKeys } from "./useSubscription";

export const userAddonKeys = {
  activeAddons: (userId: string) =>
    [...subscriptionKeys.all, "activeAddons", userId] as const,
};

export interface UseUserActiveAddonsResult {
  activeAddons: UserActiveAddon[];
  totalAddonMonthlyCost: number;
  isLoading: boolean;
}

/**
 * Hook to fetch the current user's active addon subscriptions
 * and calculate the total monthly addon cost
 */
export function useUserActiveAddons(): UseUserActiveAddonsResult {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: activeAddons, isLoading } = useQuery({
    queryKey: userAddonKeys.activeAddons(userId || ""),
    queryFn: async () => {
      if (!userId) return [];
      return subscriptionService.getUserActiveAddons(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const addons = activeAddons || [];
  const totalAddonMonthlyCost = addons.reduce(
    (sum, addon) => sum + subscriptionService.getAddonMonthlyPrice(addon),
    0,
  );

  return {
    activeAddons: addons,
    totalAddonMonthlyCost,
    isLoading,
  };
}
