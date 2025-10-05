// /home/nneessen/projects/commissionTracker/src/hooks/policies/useCreatePolicy.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { policyService } from '../../services/policies/policyService';
import { CreatePolicyData } from '../../types/policy.types';

export const useCreatePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newPolicy: CreatePolicyData) => {
      return policyService.create(newPolicy);
    },
    onSuccess: () => {
      // Invalidate both policies and commissions queries
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    }
  });
};