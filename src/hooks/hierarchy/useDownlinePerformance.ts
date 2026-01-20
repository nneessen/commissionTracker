// src/hooks/hierarchy/useDownlinePerformance.ts

import { useQuery } from "@tanstack/react-query";
import { hierarchyService } from "../../services/hierarchy/hierarchyService";
import { hierarchyKeys } from "./hierarchyKeys";

export interface UseDownlinePerformanceOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch performance metrics for a specific downline agent
 * Returns comprehensive metrics including policies, premium, persistency, and commissions
 *
 * @param downlineId UUID of the downline agent to fetch performance for
 * @param options Optional configuration for query behavior
 * @returns TanStack Query result with downline performance data
 */
export const useDownlinePerformance = (
  downlineId: string,
  options?: UseDownlinePerformanceOptions,
) => {
  const { enabled = true, staleTime, gcTime } = options || {};

  return useQuery({
    queryKey: hierarchyKeys.rollup(downlineId, undefined, "performance"),
    queryFn: () => hierarchyService.getDownlinePerformance(downlineId),
    enabled: enabled && !!downlineId, // Only run if downlineId is provided
    staleTime: staleTime ?? 60_000,
    gcTime: gcTime ?? 20 * 60_000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
