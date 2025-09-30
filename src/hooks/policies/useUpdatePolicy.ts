// /home/nneessen/projects/commissionTracker/src/hooks/policies/useUpdatePolicy.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { policyService } from '../../services/policies/policyService';
import { CreatePolicyData } from '../../types/policy.types';

export const useUpdatePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreatePolicyData> }) => {
      return await policyService.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    }
  });
};