// src/features/policies/hooks/useUpdatePolicy.ts
// Hook for updating a policy (including status changes like cancel/lapse/reinstate)

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { policyService } from "@/services/policies/policyService";
import { commissionService } from "@/services/commissions/commissionService";
import { supabase } from "@/services/base/supabase";
import { policyKeys } from "../queries";
import type { CreatePolicyData, Policy, PolicyStatus } from "@/types/policy.types";
import type { Commission, CommissionStatus } from "@/types/commission.types";
import { POLICY_TO_COMMISSION_STATUS } from "@/constants/status.constants";

// Basic update params
interface BasicUpdateParams {
  id: string;
  updates: Partial<CreatePolicyData>;
}

// Cancel-specific params
interface CancelParams {
  id: string;
  status: "cancelled";
  reason: string;
  cancelDate?: Date;
}

// Lapse-specific params
interface LapseParams {
  id: string;
  status: "lapsed";
  lapseDate?: Date;
  reason?: string;
}

// Reinstate-specific params
interface ReinstateParams {
  id: string;
  status: "active";
  previousStatus: "cancelled" | "lapsed";
  reason: string;
}

export type UpdatePolicyParams =
  | BasicUpdateParams
  | CancelParams
  | LapseParams
  | ReinstateParams;

// Type guards
function isCancelParams(params: UpdatePolicyParams): params is CancelParams {
  return (
    "status" in params && params.status === "cancelled" && "reason" in params
  );
}

function isLapseParams(params: UpdatePolicyParams): params is LapseParams {
  return "status" in params && params.status === "lapsed";
}

function isReinstateParams(
  params: UpdatePolicyParams,
): params is ReinstateParams {
  return (
    "status" in params &&
    params.status === "active" &&
    "previousStatus" in params
  );
}

function isBasicUpdateParams(
  params: UpdatePolicyParams,
): params is BasicUpdateParams {
  return "updates" in params;
}

/**
 * Checks if any fields that affect commission calculation have changed
 * This triggers commission recalculation when premium, carrier, or product changes
 */
function requiresCommissionRecalc(updates: Partial<CreatePolicyData>): boolean {
  return (
    updates.annualPremium !== undefined ||
    updates.monthlyPremium !== undefined ||
    updates.carrierId !== undefined ||
    updates.productId !== undefined ||
    updates.product !== undefined
  );
}

/**
 * Checks if carrier or product changed - requires full recalculation from comp_guide
 * because commission rate may be different
 */
function hasCarrierOrProductChange(
  updates: Partial<CreatePolicyData>,
): boolean {
  return (
    updates.carrierId !== undefined ||
    updates.productId !== undefined ||
    updates.product !== undefined
  );
}

/**
 * Syncs commission status when policy status changes
 * Uses the POLICY_TO_COMMISSION_STATUS mapping
 */
async function syncCommissionStatus(
  policyId: string,
  newPolicyStatus: PolicyStatus,
): Promise<void> {
  const newCommissionStatus = POLICY_TO_COMMISSION_STATUS[
    newPolicyStatus
  ] as CommissionStatus;

  // Fetch the commission for this policy
  const { data: commissions, error: fetchError } = await supabase
    .from("commissions")
    .select("id, status, advance_months")
    .eq("policy_id", policyId)
    .limit(1);

  if (fetchError || !commissions || commissions.length === 0) {
    return; // No commission found, nothing to sync
  }

  const commission = commissions[0];

  // Only update if status is different
  if (commission.status === newCommissionStatus) {
    return;
  }

  // Prepare update data based on the new status
  const updateData: Record<string, unknown> = {
    status: newCommissionStatus,
    updated_at: new Date().toISOString(),
  };

  // If policy becomes active (pending -> active), mark commission as paid
  if (newPolicyStatus === "active" && commission.status === "pending") {
    updateData.months_paid = commission.advance_months || 9;
    updateData.payment_date = new Date().toISOString();
    updateData.chargeback_amount = 0;
    updateData.chargeback_date = null;
    updateData.chargeback_reason = null;
  }

  // If policy becomes pending, reset commission to pending
  if (newPolicyStatus === "pending") {
    updateData.months_paid = 0;
    updateData.payment_date = null;
    updateData.chargeback_amount = 0;
    updateData.chargeback_date = null;
    updateData.chargeback_reason = null;
  }

  // Update the commission
  await supabase.from("commissions").update(updateData).eq("id", commission.id);
}

/**
 * Update a policy - handles all update types including status changes
 *
 * For basic field updates:
 * @example
 * updatePolicy.mutate({ id: policyId, updates: { notes: 'New note' } });
 *
 * For cancellation:
 * @example
 * updatePolicy.mutate({ id: policyId, status: 'cancelled', reason: 'Client request' });
 *
 * For lapse:
 * @example
 * updatePolicy.mutate({ id: policyId, status: 'lapsed', reason: 'Non-payment' });
 *
 * For reinstatement:
 * @example
 * updatePolicy.mutate({ id: policyId, status: 'active', previousStatus: 'cancelled', reason: 'Client paid' });
 */
export function useUpdatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdatePolicyParams): Promise<Policy> => {
      // Route to appropriate service method based on params
      if (isCancelParams(params)) {
        const result = await policyService.cancelPolicy(
          params.id,
          params.reason,
          params.cancelDate,
        );
        return result.policy;
      }

      if (isLapseParams(params)) {
        const result = await policyService.lapsePolicy(
          params.id,
          params.lapseDate,
          params.reason,
        );
        return result.policy;
      }

      if (isReinstateParams(params)) {
        // reinstatePolicy returns Policy directly (not wrapped)
        return policyService.reinstatePolicy(params.id, params.reason);
      }

      // Basic update
      return policyService.update(params.id, params.updates);
    },
    onSuccess: async (updatedPolicy, params) => {
      // Always invalidate list and metrics
      queryClient.invalidateQueries({ queryKey: policyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: policyKeys.count() });
      queryClient.invalidateQueries({ queryKey: policyKeys.metrics() });

      // Update detail cache
      queryClient.setQueryData(
        policyKeys.detail(updatedPolicy.id),
        updatedPolicy,
      );

      // Sync commission status when policy status changes via basic update
      if (isBasicUpdateParams(params) && params.updates.status) {
        try {
          await syncCommissionStatus(
            updatedPolicy.id,
            params.updates.status as PolicyStatus,
          );
        } catch {
          // Don't throw - commission sync failure shouldn't fail the policy update
        }
      }

      // If premium, carrier, or product changed, recalculate the commission
      if (
        isBasicUpdateParams(params) &&
        requiresCommissionRecalc(params.updates)
      ) {
        try {
          const newAnnualPremium =
            params.updates.annualPremium ?? updatedPolicy.annualPremium;
          const newMonthlyPremium =
            params.updates.monthlyPremium ?? updatedPolicy.monthlyPremium;

          // Determine if we need full recalculation (carrier/product changed)
          const fullRecalculate = hasCarrierOrProductChange(params.updates);

          // Recalculate commission with new values
          const result =
            await commissionService.recalculateCommissionByPolicyId(
              updatedPolicy.id,
              newAnnualPremium,
              newMonthlyPremium,
              fullRecalculate,
            );

          // Update cache with new commission data
          if (result) {
            const allQueries = queryClient.getQueriesData({
              queryKey: ["commissions"],
            });

            // Update ALL commission queries that match
            allQueries.forEach(([queryKey, existingData]) => {
              if (Array.isArray(existingData)) {
                queryClient.setQueryData<Commission[]>(queryKey, (oldData) => {
                  if (!oldData) return [result];
                  return oldData.map((commission) =>
                    commission.id === result.id ? result : commission,
                  );
                });
              }
            });
          }
        } catch {
          // Don't throw - we don't want to fail the policy update if commission recalculation fails
        }
      }

      // Force a hard reset of commission queries to ensure UI updates
      // resetQueries clears the cache and triggers an immediate refetch for active queries
      await queryClient.resetQueries({ queryKey: ["commissions"] });
      // Also invalidate commission metrics which may be affected
      queryClient.invalidateQueries({ queryKey: ["commission-metrics"] });

      // Also invalidate chargeback summary for status changes
      if (
        isCancelParams(params) ||
        isLapseParams(params) ||
        isReinstateParams(params)
      ) {
        queryClient.invalidateQueries({ queryKey: ["chargeback-summary"] });
      }
    },
  });
}
