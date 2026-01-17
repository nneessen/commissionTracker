// src/features/policies/hooks/useUpdatePolicy.ts
// Hook for updating a policy (including status changes like cancel/lapse/reinstate)

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { policyService } from "@/services/policies/policyService";
import { commissionService } from "@/services/commissions/commissionService";
import { policyKeys } from "../queries";
import type { CreatePolicyData, Policy } from "@/types/policy.types";
import type { Commission } from "@/types/commission.types";

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

      // If premium, carrier, or product changed, recalculate the commission
      console.log("[useUpdatePolicy] Checking if commission recalc needed:", {
        isBasicUpdate: isBasicUpdateParams(params),
        updates: isBasicUpdateParams(params) ? params.updates : null,
        requiresRecalc: isBasicUpdateParams(params)
          ? requiresCommissionRecalc(params.updates)
          : false,
      });

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
          // This will re-fetch rate from comp_guide instead of using stored rate
          const fullRecalculate = hasCarrierOrProductChange(params.updates);

          console.log(
            "[useUpdatePolicy] Calling recalculateCommissionByPolicyId:",
            {
              policyId: updatedPolicy.id,
              newAnnualPremium,
              newMonthlyPremium,
              fullRecalculate,
            },
          );

          // Recalculate commission with new values
          const result =
            await commissionService.recalculateCommissionByPolicyId(
              updatedPolicy.id,
              newAnnualPremium,
              newMonthlyPremium,
              fullRecalculate,
            );

          console.log("[useUpdatePolicy] Commission recalculation result:", {
            policyId: updatedPolicy.id,
            result,
            newAmount: result?.amount,
          });

          // DIRECTLY update the cache with the new commission data
          if (result) {
            const userId = updatedPolicy.userId;
            const targetQueryKey = ["commissions", userId];

            // DEBUG: Log the result object to see if policyId is correct
            console.log("[useUpdatePolicy] Commission result from service:", {
              id: result.id,
              policyId: result.policyId,
              amount: result.amount,
              userId: result.userId,
              fullResult: JSON.stringify(result),
            });

            // DEBUG: Show all commission-related queries in cache
            const allQueries = queryClient.getQueriesData({
              queryKey: ["commissions"],
            });
            console.log(
              "[useUpdatePolicy] All commission queries in cache:",
              allQueries.map(([key, data]) => ({
                key,
                dataLength: Array.isArray(data) ? data.length : "not array",
              })),
            );

            console.log("[useUpdatePolicy] Target query key:", targetQueryKey);

            // Update ALL commission queries that match, not just the exact key
            allQueries.forEach(([queryKey, existingData]) => {
              if (Array.isArray(existingData)) {
                console.log(
                  "[useUpdatePolicy] Updating cache for key:",
                  queryKey,
                );

                queryClient.setQueryData<Commission[]>(queryKey, (oldData) => {
                  if (!oldData) return [result];

                  const updatedData = oldData.map((commission) =>
                    commission.id === result.id ? result : commission,
                  );

                  const updatedCommission = updatedData.find(
                    (c) => c.id === result.id,
                  );
                  console.log(
                    "[useUpdatePolicy] Cache update for key",
                    queryKey,
                    {
                      oldLength: oldData.length,
                      newLength: updatedData.length,
                      updatedAmount: updatedCommission?.amount,
                      updatedPolicyId: updatedCommission?.policyId,
                    },
                  );

                  return updatedData;
                });
              }
            });
          }
        } catch (error) {
          console.error(
            "[useUpdatePolicy] Failed to recalculate commission:",
            error,
          );
          // Don't throw - we don't want to fail the policy update if commission recalculation fails
        }
      } else {
        console.log("[useUpdatePolicy] Commission recalc NOT needed");
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
