// src/hooks/hierarchy/useTeamComparison.ts

import { useQuery } from "@tanstack/react-query";
import { hierarchyService } from "@/services/hierarchy/hierarchyService";
import { hierarchyKeys } from "./hierarchyKeys";

export interface UseTeamComparisonOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch comparison data for an agent vs their peers and team average
 * Includes rankings, percentiles, and performance comparisons
 */
export const useTeamComparison = (
  agentId?: string,
  options?: UseTeamComparisonOptions,
) => {
  const { enabled = true, staleTime, gcTime } = options || {};

  return useQuery({
    queryKey: hierarchyKeys.rollup(
      agentId ?? "unknown",
      undefined,
      "team-comparison",
    ),
    queryFn: () => hierarchyService.getTeamComparison(agentId!),
    staleTime: staleTime ?? 60_000,
    gcTime: gcTime ?? 20 * 60_000,
    enabled: enabled && !!agentId,
  });
};
