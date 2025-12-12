// src/features/policies/hooks/useDeletePolicy.ts
// Hook for deleting a policy

import {useMutation, useQueryClient} from '@tanstack/react-query';
import {policyService} from '@/services/policies/policyService';
import {policyKeys} from '../queries';

/**
 * Delete a policy
 *
 * @returns Mutation with mutate/mutateAsync functions
 *
 * @example
 * const deletePolicy = useDeletePolicy();
 * deletePolicy.mutate(policyId, { onSuccess: () => { ... } });
 */
export function useDeletePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string): Promise<void> => {
      return policyService.delete(id);
    },
    onSuccess: (_, deletedId) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: policyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: policyKeys.count() });
      queryClient.invalidateQueries({ queryKey: policyKeys.metrics() });
      // Remove from detail cache
      queryClient.removeQueries({ queryKey: policyKeys.detail(deletedId) });
      // Also invalidate commissions (cascade delete)
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
  });
}
