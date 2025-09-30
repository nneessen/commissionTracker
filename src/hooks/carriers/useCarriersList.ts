// /home/nneessen/projects/commissionTracker/src/hooks/carriers/useCarriersList.ts

import { useQuery } from '@tanstack/react-query';
import { carrierService } from '../../services/settings/carrierService';

export const useCarriersList = () => {
  return useQuery({
    queryKey: ['carriers'],
    queryFn: async () => {
      const { data, error } = await carrierService.getAllCarriers();
      if (error) throw error;
      return data;
    }
  });
};