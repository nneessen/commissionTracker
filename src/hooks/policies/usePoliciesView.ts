import { useState, useMemo } from 'react';
import { usePoliciesList } from './usePoliciesList';
import { useSort } from '../base/useSort';
import { usePagination } from '../base/usePagination';
import { Policy, PolicyFilters } from '../../types/policy.types';

/**
 * Comprehensive hook for viewing policies with filtering, sorting, and pagination
 * Uses TanStack Query for data fetching with client-side operations for UX
 *
 * @returns Complete policies view with data, loading states, and control functions
 */
export function usePoliciesView() {
  // Fetch all policies using TanStack Query
  const { data: policies = [], isLoading, error, refetch } = usePoliciesList();

  // Client-side filtering state
  const [filters, setFilters] = useState<PolicyFilters>({});

  // Apply client-side filters
  const filteredData = useMemo(() => {
    return policies.filter(policy => {
      if (filters.status && policy.status !== filters.status) return false;
      if (filters.carrierId && policy.carrierId !== filters.carrierId) return false;
      if (filters.product && policy.product !== filters.product) return false;
      if (filters.startDate && new Date(policy.effectiveDate) < filters.startDate) return false;
      if (filters.endDate && new Date(policy.effectiveDate) > filters.endDate) return false;
      if (filters.minPremium && policy.annualPremium < filters.minPremium) return false;
      if (filters.maxPremium && policy.annualPremium > filters.maxPremium) return false;
      return true;
    });
  }, [policies, filters]);

  const clearFilters = () => setFilters({});
  const filterCount = Object.keys(filters).filter(key =>
    filters[key as keyof PolicyFilters] !== undefined
  ).length;

  // Apply sorting
  const { sortedData, sortConfig, setSortConfig, toggleSort, clearSort } =
    useSort<Policy>(filteredData, {
      initialSort: { field: 'createdAt', direction: 'desc' }
    });

  // Apply pagination
  const {
    paginatedData,
    pagination,
    goToPage,
    nextPage,
    previousPage,
    setPageSize
  } = usePagination<Policy>(sortedData, {
    initialPageSize: 10,
    pageSizeOptions: [10, 25, 50, 100]
  });

  return {
    // Data
    policies: sortedData,
    paginatedPolicies: paginatedData,

    // Loading states
    isLoading,
    error: error ? (error as Error).message : null,

    // Pagination
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    pageSize: pagination.pageSize,
    totalItems: pagination.totalItems,
    pageSizeOptions: [10, 25, 50, 100],
    goToPage,
    nextPage,
    previousPage,
    setPageSize,

    // Filtering
    filters,
    setFilters,
    clearFilters,
    filterCount,

    // Sorting
    sortConfig,
    setSortConfig,
    toggleSort,
    clearSort,

    // Refresh
    refresh: refetch,
  };
}
