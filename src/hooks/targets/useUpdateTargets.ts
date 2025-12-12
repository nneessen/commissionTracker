// src/hooks/targets/useUpdateTargets.ts

import {useMutation, useQueryClient} from '@tanstack/react-query';
import {targetsService} from '../../services/targets';
import {supabase} from '../../services/base/supabase';
import type {UpdateUserTargetsData} from '../../types/targets.types';

/**
 * Update user targets using TanStack Mutation
 *
 * @returns TanStack mutation for updating targets
 */
export const useUpdateTargets = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: UpdateUserTargetsData) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      return await targetsService.updateUserTargets(user.id, updates);
    },
    onSuccess: () => {
      // Invalidate and refetch targets
      queryClient.invalidateQueries({ queryKey: ['targets'] });
    },
  });
};
