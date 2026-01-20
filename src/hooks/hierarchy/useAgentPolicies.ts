// src/hooks/hierarchy/useAgentPolicies.ts

import { useQuery } from "@tanstack/react-query";
import { hierarchyKeys } from "@/hooks/hierarchy/hierarchyKeys";
import { hierarchyService } from "@/services/hierarchy/hierarchyService";

export interface UseAgentPoliciesOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch all policies for a specific agent
 * Includes policy details, status, premium, etc.
 */
export const useAgentPolicies = (
  agentId?: string,
  options?: UseAgentPoliciesOptions,
) => {
  const { enabled = true, staleTime, gcTime } = options || {};

  return useQuery({
    queryKey: hierarchyKeys.rollup(
      agentId ?? "unknown",
      undefined,
      "agent-policies",
    ),
    queryFn: () => hierarchyService.getAgentPolicies(agentId!),
    staleTime: staleTime ?? 5 * 60 * 1000,
    gcTime: gcTime ?? 10 * 60 * 1000,
    enabled: enabled && !!agentId,
  });
};
