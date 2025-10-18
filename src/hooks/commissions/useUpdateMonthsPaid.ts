// /home/nneessen/projects/commissionTracker/src/hooks/commissions/useUpdateMonthsPaid.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commissionStatusService } from '../../services/commissions/CommissionStatusService';

export interface UseUpdateMonthsPaidParams {
  commissionId: string;
  lastPaymentDate?: Date; // Optional - defaults to today
  // monthsPaid is now automatically calculated from policy effective_date
}

/**
 * Hook to update months_paid for a commission
 *
 * Automatically calculates months_paid based on policy effective_date and current date.
 * Automatically recalculates earned/unearned amounts.
 * No need to manually specify months_paid anymore!
 */
export const useUpdateMonthsPaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UseUpdateMonthsPaidParams) => {
      return await commissionStatusService.updateMonthsPaid(params);
    },
    onSuccess: () => {
      // Invalidate commission queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['commission-metrics'] });
    }
  });
};
