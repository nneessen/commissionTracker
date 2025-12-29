// src/hooks/hierarchy/useMyHierarchyStats.ts

import { useQuery } from "@tanstack/react-query";
import { hierarchyService } from "../../services/hierarchy/hierarchyService";

export interface UseMyHierarchyStatsOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  /** Start date for filtering metrics (ISO string) */
  startDate?: string;
  /** End date for filtering metrics (ISO string) */
  endDate?: string;
}

/**
 * Fetch summary hierarchy statistics for the current user
 * Returns aggregated metrics across entire downline (total agents, premium, commissions, etc.)
 *
 * @param options Optional configuration for query behavior and date filtering
 * @returns TanStack Query result with hierarchy stats
 */
export const useMyHierarchyStats = (options?: UseMyHierarchyStatsOptions) => {
  const {
    enabled = true,
    staleTime,
    gcTime,
    startDate,
    endDate,
  } = options || {};

  return useQuery({
    queryKey: ["hierarchy", "stats", startDate, endDate],
    queryFn: () => hierarchyService.getMyHierarchyStats(startDate, endDate),
    staleTime: staleTime ?? 5 * 60 * 1000, // 5 minutes default
    gcTime: gcTime ?? 10 * 60 * 1000, // 10 minutes garbage collection
    enabled,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
