// src/features/policies/hooks/useUpdatePolicy.ts
// Hook for updating a policy (including status changes like cancel/lapse/reinstate)

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { policyService } from '@/services/policies/policyService';
import { policyKeys } from '../queries';
import type { CreatePolicyData, Policy, PolicyStatus } from '@/types/policy.types';

// Basic update params
interface BasicUpdateParams {
  id: string;
  updates: Partial<CreatePolicyData>;
}

// Cancel-specific params
interface CancelParams {
  id: string;
  status: 'cancelled';
  reason: string;
  cancelDate?: Date;
}

// Lapse-specific params
interface LapseParams {
  id: string;
  status: 'lapsed';
  lapseDate?: Date;
  reason?: string;
}

// Reinstate-specific params
interface ReinstateParams {
  id: string;
  status: 'active';
  previousStatus: 'cancelled' | 'lapsed';
  reason: string;
}

export type UpdatePolicyParams = BasicUpdateParams | CancelParams | LapseParams | ReinstateParams;

// Type guards
function isCancelParams(params: UpdatePolicyParams): params is CancelParams {
  return 'status' in params && params.status === 'cancelled' && 'reason' in params;
}

function isLapseParams(params: UpdatePolicyParams): params is LapseParams {
  return 'status' in params && params.status === 'lapsed';
}

function isReinstateParams(params: UpdatePolicyParams): params is ReinstateParams {
  return 'status' in params && params.status === 'active' && 'previousStatus' in params;
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
        const result = await policyService.cancelPolicy(params.id, params.reason, params.cancelDate);
        return result.policy;
      }

      if (isLapseParams(params)) {
        const result = await policyService.lapsePolicy(params.id, params.lapseDate, params.reason);
        return result.policy;
      }

      if (isReinstateParams(params)) {
        // reinstatePolicy returns Policy directly (not wrapped)
        return policyService.reinstatePolicy(params.id, params.reason);
      }

      // Basic update
      return policyService.update(params.id, params.updates);
    },
    onSuccess: (updatedPolicy, params) => {
      // Always invalidate list and metrics
      queryClient.invalidateQueries({ queryKey: policyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: policyKeys.count() });
      queryClient.invalidateQueries({ queryKey: policyKeys.metrics() });

      // Update detail cache
      queryClient.setQueryData(policyKeys.detail(updatedPolicy.id), updatedPolicy);

      // Invalidate commissions for status changes (chargebacks may have been processed)
      if (isCancelParams(params) || isLapseParams(params) || isReinstateParams(params)) {
        queryClient.invalidateQueries({ queryKey: ['commissions'] });
        queryClient.invalidateQueries({ queryKey: ['chargeback-summary'] });
      }
    },
  });
}
