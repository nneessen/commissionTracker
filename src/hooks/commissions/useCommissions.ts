// src/hooks/commissions/useCommissions.ts

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { commissionService } from '../../services/commissions/commissionService';
import { Commission } from '../../types/commission.types';

export interface UseCommissionsOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch all commissions using TanStack Query
 *
 * @param options Optional configuration for the query
 * @returns TanStack Query result with commissions data
 */
export const useCommissions = (options?: UseCommissionsOptions) => {
  return useQuery({
    queryKey: ['commissions'],
    queryFn: async () => {
      return await commissionService.getAll();
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    gcTime: options?.gcTime ?? 10 * 60 * 1000, // 10 minutes garbage collection
    enabled: options?.enabled ?? true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};
