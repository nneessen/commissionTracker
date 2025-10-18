// /home/nneessen/projects/commissionTracker/src/hooks/commissions/useChargebackSummary.ts

import { useQuery } from '@tanstack/react-query';
import { commissionStatusService } from '../../services/commissions/CommissionStatusService';
import { supabase } from '../../services/base/supabase';

/**
 * Hook to get chargeback summary metrics for the current user
 *
 * Returns aggregate chargeback data for dashboard/reporting.
 */
export const useChargebackSummary = () => {
  return useQuery({
    queryKey: ['chargeback-summary'],
    queryFn: async () => {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      return await commissionStatusService.getChargebackSummary(user.id);
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
