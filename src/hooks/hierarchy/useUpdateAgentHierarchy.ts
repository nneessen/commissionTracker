// src/hooks/hierarchy/useUpdateAgentHierarchy.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hierarchyService } from "../../services/hierarchy/hierarchyService";
import { HierarchyChangeRequest } from "../../types/hierarchy.types";
import { invalidateHierarchyForNode } from "./invalidation";

/**
 * Update agent hierarchy assignment (admin only)
 * Assigns an agent to a new upline in the hierarchy
 * Automatically validates for circular references and hierarchy depth
 *
 * @returns TanStack mutation hook for updating agent hierarchy
 */
export const useUpdateAgentHierarchy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: HierarchyChangeRequest) => {
      return hierarchyService.updateAgentHierarchy(request);
    },
    onSuccess: (_data, variables) => {
      invalidateHierarchyForNode(queryClient, variables.agent_id);
      if (variables.new_upline_id) {
        invalidateHierarchyForNode(queryClient, variables.new_upline_id);
      }
      // Invalidate user profiles in case they need to refresh
      queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
      // Invalidate overrides since hierarchy changes affect override calculations
      queryClient.invalidateQueries({ queryKey: ["overrides"] });
    },
  });
};
