// src/hooks/targets/useUserTargets.ts

import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {userTargetsService, UpdateUserTargetsInput, UserTargets} from '@/services/userTargets/userTargetsService';

export interface UseUserTargetsOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch user targets using TanStack Query
 */
export const useUserTargets = (options?: UseUserTargetsOptions) => {
  return useQuery({
    queryKey: ['user-targets'],
    queryFn: async () => {
      return await userTargetsService.get();
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    gcTime: options?.gcTime ?? 10 * 60 * 1000, // 10 minutes garbage collection
    enabled: options?.enabled ?? true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Hook to update user targets
 */
export const useUpdateUserTargets = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateUserTargetsInput) => {
      return await userTargetsService.upsert(input);
    },
    onSuccess: (_data) => {
      // Invalidate and refetch user targets
      queryClient.invalidateQueries({ queryKey: ['user-targets'] });
    },
  });
};

export type { UserTargets, UpdateUserTargetsInput };
