// src/hooks/hierarchy/useTeamComparison.ts

import {useQuery} from '@tanstack/react-query';
import {hierarchyService} from '@/services/hierarchy/hierarchyService';

export interface UseTeamComparisonOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch comparison data for an agent vs their peers and team average
 * Includes rankings, percentiles, and performance comparisons
 */
export const useTeamComparison = (agentId?: string, options?: UseTeamComparisonOptions) => {
  const { enabled = true, staleTime, gcTime } = options || {};

  return useQuery({
    queryKey: ['team-comparison', agentId],
    queryFn: () => hierarchyService.getTeamComparison(agentId!),
    staleTime: staleTime ?? 5 * 60 * 1000,
    gcTime: gcTime ?? 10 * 60 * 1000,
    enabled: enabled && !!agentId,
  });
};