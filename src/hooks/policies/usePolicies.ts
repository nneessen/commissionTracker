// /home/nneessen/projects/commissionTracker/src/hooks/policies/usePolicies.ts

import { useState, useEffect } from 'react';
import { Policy, PolicyFilters } from '../../types';
import { policyService } from '../../services';
import { usePagination } from '../base/usePagination';
import { useSort } from '../base/useSort';


export interface UsePoliciesResult {
  // Data
  policies: Policy[];
  paginatedPolicies: Policy[];
  isLoading: boolean;
  error: string | null;

  // Pagination
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  pageSizeOptions: number[];
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;

  // Filtering
  filters: PolicyFilters;
  setFilters: (filters: PolicyFilters) => void;
  clearFilters: () => void;
  filterCount: number;

  // Sorting
  sortConfig: any;
  setSortConfig: (config: any) => void;
  toggleSort: (field: keyof Policy) => void;
  clearSort: () => void;

  // Refresh
  refresh: () => void;
}

/**
 * Hook for managing a list of policies with pagination, filtering, and sorting
 * Follows React 19.1 best practices - no useCallback or useMemo needed
 */
export function usePolicies(): UsePoliciesResult {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load policies from database
  useEffect(() => {
    const loadPolicies = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await policyService.getAll();
        setPolicies(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load policies');
        console.error('Error loading policies:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPolicies();
  }, [refreshKey]);

  // Apply filtering using a simpler approach for complex filters
  const [customFilters, setCustomFilters] = useState<PolicyFilters>({});

  const filteredData = policies.filter(policy => {
    const f = customFilters;
    if (f.startDate && new Date(policy.createdAt) < f.startDate) return false;
    if (f.endDate && new Date(policy.createdAt) > f.endDate) return false;
    if (f.carrierId && policy.carrierId !== f.carrierId) return false;
    if (f.product && policy.product !== f.product) return false;
    if (f.status && policy.status !== f.status) return false;
    if (f.minPremium && policy.annualPremium < f.minPremium) return false;
    if (f.maxPremium && policy.annualPremium > f.maxPremium) return false;
    return true;
  });

  const clearFilters = () => setCustomFilters({});
  const filterCount = Object.keys(customFilters).filter(key =>
    customFilters[key as keyof PolicyFilters] !== undefined
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

  const pageSizeOptions = [10, 25, 50, 100];

  const refresh = () => setRefreshKey(key => key + 1);

  return {
    policies: sortedData,
    paginatedPolicies: paginatedData,
    isLoading,
    error,

    // Pagination
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    pageSize: pagination.pageSize,
    totalItems: pagination.totalItems,
    pageSizeOptions,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,

    // Filtering
    filters: customFilters,
    setFilters: setCustomFilters,
    clearFilters,
    filterCount,

    // Sorting
    sortConfig,
    setSortConfig,
    toggleSort,
    clearSort,

    // Refresh
    refresh,
  };
}