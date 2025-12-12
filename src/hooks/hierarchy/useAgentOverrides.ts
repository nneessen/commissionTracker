// src/hooks/hierarchy/useAgentOverrides.ts

import {useQuery} from '@tanstack/react-query';
import {hierarchyService} from '@/services/hierarchy/hierarchyService';

export interface UseAgentOverridesOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch override commission data for a specific agent
 * Shows how much override income this agent is generating for their upline
 */
export const useAgentOverrides = (agentId?: string, options?: UseAgentOverridesOptions) => {
  const { enabled = true, staleTime, gcTime } = options || {};

  return useQuery({
    queryKey: ['agent-overrides', agentId],
    queryFn: () => hierarchyService.getAgentOverrides(agentId!),
    staleTime: staleTime ?? 5 * 60 * 1000,
    gcTime: gcTime ?? 10 * 60 * 1000,
    enabled: enabled && !!agentId,
  });
};