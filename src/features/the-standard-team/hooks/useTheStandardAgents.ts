// src/features/the-standard-team/hooks/useTheStandardAgents.ts

import { useMemo } from "react";
import { useCurrentUserProfile } from "@/hooks/admin";
import { useMyDownlines } from "@/hooks/hierarchy";

export interface TheStandardAgent {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  agency_id: string | null;
  upline_id?: string | null;
  hierarchy_depth?: number | null;
}

export type LicensingWorkspaceAgent = TheStandardAgent;

export const theStandardAgentsQueryKeys = {
  all: ["licensing-workspace-agents"] as const,
  list: () => [...theStandardAgentsQueryKeys.all, "hierarchy-scope"] as const,
};

/**
 * Returns the current agent + all approved downlines (hierarchy-scoped).
 * Kept under the original export name to avoid broad refactors.
 */
export function useTheStandardAgents(options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  const currentProfileQuery = useCurrentUserProfile();
  const downlinesQuery = useMyDownlines({
    enabled,
    staleTime: 60_000,
    gcTime: 20 * 60_000,
  });

  const currentUserId = currentProfileQuery.data?.id;

  const data = useMemo(() => {
    const byId = new Map<string, TheStandardAgent>();

    const currentProfile = currentProfileQuery.data;
    if (currentProfile) {
      byId.set(currentProfile.id, {
        id: currentProfile.id,
        first_name: currentProfile.first_name,
        last_name: currentProfile.last_name,
        email: currentProfile.email,
        agency_id: currentProfile.agency_id,
        upline_id: currentProfile.upline_id,
        hierarchy_depth: currentProfile.hierarchy_depth,
      });
    }

    for (const downline of downlinesQuery.data || []) {
      byId.set(downline.id, {
        id: downline.id,
        first_name: downline.first_name,
        last_name: downline.last_name,
        email: downline.email,
        agency_id: downline.agency_id,
        upline_id: downline.upline_id,
        hierarchy_depth: downline.hierarchy_depth,
      });
    }

    return Array.from(byId.values()).sort((a, b) => {
      if (currentUserId) {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
      }

      const depthDiff = (a.hierarchy_depth ?? 999) - (b.hierarchy_depth ?? 999);
      if (depthDiff !== 0) return depthDiff;

      const lastNameCompare = (a.last_name || "").localeCompare(
        b.last_name || "",
      );
      if (lastNameCompare !== 0) return lastNameCompare;

      return (a.first_name || "").localeCompare(b.first_name || "");
    });
  }, [currentProfileQuery.data, currentUserId, downlinesQuery.data]);

  const error = (currentProfileQuery.error || downlinesQuery.error) as
    | Error
    | null
    | undefined;

  return {
    data,
    isLoading:
      enabled && (currentProfileQuery.isLoading || downlinesQuery.isLoading),
    isFetching:
      currentProfileQuery.isFetching || downlinesQuery.isFetching || false,
    error,
    refetch: async () => {
      await Promise.all([
        currentProfileQuery.refetch(),
        downlinesQuery.refetch(),
      ]);
    },
  };
}

export const useLicensingWorkspaceAgents = useTheStandardAgents;
