// /home/nneessen/projects/commissionTracker/src/hooks/policies/useLapsePolicy.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { policyService } from '../../services/policies/policyService';

export interface UseLapsePolicyParams {
  policyId: string;
  lapseDate?: Date;
  reason?: string;
}

/**
 * Hook to lapse a policy
 *
 * Used when client stops paying premiums.
 * Automatically calculates chargeback via database trigger.
 */
export const useLapsePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UseLapsePolicyParams) => {
      const { policyId, lapseDate, reason } = params;
      return await policyService.lapsePolicy(policyId, lapseDate, reason);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['chargeback-summary'] });
    }
  });
};
