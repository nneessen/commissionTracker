// src/hooks/commissions/useCommissions.ts
import { useState, useEffect } from 'react';
import { Commission, CommissionFilters } from '../../types/commission.types';
import { useLocalStorageState } from '../base/useLocalStorageState';
import { useSort } from '../base/useSort';
import { usePagination } from '../base/usePagination';

const COMMISSIONS_STORAGE_KEY = 'commissions';

export interface UseCommissionsResult {
  commissions: Commission[];
  paginatedCommissions: Commission[];
  isLoading: boolean;

  // Pagination
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions: number[];
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;

  // Filtering
  filters: CommissionFilters;
  setFilters: (filters: CommissionFilters) => void;
  clearFilters: () => void;
  filterCount: number;

  // Sorting
  sortConfig: any;
  setSortConfig: (config: any) => void;
  toggleSort: (field: keyof Commission) => void;
  clearSort: () => void;

  // Refresh
  refresh: () => void;
}

export function useCommissions(): UseCommissionsResult {
  const [commissions, setCommissions] = useLocalStorageState<Commission[]>(COMMISSIONS_STORAGE_KEY, []);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Parse dates when loading from localStorage
  useEffect(() => {
    const parsedCommissions = commissions.map((comm) => ({
      ...comm,
      expectedDate: comm.expectedDate ? new Date(comm.expectedDate) : undefined,
      actualDate: comm.actualDate ? new Date(comm.actualDate) : undefined,
      paidDate: comm.paidDate ? new Date(comm.paidDate) : undefined,
      createdAt: new Date(comm.createdAt),
      updatedAt: comm.updatedAt ? new Date(comm.updatedAt) : undefined,
    }));

    const needsUpdate = parsedCommissions.some((parsed, i) =>
      parsed.createdAt.getTime() !== new Date(commissions[i].createdAt).getTime()
    );

    if (needsUpdate) {
      setCommissions(parsedCommissions);
    }

    setIsLoading(false);
  }, [refreshKey]);

  // Apply filtering using a simpler approach for complex filters
  const [customFilters, setCustomFilters] = useState<CommissionFilters>({});

  const filteredData = commissions.filter(commission => {
    const f = customFilters;
    if (f.startDate && new Date(commission.createdAt) < f.startDate) return false;
    if (f.endDate && new Date(commission.createdAt) > f.endDate) return false;
    if (f.carrierId && commission.carrierId !== f.carrierId) return false;
    if (f.product && commission.product !== f.product) return false;
    if (f.state && commission.client.state !== f.state) return false;
    if (f.status && commission.status !== f.status) return false;
    if (f.type && commission.type !== f.type) return false;
    if (f.minPremium && commission.annualPremium < f.minPremium) return false;
    if (f.maxPremium && commission.annualPremium > f.maxPremium) return false;
    if (f.policyId && commission.policyId !== f.policyId) return false;
    return true;
  });

  const clearFilters = () => setCustomFilters({});
  const filterCount = Object.keys(customFilters).filter(key =>
    customFilters[key as keyof CommissionFilters] !== undefined
  ).length;

  // Apply sorting
  const { sortedData, sortConfig, setSortConfig, toggleSort, clearSort } =
    useSort<Commission>(filteredData, {
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
  } = usePagination<Commission>(sortedData, {
    initialPageSize: 10,
    pageSizeOptions: [10, 25, 50, 100]
  });

  const pageSizeOptions = [10, 25, 50, 100];

  const refresh = () => setRefreshKey(key => key + 1);

  return {
    commissions: sortedData,
    paginatedCommissions: paginatedData,
    isLoading,

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