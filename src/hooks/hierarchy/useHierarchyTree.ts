// src/hooks/hierarchy/useHierarchyTree.ts

import { useQuery } from "@tanstack/react-query";
import { hierarchyService } from "../../services/hierarchy/hierarchyService";
import { hierarchyKeys } from "./hierarchyKeys";

export interface UseHierarchyTreeOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch the current user's hierarchy tree (nested structure with all downlines)
 * Returns a tree structure with nested children for org chart display
 *
 * @param options Optional configuration for query behavior
 * @returns TanStack Query result with hierarchy tree data
 */
export const useHierarchyTree = (options?: UseHierarchyTreeOptions) => {
  const { enabled = true, staleTime, gcTime } = options || {};

  return useQuery({
    queryKey: hierarchyKeys.downline("me", undefined, "tree"),
    queryFn: () => hierarchyService.getMyHierarchyTree(),
    staleTime: staleTime ?? 60_000, // 60 seconds default
    gcTime: gcTime ?? 20 * 60_000, // 20 minutes garbage collection
    enabled,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
