// /home/nneessen/projects/commissionTracker/src/hooks/carriers/useCreateCarrier.ts

import {useMutation, useQueryClient} from '@tanstack/react-query';
import {carrierService} from '../../services/settings/carrierService';
import {NewCarrierForm} from '../../types/carrier.types';

export const useCreateCarrier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newCarrier: NewCarrierForm) => {
      const { data, error } = await carrierService.createCarrier(newCarrier);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
    }
  });
};