// src/hooks/hierarchy/useAllDownlinePerformance.ts

import { useQuery } from '@tanstack/react-query';
import { hierarchyService } from '../../services/hierarchy/hierarchyService';

export interface UseAllDownlinePerformanceOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch performance metrics for ALL downlines at once
 * More efficient than fetching each agent individually
 * Returns array of DownlinePerformance objects with KPIs
 *
 * @param options Optional configuration for query behavior
 * @returns TanStack Query result with downline performance array
 */
export const useAllDownlinePerformance = (options?: UseAllDownlinePerformanceOptions) => {
  const { enabled = true, staleTime, gcTime } = options || {};

  return useQuery({
    queryKey: ['hierarchy', 'downline-performance'],
    queryFn: () => hierarchyService.getAllDownlinePerformance(),
    staleTime: staleTime ?? 5 * 60 * 1000, // 5 minutes default
    gcTime: gcTime ?? 10 * 60 * 1000, // 10 minutes garbage collection
    enabled,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
