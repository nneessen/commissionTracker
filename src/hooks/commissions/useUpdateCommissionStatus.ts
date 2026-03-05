// src/hooks/commissions/useUpdateCommissionStatus.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hierarchyKeys } from "../hierarchy/hierarchyKeys";
import { invalidateHierarchyForNode } from "../hierarchy/invalidation";
import { commissionStatusService } from "../../services/commissions/CommissionStatusService";

interface UpdateCommissionStatusParams {
  commissionId: string;
  status: "pending" | "unpaid" | "paid" | "charged_back";
  policyId?: string;
}

/**
 * Commission Status Architecture
 *
 * This hook handles manual commission status updates for the normal lifecycle:
 * - pending → paid
 *
 * IMPORTANT: Terminal states (reversed, disputed, clawback, charged_back) should NOT be set manually.
 * They are set automatically by database triggers when policies lapse/cancel.
 *
 * To cancel/lapse a policy, use policy action buttons which trigger database automation.
 */
export const useUpdateCommissionStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commissionId,
      status,
      policyId: _policyId,
    }: UpdateCommissionStatusParams) => {
      return commissionStatusService.updateCommissionStatus({
        commissionId,
        status,
      });
    },
    onSuccess: (commissionData) => {
      // Invalidate all related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["commission-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["chargeback-summary"] });
      // Invalidate override-related queries (commission status changes trigger override status sync)
      queryClient.invalidateQueries({ queryKey: ["overrides"] });
      const agentId =
        commissionData && typeof commissionData === "object"
          ? (commissionData as { user_id?: string }).user_id
          : undefined;
      if (agentId) {
        invalidateHierarchyForNode(queryClient, agentId);
      }
      queryClient.invalidateQueries({
        queryKey: hierarchyKeys.rollup("me", undefined, "stats"),
      });
      queryClient.invalidateQueries({
        queryKey: hierarchyKeys.rollup("me", undefined, "team-comparison"),
      });
    },
  });
};
