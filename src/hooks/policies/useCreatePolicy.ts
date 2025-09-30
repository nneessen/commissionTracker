// /home/nneessen/projects/commissionTracker/src/hooks/policies/useCreatePolicy.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { policyService } from '../../services/policies/policyService';
import { CreatePolicyData } from '../../types/policy.types';

export const useCreatePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newPolicy: CreatePolicyData) => {
      return await policyService.create(newPolicy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    }
  });
};