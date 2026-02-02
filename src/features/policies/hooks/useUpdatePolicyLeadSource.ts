// src/features/policies/hooks/useUpdatePolicyLeadSource.ts
// Hook for updating a policy's lead source attribution

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { policyService } from "@/services/policies/policyService";
import { policyKeys } from "../queries";
import { leadPurchaseKeys } from "@/hooks";
import type { LeadSourceType } from "@/types/policy.types";
import type { Policy } from "@/types/policy.types";

interface UpdateLeadSourceParams {
  policyId: string;
  leadSourceType: LeadSourceType | null;
  leadPurchaseId?: string | null;
}

/**
 * Hook to update a policy's lead source attribution
 *
 * @example
 * // Link to a lead purchase
 * updateLeadSource.mutate({
 *   policyId: 'policy-123',
 *   leadSourceType: 'lead_purchase',
 *   leadPurchaseId: 'purchase-456'
 * });
 *
 * @example
 * // Mark as free/hand-me-down lead
 * updateLeadSource.mutate({
 *   policyId: 'policy-123',
 *   leadSourceType: 'free_lead'
 * });
 *
 * @example
 * // Clear lead source
 * updateLeadSource.mutate({
 *   policyId: 'policy-123',
 *   leadSourceType: null
 * });
 */
export function useUpdatePolicyLeadSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateLeadSourceParams): Promise<Policy> => {
      return policyService.updateLeadSource(
        params.policyId,
        params.leadSourceType,
        params.leadPurchaseId,
      );
    },
    onSuccess: (updatedPolicy, params) => {
      // Update policy caches
      queryClient.invalidateQueries({ queryKey: policyKeys.lists() });
      queryClient.setQueryData(
        policyKeys.detail(updatedPolicy.id),
        updatedPolicy,
      );

      // Invalidate lead purchase queries if a lead purchase was linked
      // The DB trigger will have updated the lead_purchase ROI fields
      if (params.leadPurchaseId) {
        queryClient.invalidateQueries({ queryKey: leadPurchaseKeys.all });
        queryClient.invalidateQueries({
          queryKey: leadPurchaseKeys.detail(params.leadPurchaseId),
        });
        queryClient.invalidateQueries({ queryKey: leadPurchaseKeys.stats() });
      }
    },
  });
}
