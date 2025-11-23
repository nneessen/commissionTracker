// src/hooks/overrides/useMyOverrideSummary.ts

import { useQuery } from '@tanstack/react-query';
import { overrideService } from '../../services/overrides/overrideService';

export interface UseMyOverrideSummaryOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch summary of override earnings for the current user
 * Returns aggregated totals by status (pending, earned, paid, chargedback)
 * Useful for displaying summary cards and KPI metrics
 *
 * @param options Optional configuration for query behavior
 * @returns TanStack Query result with override summary data
 */
export const useMyOverrideSummary = (options?: UseMyOverrideSummaryOptions) => {
  const { enabled = true, staleTime, gcTime } = options || {};

  return useQuery({
    queryKey: ['overrides', 'summary'],
    queryFn: () => overrideService.getMyOverrideSummary(),
    staleTime: staleTime ?? 3 * 60 * 1000, // 3 minutes
    gcTime: gcTime ?? 10 * 60 * 1000, // 10 minutes garbage collection
    enabled,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
