// /home/nneessen/projects/commissionTracker/src/hooks/commissions/useProcessChargeback.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commissionStatusService } from '../../services/commissions/CommissionStatusService';

export interface ProcessChargebackParams {
  commissionId: string;
  policyId: string;
  lapseDate?: Date;
}

/**
 * Hook to process a chargeback for a commission
 *
 * Automatically calculates and sets:
 * - months_paid (from policy effective_date to lapse_date)
 * - earned_amount, unearned_amount
 * - chargeback_amount (advance - earned)
 * - chargeback_date, chargeback_reason
 * - status = 'charged_back'
 *
 * All in one atomic database operation.
 */
export const useProcessChargeback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ProcessChargebackParams) => {
      return await commissionStatusService.processChargeback(params);
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['commission-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['chargeback-summary'] });
    }
  });
};
