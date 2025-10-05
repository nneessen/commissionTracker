// src/hooks/policies/usePolicies.ts

import { useQuery } from '@tanstack/react-query';
import { policyService } from '../../services/policies/policyService';
import { PolicyFilters } from '../../types/policy.types';

export interface UsePoliciesOptions {
  filters?: PolicyFilters;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch policies using TanStack Query
 * Supports optional filtering with automatic cache key management
 *
 * @param options Optional configuration including filters and query options
 * @returns TanStack Query result with policies data
 */
export const usePolicies = (options?: UsePoliciesOptions) => {
  const { filters, enabled = true, staleTime, gcTime } = options || {};

  return useQuery({
    queryKey: ['policies', filters],
    queryFn: async () => {
      if (filters && Object.keys(filters).length > 0) {
        return await policyService.getFiltered(filters);
      }
      return await policyService.getAll();
    },
    staleTime: staleTime ?? 5 * 60 * 1000, // 5 minutes default
    gcTime: gcTime ?? 10 * 60 * 1000, // 10 minutes garbage collection
    enabled,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
