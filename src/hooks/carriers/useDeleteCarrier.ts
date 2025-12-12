// /home/nneessen/projects/commissionTracker/src/hooks/carriers/useDeleteCarrier.ts

import {useMutation, useQueryClient} from '@tanstack/react-query';
import {carrierService} from '../../services/settings/carrierService';

export const useDeleteCarrier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await carrierService.deleteCarrier(id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
    }
  });
};