// /home/nneessen/projects/commissionTracker/src/hooks/commissions/useCommissionsList.ts

import { useQuery } from '@tanstack/react-query';
import { commissionService } from '../../services/commissions/commissionService';

export const useCommissionsList = () => {
  return useQuery({
    queryKey: ['commissions'],
    queryFn: async () => {
      return await commissionService.getAll();
    }
  });
};