// /home/nneessen/projects/commissionTracker/src/hooks/commissions/useUpdateCommission.ts

import {useMutation, useQueryClient} from '@tanstack/react-query';
import {commissionService, CreateCommissionData} from '../../services/commissions/commissionService';

export const useUpdateCommission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateCommissionData> }) => {
      return await commissionService.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    }
  });
};