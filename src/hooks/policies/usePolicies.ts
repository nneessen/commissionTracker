// /home/nneessen/projects/commissionTracker/src/hooks/policies/usePolicies.ts

import { useState, useEffect } from 'react';
import { Policy } from '../../types';
import { useLocalStorageState } from '../base/useLocalStorageState';
import { usePagination } from '../base/usePagination';
import { useFilter, FilterConfig } from '../base/useFilter';
import { useSort } from '../base/useSort';

const STORAGE_KEY = 'policies';

export interface UsePoliciesResult {
  // Data
  policies: Policy[];
  paginatedPolicies: Policy[];
  isLoading: boolean;

  // Pagination
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalPolicies: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;

  // Filtering
  filters: FilterConfig<Policy> | null;
  setFilters: (filters: FilterConfig<Policy> | null) => void;
  clearFilters: () => void;
  filterCount: number;

  // Sorting
  sortField: keyof Policy | null;
  sortDirection: 'asc' | 'desc' | null;
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
  const [policies, setPolicies] = useLocalStorageState<Policy[]>(STORAGE_KEY, []);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Parse dates when loading from localStorage
  useEffect(() => {
    const parsedPolicies = policies.map(p => ({
      ...p,
      effectiveDate: new Date(p.effectiveDate),
      expirationDate: p.expirationDate ? new Date(p.expirationDate) : undefined,
      createdAt: new Date(p.createdAt),
      updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(p.createdAt)
    }));

    // Only update if dates needed parsing
    const needsParsing = policies.some(p =>
      typeof p.effectiveDate === 'string' ||
      (p.expirationDate && typeof p.expirationDate === 'string') ||
      typeof p.createdAt === 'string' ||
      (p.updatedAt && typeof p.updatedAt === 'string')
    );

    if (needsParsing) {
      setPolicies(parsedPolicies);
    }

    setIsLoading(false);
  }, [refreshKey]);

  // Apply filtering
  const {
    filteredData,
    filters,
    setFilters,
    clearFilters,
    filterCount
  } = useFilter<Policy>(policies);

  // Apply sorting
  const {
    sortedData,
    sortConfig,
    setSortConfig,
    toggleSort,
    clearSort
  } = useSort<Policy>(filteredData, {
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

  // Extract sort field and direction for easier access
  const sortField = sortConfig && 'field' in sortConfig ? sortConfig.field : null;
  const sortDirection = sortConfig && 'field' in sortConfig ? sortConfig.direction : null;

  // Force refresh function
  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return {
    policies: sortedData,
    paginatedPolicies: paginatedData,
    isLoading,
    currentPage: pagination.currentPage,
    pageSize: pagination.pageSize,
    totalPages: pagination.totalPages,
    totalPolicies: pagination.totalItems,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    filters,
    setFilters,
    clearFilters,
    filterCount,
    sortField,
    sortDirection,
    toggleSort,
    clearSort,
    refresh
  };
}