// src/hooks/commissions/useCommission.ts

import {useQuery} from '@tanstack/react-query';
import {commissionService} from '../../services';

export interface UseCommissionOptions {
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Fetch a single commission by ID using TanStack Query
 *
 * @param id Commission ID
 * @param options Optional configuration for the query
 * @returns TanStack Query result with commission data
 */
export function useCommission(id: string, options?: UseCommissionOptions) {
  return useQuery({
    queryKey: ['commissions', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Commission ID is required');
      }
      return await commissionService.getById(id);
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    enabled: options?.enabled ?? !!id,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
