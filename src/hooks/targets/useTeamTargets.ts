// src/hooks/targets/useTeamTargets.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userTargetsService } from "@/services/targets/userTargetsService";
import type { DownlineTarget, ImoTarget } from "@/types/targets.types";
import { useCallback } from "react";

/**
 * Query keys for team target queries
 */
export const teamTargetKeys = {
  all: ["targets", "team"] as const,
  downline: () => [...teamTargetKeys.all, "downline"] as const,
  imo: () => [...teamTargetKeys.all, "imo"] as const,
};

/**
 * Hook to fetch targets from downline agents
 * Returns targets for all agents below the current user in the hierarchy
 */
export function useDownlineTargets(options?: { enabled?: boolean }) {
  return useQuery<DownlineTarget[], Error>({
    queryKey: teamTargetKeys.downline(),
    queryFn: async () => {
      const result = await userTargetsService.getDownlineTargets();
      if (!result.success) {
        throw result.error || new Error("Failed to fetch downline targets");
      }
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook to fetch all targets in the user's IMO (admin only)
 * @param options.enabled - Whether to enable the query (default: true)
 * @param options.isImoAdmin - REQUIRED: Pass the result of useIsImoAdmin().data
 *                             Query will not run unless this is true
 */
export function useImoTargets(options?: {
  enabled?: boolean;
  isImoAdmin?: boolean;
}) {
  // Guard: Don't make request if user is not IMO admin
  const shouldFetch =
    options?.enabled !== false && options?.isImoAdmin === true;

  return useQuery<ImoTarget[], Error>({
    queryKey: teamTargetKeys.imo(),
    queryFn: async () => {
      const result = await userTargetsService.getImoTargets();
      if (!result.success) {
        throw result.error || new Error("Failed to fetch IMO targets");
      }
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    enabled: shouldFetch,
  });
}

/**
 * Hook to get cache invalidation functions for team target queries
 * Use when targets are updated or hierarchy changes
 */
export function useInvalidateTeamTargets() {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: teamTargetKeys.all });
  }, [queryClient]);

  const invalidateDownline = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: teamTargetKeys.downline() });
  }, [queryClient]);

  const invalidateImo = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: teamTargetKeys.imo() });
  }, [queryClient]);

  return {
    invalidateAll,
    invalidateDownline,
    invalidateImo,
  };
}
