// src/hooks/hierarchy/useAllDownlinePerformance.ts

import { useQuery } from "@tanstack/react-query";
import { hierarchyService } from "../../services/hierarchy/hierarchyService";
import { hierarchyKeys } from "./hierarchyKeys";

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
export const useAllDownlinePerformance = (
  options?: UseAllDownlinePerformanceOptions,
) => {
  const { enabled = true, staleTime, gcTime } = options || {};

  return useQuery({
    queryKey: hierarchyKeys.rollup("me", undefined, "downline-performance"),
    queryFn: () => hierarchyService.getAllDownlinePerformance(),
    staleTime: staleTime ?? 60_000,
    gcTime: gcTime ?? 20 * 60_000,
    enabled,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
