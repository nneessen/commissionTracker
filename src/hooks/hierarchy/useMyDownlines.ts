// src/hooks/hierarchy/useMyDownlines.ts

import { useQuery } from "@tanstack/react-query";
import { hierarchyService } from "../../services/hierarchy/hierarchyService";
import { hierarchyKeys } from "./hierarchyKeys";

export interface UseMyDownlinesOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch all downline agents (flat list) for the current user
 * Returns a flat array of all agents in the downline hierarchy
 *
 * @param options Optional configuration for query behavior
 * @returns TanStack Query result with downlines array
 */
export const useMyDownlines = (options?: UseMyDownlinesOptions) => {
  const { enabled = true, staleTime, gcTime } = options || {};

  return useQuery({
    queryKey: hierarchyKeys.downline("me", undefined, "flat"),
    queryFn: () => hierarchyService.getMyDownlines(),
    staleTime: staleTime ?? 60_000, // 60 seconds default
    gcTime: gcTime ?? 20 * 60_000, // 20 minutes garbage collection
    enabled,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
