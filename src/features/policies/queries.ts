// src/features/policies/queries.ts
// Query key factory + queryOptions for policies (TanStack Query v5 pattern)

import { queryOptions } from '@tanstack/react-query';
import { policyService } from '@/services/policies/policyService';
import type { PolicyFilters } from '@/types/policy.types';

/**
 * Hierarchical query key factory for policies
 * Pattern: generic → specific for flexible invalidation
 *
 * @see https://tkdodo.eu/blog/effective-react-query-keys
 */
export const policyKeys = {
  all: ['policies'] as const,
  lists: () => [...policyKeys.all, 'list'] as const,
  list: (filters: PolicyFilters = {}) => [...policyKeys.lists(), filters] as const,
  details: () => [...policyKeys.all, 'detail'] as const,
  detail: (id: string) => [...policyKeys.details(), id] as const,
  count: (filters?: PolicyFilters) => [...policyKeys.all, 'count', filters] as const,
  metrics: (filters?: PolicyFilters) => [...policyKeys.all, 'metrics', filters] as const,
};

/**
 * Query options factory combining keys + queryFn
 * Use with useQuery() or queryClient methods
 *
 * @see https://tkdodo.eu/blog/the-query-options-api
 */
export const policyQueries = {
  detail: (id: string) =>
    queryOptions({
      queryKey: policyKeys.detail(id),
      queryFn: () => policyService.getById(id),
      staleTime: 1000 * 60 * 5, // 5 minutes
    }),

  list: (filters: PolicyFilters = {}) =>
    queryOptions({
      queryKey: policyKeys.list(filters),
      queryFn: () => policyService.getFiltered(filters),
      staleTime: 1000 * 60 * 5,
    }),

  paginated: (
    page: number,
    pageSize: number,
    filters: PolicyFilters = {},
    sortConfig?: { field: string; direction: 'asc' | 'desc' }
  ) =>
    queryOptions({
      queryKey: [...policyKeys.list(filters), 'paginated', page, pageSize, sortConfig] as const,
      queryFn: () => policyService.getPaginated(page, pageSize, filters, sortConfig),
      staleTime: 1000 * 60 * 5,
    }),

  count: (filters?: PolicyFilters) =>
    queryOptions({
      queryKey: policyKeys.count(filters),
      queryFn: () => policyService.getCount(filters),
      staleTime: 1000 * 60 * 5,
    }),

  metrics: (filters?: PolicyFilters) =>
    queryOptions({
      queryKey: policyKeys.metrics(filters),
      queryFn: () => policyService.getAggregateMetrics(filters),
      staleTime: 1000 * 60 * 5,
    }),
};
