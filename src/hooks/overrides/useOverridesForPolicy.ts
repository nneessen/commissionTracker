// src/hooks/overrides/useOverridesForPolicy.ts

import {useQuery} from '@tanstack/react-query';
import {overrideService} from '../../services/overrides/overrideService';

export interface UseOverridesForPolicyOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch all override commissions for a specific policy
 * Returns the entire upline chain of overrides earned when this policy was written
 * Useful for detailed policy commission breakdowns
 *
 * @param policyId UUID of the policy to fetch overrides for
 * @param options Optional configuration for query behavior
 * @returns TanStack Query result with override chain for the policy
 */
export const useOverridesForPolicy = (policyId: string, options?: UseOverridesForPolicyOptions) => {
  const { enabled = true, staleTime, gcTime } = options || {};

  return useQuery({
    queryKey: ['overrides', 'policy', policyId],
    queryFn: () => overrideService.getOverridesForPolicy(policyId),
    enabled: enabled && !!policyId, // Only run if policyId is provided
    staleTime: staleTime ?? 5 * 60 * 1000, // 5 minutes - policy overrides are relatively static
    gcTime: gcTime ?? 10 * 60 * 1000, // 10 minutes garbage collection
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
