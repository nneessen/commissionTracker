// /home/nneessen/projects/commissionTracker/src/hooks/policies/usePoliciesList.ts

import { useQuery } from '@tanstack/react-query';
import { policyService } from '../../services/policies/policyService';

export const usePoliciesList = () => {
  return useQuery({
    queryKey: ['policies'],
    queryFn: async () => {
      return await policyService.getAll();
    }
  });
};