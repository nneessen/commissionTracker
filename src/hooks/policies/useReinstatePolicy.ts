// /home/nneessen/projects/commissionTracker/src/hooks/policies/useReinstatePolicy.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { policyService } from '../../services/policies/policyService';

export interface UseReinstatePolicyParams {
  policyId: string;
  reason: string;
}

/**
 * Hook to reinstate a cancelled/lapsed policy
 *
 * Reverses the chargeback and restores commission to earned status.
 */
export const useReinstatePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UseReinstatePolicyParams) => {
      const { policyId, reason } = params;
      return await policyService.reinstatePolicy(policyId, reason);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['chargeback-summary'] });
    }
  });
};
