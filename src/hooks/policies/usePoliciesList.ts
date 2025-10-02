import { useQuery } from '@tanstack/react-query';
import { policyService } from '../../services/policies/policyService';
import { PolicyFilters } from '../../types/policy.types';

/**
 * Fetch policies list using TanStack Query
 * Supports optional filtering with automatic cache key management
 *
 * @param filters Optional filters to apply to the query
 * @returns TanStack Query result with policies data
 */
export const usePoliciesList = (filters?: PolicyFilters) => {
  return useQuery({
    queryKey: ['policies', filters],
    queryFn: async () => {
      if (filters && Object.keys(filters).length > 0) {
        return await policyService.getFiltered(filters);
      }
      return await policyService.getAll();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - policies don't change frequently
    gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection (previously cacheTime)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};
