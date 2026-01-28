// src/hooks/recruiting/useRecruitingStats.ts

import { useQuery } from "@tanstack/react-query";
import { recruitingService } from "../../services/recruiting";

export interface RecruitingStats {
  total: number;
  active: number;
  completed: number;
  dropped: number;
  byPhase: Record<string, number>;
}

export interface UseRecruitingStatsOptions {
  recruiterId?: string;
  /** Include prospects in stats (for basic recruiting tier) */
  includeProspects?: boolean;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch recruiting statistics for the current user or a specific recruiter
 *
 * @param options Optional configuration for query behavior
 * @returns TanStack Query result with recruiting stats
 */
export const useRecruitingStats = (options?: UseRecruitingStatsOptions) => {
  const {
    recruiterId,
    includeProspects,
    enabled = true,
    staleTime,
    gcTime,
  } = options || {};

  return useQuery({
    queryKey: ["recruiting", "stats", recruiterId, includeProspects].filter(
      (v) => v !== undefined,
    ),
    queryFn: () =>
      recruitingService.getRecruitingStats(recruiterId, includeProspects),
    staleTime: staleTime ?? 5 * 60 * 1000, // 5 minutes default
    gcTime: gcTime ?? 10 * 60 * 1000, // 10 minutes garbage collection
    enabled,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
