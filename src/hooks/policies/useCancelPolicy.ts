// /home/nneessen/projects/commissionTracker/src/hooks/policies/useCancelPolicy.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { policyService } from '../../services/policies/policyService';

export interface UseCancelPolicyParams {
  policyId: string;
  reason: string;
  cancelDate?: Date;
}

/**
 * Hook to cancel a policy
 *
 * Automatically calculates chargeback via database trigger.
 */
export const useCancelPolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UseCancelPolicyParams) => {
      const { policyId, reason, cancelDate } = params;
      return await policyService.cancelPolicy(policyId, reason, cancelDate);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['chargeback-summary'] });
    }
  });
};
