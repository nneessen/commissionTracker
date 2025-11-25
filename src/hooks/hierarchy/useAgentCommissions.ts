// src/hooks/hierarchy/useAgentCommissions.ts

import { useQuery } from '@tanstack/react-query';
import { hierarchyService } from '@/services/hierarchy/hierarchyService';

export interface UseAgentCommissionsOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch commission data for a specific agent
 * Includes earnings, advances, chargebacks, etc.
 */
export const useAgentCommissions = (agentId?: string, options?: UseAgentCommissionsOptions) => {
  const { enabled = true, staleTime, gcTime } = options || {};

  return useQuery({
    queryKey: ['agent-commissions', agentId],
    queryFn: () => hierarchyService.getAgentCommissions(agentId!),
    staleTime: staleTime ?? 5 * 60 * 1000,
    gcTime: gcTime ?? 10 * 60 * 1000,
    enabled: enabled && !!agentId,
  });
};