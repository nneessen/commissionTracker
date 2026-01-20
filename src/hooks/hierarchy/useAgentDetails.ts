// src/hooks/hierarchy/useAgentDetails.ts

import { useQuery } from "@tanstack/react-query";
import { hierarchyKeys } from "@/hooks/hierarchy/hierarchyKeys";
import { hierarchyService } from "@/services/hierarchy/hierarchyService";

export interface UseAgentDetailsOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch comprehensive details for a specific agent
 * Includes contact info, performance metrics, activity history, etc.
 */
export const useAgentDetails = (
  agentId?: string,
  options?: UseAgentDetailsOptions,
) => {
  const { enabled = true, staleTime, gcTime } = options || {};

  return useQuery({
    queryKey: hierarchyKeys.rollup(
      agentId ?? "unknown",
      undefined,
      "agent-details",
    ),
    queryFn: () => hierarchyService.getAgentDetails(agentId!),
    staleTime: staleTime ?? 5 * 60 * 1000,
    gcTime: gcTime ?? 10 * 60 * 1000,
    enabled: enabled && !!agentId,
  });
};
