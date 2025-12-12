// src/hooks/overrides/useOverridesByDownline.ts

import {useQuery} from '@tanstack/react-query';
import {overrideService} from '../../services/overrides/overrideService';

export interface UseOverridesByDownlineOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch override commissions grouped by downline agent
 * Returns a mapping of downline_id to array of overrides
 * Useful for displaying override earnings per downline agent
 *
 * @param options Optional configuration for query behavior
 * @returns TanStack Query result with overrides grouped by downline
 */
export const useOverridesByDownline = (options?: UseOverridesByDownlineOptions) => {
  const { enabled = true, staleTime, gcTime } = options || {};

  return useQuery({
    queryKey: ['overrides', 'by-downline'],
    queryFn: () => overrideService.getOverridesByDownline(),
    staleTime: staleTime ?? 3 * 60 * 1000, // 3 minutes
    gcTime: gcTime ?? 10 * 60 * 1000, // 10 minutes garbage collection
    enabled,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
