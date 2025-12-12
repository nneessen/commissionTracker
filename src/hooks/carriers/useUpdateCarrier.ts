// /home/nneessen/projects/commissionTracker/src/hooks/carriers/useUpdateCarrier.ts

import {useMutation, useQueryClient} from '@tanstack/react-query';
import {carrierService} from '../../services/settings/carrierService';

export const useUpdateCarrier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<any> }) => {
      const { data, error } = await carrierService.updateCarrier(id, updates);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
    }
  });
};