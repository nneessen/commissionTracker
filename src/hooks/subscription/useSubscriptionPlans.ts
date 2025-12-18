// src/hooks/subscription/useSubscriptionPlans.ts
// Hook for fetching all subscription plans

import { useQuery } from "@tanstack/react-query";
import {
  subscriptionService,
  type SubscriptionPlan,
} from "@/services/subscription";
import { subscriptionKeys } from "./useSubscription";

export interface UseSubscriptionPlansResult {
  plans: SubscriptionPlan[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch all available subscription plans
 */
export function useSubscriptionPlans(): UseSubscriptionPlansResult {
  const {
    data: plans,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: subscriptionKeys.plans(),
    queryFn: () => subscriptionService.getPlans(),
    staleTime: 30 * 60 * 1000, // 30 minutes - plans don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
  });

  return {
    plans: plans || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
