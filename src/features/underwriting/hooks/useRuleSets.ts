// src/features/underwriting/hooks/useRuleSets.ts
// React Query hooks for v2 rule sets (compound predicates with approval workflow)

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  getRuleSetsForCarrier,
  getRuleSet,
  getRulesNeedingReview,
  createRuleSet,
  updateRuleSet,
  deleteRuleSet,
  type CreateRuleSetInput,
  type RuleSetWithRules,
  type RuleReviewStatus,
} from "@/services/underwriting/ruleService";
import type {
  HealthClass,
  TableRating,
} from "@/services/underwriting/ruleService";
import { parsePredicate } from "@/services/underwriting/ruleEngineDSL";
import type {
  PredicateGroup,
  RuleSetScope,
} from "@/services/underwriting/ruleEngineDSL";
import { coverageStatsKeys } from "./useCoverageStats";

// ============================================================================
// Query Keys
// ============================================================================

export const ruleEngineKeys = {
  all: ["rule-engine"] as const,
  ruleSets: (carrierId: string, productId?: string | null) =>
    [
      ...ruleEngineKeys.all,
      "rule-sets",
      carrierId,
      productId ?? "all",
    ] as const,
  ruleSet: (ruleSetId: string) =>
    [...ruleEngineKeys.all, "rule-set", ruleSetId] as const,
  needingReview: () => [...ruleEngineKeys.all, "needing-review"] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all rule sets for a carrier
 */
export function useRuleSets(
  carrierId: string | undefined,
  options?: {
    productId?: string | null;
    includeInactive?: boolean;
    reviewStatus?: RuleReviewStatus | RuleReviewStatus[];
  },
) {
  const { user } = useAuth();
  const imoId = user?.imo_id;

  return useQuery({
    queryKey: ruleEngineKeys.ruleSets(carrierId || "", options?.productId),
    queryFn: () =>
      getRuleSetsForCarrier(carrierId!, imoId!, {
        includeInactive: options?.includeInactive,
        reviewStatus: options?.reviewStatus,
      }),
    enabled: !!carrierId && !!imoId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch a single rule set by ID with all rules
 */
export function useRuleSet(ruleSetId: string | undefined) {
  return useQuery({
    queryKey: ruleEngineKeys.ruleSet(ruleSetId || ""),
    queryFn: () => getRuleSet(ruleSetId!),
    enabled: !!ruleSetId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch rule sets needing review (draft or pending_review)
 */
export function useRulesNeedingReview() {
  const { user } = useAuth();
  const imoId = user?.imo_id;

  return useQuery({
    queryKey: ruleEngineKeys.needingReview(),
    queryFn: () => getRulesNeedingReview(imoId!),
    enabled: !!imoId,
    staleTime: 2 * 60 * 1000, // 2 minutes - check more frequently
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new rule set
 */
export function useCreateRuleSet() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const imoId = user?.imo_id;
  const userId = user?.id;

  return useMutation({
    mutationFn: (input: CreateRuleSetInput) => {
      if (!imoId || !userId) {
        throw new Error("User not authenticated");
      }
      return createRuleSet(imoId, input, userId);
    },
    onSuccess: (data) => {
      // Invalidate rule sets list for this carrier
      queryClient.invalidateQueries({
        queryKey: ruleEngineKeys.ruleSets(data.carrier_id),
      });
      // Also invalidate needing review since new rule sets are drafts
      queryClient.invalidateQueries({
        queryKey: ruleEngineKeys.needingReview(),
      });
    },
  });
}

/**
 * Update a rule set
 */
export function useUpdateRuleSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Parameters<typeof updateRuleSet>[1];
    }) => updateRuleSet(id, updates),
    onSuccess: (data) => {
      // Invalidate the specific rule set
      queryClient.invalidateQueries({
        queryKey: ruleEngineKeys.ruleSet(data.id),
      });
      // Invalidate rule sets list for this carrier
      queryClient.invalidateQueries({
        queryKey: ruleEngineKeys.ruleSets(data.carrier_id),
      });
      // Invalidate needing review
      queryClient.invalidateQueries({
        queryKey: ruleEngineKeys.needingReview(),
      });
      // Invalidate coverage stats (active/inactive changes affect coverage)
      queryClient.invalidateQueries({
        queryKey: coverageStatsKeys.all,
      });
    },
  });
}

/**
 * Delete a rule set
 */
export function useDeleteRuleSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      carrierId: _carrierId,
    }: {
      id: string;
      carrierId: string;
    }) => deleteRuleSet(id),
    onSuccess: (_, variables) => {
      // Invalidate rule sets list for this carrier
      queryClient.invalidateQueries({
        queryKey: ruleEngineKeys.ruleSets(variables.carrierId),
      });
      // Remove the specific rule set from cache
      queryClient.removeQueries({
        queryKey: ruleEngineKeys.ruleSet(variables.id),
      });
      // Invalidate needing review
      queryClient.invalidateQueries({
        queryKey: ruleEngineKeys.needingReview(),
      });
      // Invalidate coverage stats
      queryClient.invalidateQueries({
        queryKey: coverageStatsKeys.all,
      });
    },
  });
}

// Re-export types for convenience
export type {
  RuleSetWithRules,
  CreateRuleSetInput,
  RuleReviewStatus,
  HealthClass,
  TableRating,
  PredicateGroup,
  RuleSetScope,
};
export { parsePredicate, deleteRuleSet };
