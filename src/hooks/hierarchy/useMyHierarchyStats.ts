// src/hooks/hierarchy/useMyHierarchyStats.ts

import { useQuery } from '@tanstack/react-query';
import { hierarchyService } from '../../services/hierarchy/hierarchyService';

export interface UseMyHierarchyStatsOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch summary hierarchy statistics for the current user
 * Returns aggregated metrics across entire downline (total agents, premium, commissions, etc.)
 *
 * @param options Optional configuration for query behavior
 * @returns TanStack Query result with hierarchy stats
 */
export const useMyHierarchyStats = (options?: UseMyHierarchyStatsOptions) => {
  const { enabled = true, staleTime, gcTime } = options || {};

  return useQuery({
    queryKey: ['hierarchy', 'stats'],
    queryFn: () => hierarchyService.getMyHierarchyStats(),
    staleTime: staleTime ?? 5 * 60 * 1000, // 5 minutes default
    gcTime: gcTime ?? 10 * 60 * 1000, // 10 minutes garbage collection
    enabled,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
