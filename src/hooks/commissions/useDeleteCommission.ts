// /home/nneessen/projects/commissionTracker/src/hooks/commissions/useDeleteCommission.ts

import {useMutation, useQueryClient} from '@tanstack/react-query';
import {commissionService} from '../../services/commissions/commissionService';

export const useDeleteCommission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await commissionService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    }
  });
};