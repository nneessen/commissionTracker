// src/features/underwriting/hooks/useRules.ts
// React Query hooks for v2 rules (individual rules within rule sets)

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createRule,
  updateRule,
  deleteRule,
  reorderRules,
  type CreateRuleInput,
} from "@/services/underwriting/ruleService";
import { ruleEngineKeys } from "./useRuleSets";
import { coverageStatsKeys } from "./useCoverageStats";

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new rule within a rule set
 */
export function useCreateRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRuleInput) => createRule(input),
    onSuccess: (_, variables) => {
      // Invalidate the parent rule set to refresh rules list
      queryClient.invalidateQueries({
        queryKey: ruleEngineKeys.ruleSet(variables.ruleSetId),
      });
      // Also invalidate needing review since rule changes may affect status
      queryClient.invalidateQueries({
        queryKey: ruleEngineKeys.needingReview(),
      });
    },
  });
}

/**
 * Update an existing rule
 */
export function useUpdateRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      carrierId: _carrierId,
      ruleSetId: _ruleSetId,
      updates,
    }: {
      id: string;
      carrierId: string;
      ruleSetId: string;
      updates: Parameters<typeof updateRule>[1];
    }) => updateRule(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ruleEngineKeys.ruleSet(variables.ruleSetId),
      });
      queryClient.invalidateQueries({
        queryKey: ruleEngineKeys.ruleSets(variables.carrierId),
      });
      queryClient.invalidateQueries({
        queryKey: ruleEngineKeys.needingReview(),
      });
      queryClient.invalidateQueries({
        queryKey: coverageStatsKeys.all,
      });
    },
  });
}

/**
 * Delete a rule
 */
export function useDeleteRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      carrierId: _carrierId,
      ruleSetId: _ruleSetId,
    }: {
      id: string;
      carrierId: string;
      ruleSetId: string;
    }) => deleteRule(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ruleEngineKeys.ruleSet(variables.ruleSetId),
      });
      queryClient.invalidateQueries({
        queryKey: ruleEngineKeys.ruleSets(variables.carrierId),
      });
      queryClient.invalidateQueries({
        queryKey: ruleEngineKeys.needingReview(),
      });
      queryClient.invalidateQueries({
        queryKey: coverageStatsKeys.all,
      });
    },
  });
}

/**
 * Reorder rules within a rule set
 */
export function useReorderRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ruleSetId,
      carrierId: _carrierId,
      ruleIds,
    }: {
      ruleSetId: string;
      carrierId: string;
      ruleIds: string[];
    }) => reorderRules(ruleSetId, ruleIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ruleEngineKeys.ruleSet(variables.ruleSetId),
      });
      queryClient.invalidateQueries({
        queryKey: ruleEngineKeys.ruleSets(variables.carrierId),
      });
    },
  });
}

// Re-export types for convenience
export type { CreateRuleInput };
