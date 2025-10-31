// src/hooks/targets/useTargets.ts

import { useQuery } from '@tanstack/react-query';
import { targetsService } from '../../services/targets';
import { supabase } from '../../services/base/supabase';
import type { UserTargets } from '../../types/targets.types';

export interface UseTargetsOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch user targets using TanStack Query
 *
 * @param options Optional configuration for the query
 * @returns TanStack Query result with user targets data
 */
export const useTargets = (options?: UseTargetsOptions) => {
  return useQuery({
    queryKey: ['targets'],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      return await targetsService.getUserTargets(user.id);
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    gcTime: options?.gcTime ?? 10 * 60 * 1000, // 10 minutes garbage collection
    enabled: options?.enabled ?? true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
