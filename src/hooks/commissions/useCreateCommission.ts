// /home/nneessen/projects/commissionTracker/src/hooks/commissions/useCreateCommission.ts

import {useMutation, useQueryClient} from '@tanstack/react-query';
import {commissionService, CreateCommissionData} from '../../services/commissions/commissionService';

export const useCreateCommission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newCommission: CreateCommissionData) => {
      return await commissionService.create(newCommission);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    }
  });
};