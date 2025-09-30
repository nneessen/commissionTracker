// /home/nneessen/projects/commissionTracker/src/hooks/policies/useDeletePolicy.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { policyService } from '../../services/policies/policyService';

export const useDeletePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await policyService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    }
  });
};