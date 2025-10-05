import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { policyService } from '../../services/policies/policyService';
import { Policy } from '../../types/policy.types';

interface UseInfinitePoliciesOptions {
  filters?: {
    status?: string;
    carrierId?: string;
    productId?: string;
    userId?: string;
  };
  limit?: number;
  orderBy?: 'created_at' | 'effective_date' | 'id';
  orderDirection?: 'asc' | 'desc';
}

interface PolicyPage {
  data: Policy[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Hook for infinite scrolling of policies using cursor-based pagination
 * Handles Supabase's 1000 row limit by fetching in chunks
 */
export function useInfinitePolicies(options: UseInfinitePoliciesOptions = {}) {
  const {
    filters = {},
    limit = 50,
    orderBy = 'created_at',
    orderDirection = 'desc'
  } = options;

  const queryResult = useInfiniteQuery<PolicyPage>({
    queryKey: ['policies', 'infinite', filters, orderBy, orderDirection, limit],
    queryFn: async ({ pageParam }) => {
      // Use PolicyRepository's findPaginated method via service
      const repository = (policyService as any).repository;
      return repository.findPaginated({
        cursor: pageParam,
        limit,
        filters,
        orderBy,
        orderDirection
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Flatten all pages into single array
  const allPolicies = queryResult.data?.pages.flatMap(page => page.data) || [];

  // Check if we have more data to load
  const hasNextPage = queryResult.data?.pages[queryResult.data.pages.length - 1]?.hasMore || false;

  return {
    policies: allPolicies,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    isFetchingNextPage: queryResult.isFetchingNextPage,
    hasNextPage,
    fetchNextPage: queryResult.fetchNextPage,
    refetch: queryResult.refetch,
    totalFetched: allPolicies.length,
  };
}

/**
 * Hook to get total count of policies (separate from pagination)
 * Returns standard TanStack Query result
 */
export function usePolicyCount(filters?: {
  status?: string;
  carrierId?: string;
  productId?: string;
  userId?: string;
}) {
  return useQuery({
    queryKey: ['policies', 'count', filters],
    queryFn: async () => {
      const repository = (policyService as any).repository;
      return repository.countPolicies(filters);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}