import { useState, useCallback } from 'react';
import { useQuery, useQueries, keepPreviousData } from '@tanstack/react-query';
import { Policy, PolicyFilters } from '../../types/policy.types';
import { policyService } from '../../services/policies/policyService';

interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Server-side pagination hook for viewing policies with filtering, sorting, and pagination
 * Uses TanStack Query for data fetching with server-side operations for performance
 *
 * @returns Complete policies view with data, loading states, and control functions
 */
export function usePoliciesView() {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filtering state
  const [filters, setFilters] = useState<PolicyFilters>({});

  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'created_at',
    direction: 'desc'
  });

  // Separate searchTerm from filters for client-side filtering
  const { searchTerm, ...serverFilters } = filters;

  // Use parallel queries for data, count, and metrics
  const [dataQuery, countQuery, metricsQuery] = useQueries({
    queries: [
      {
        queryKey: ['policies', 'data', currentPage, pageSize, serverFilters, sortConfig],
        queryFn: () => policyService.getPaginated(
          currentPage,
          pageSize,
          serverFilters,
          sortConfig
        ),
        staleTime: 5 * 60 * 1000, // 5 minutes
        placeholderData: keepPreviousData, // Smooth page transitions
      },
      {
        queryKey: ['policies', 'count', serverFilters],
        queryFn: () => policyService.getCount(serverFilters),
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
      {
        queryKey: ['policies', 'metrics', serverFilters],
        queryFn: () => policyService.getAggregateMetrics(serverFilters),
        staleTime: 5 * 60 * 1000, // 5 minutes
      }
    ]
  });

  const allPolicies = dataQuery.data || [];

  // Client-side filtering for search term (since Supabase can't search joined tables easily)
  const policies = searchTerm
    ? allPolicies.filter(policy => {
        const searchLower = searchTerm.toLowerCase();
        return (
          policy.policyNumber?.toLowerCase().includes(searchLower) ||
          policy.client?.name?.toLowerCase().includes(searchLower) ||
          policy.client?.state?.toLowerCase().includes(searchLower)
        );
      })
    : allPolicies;

  const totalItems = countQuery.data || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Pagination controls
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  }, []);

  // Filter controls
  const updateFilters = useCallback((newFilters: PolicyFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setCurrentPage(1);
  }, []);

  const filterCount = Object.entries(filters).filter(
    ([_, value]) => value !== undefined && value !== null && value !== ''
  ).length;

  // Sort controls
  const toggleSort = useCallback((field: string) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1); // Reset to first page when sorting changes
  }, []);

  const clearSort = useCallback(() => {
    setSortConfig({ field: 'created_at', direction: 'desc' });
    setCurrentPage(1);
  }, []);

  // Loading and error states
  const isLoading = dataQuery.isLoading || countQuery.isLoading || metricsQuery.isLoading;
  const isFetching = dataQuery.isFetching || countQuery.isFetching || metricsQuery.isFetching;
  const error = dataQuery.error || countQuery.error || metricsQuery.error;

  // Aggregate metrics (global or filtered)
  const metrics = metricsQuery.data;

  return {
    // Data
    policies,
    paginatedPolicies: policies, // For compatibility

    // Loading states
    isLoading,
    isFetching,
    error: error ? (error as Error).message : null,

    // Pagination
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    pageSizeOptions: [10, 25, 50, 100],
    goToPage,
    nextPage,
    previousPage,
    setPageSize: handlePageSizeChange,

    // Filtering
    filters,
    setFilters: updateFilters,
    clearFilters,
    filterCount,

    // Sorting
    sortConfig,
    setSortConfig,
    toggleSort,
    clearSort,

    // Metrics (global or filtered across all pages)
    metrics,

    // Refresh
    refresh: () => {
      dataQuery.refetch();
      countQuery.refetch();
      metricsQuery.refetch();
    },
  };
}
