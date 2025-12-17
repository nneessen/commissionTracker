// src/hooks/base/useTableData.ts

import { useFilter, FilterConfig } from "./useFilter";
import { useSort, SortConfig, SortDirection } from "./useSort";
import { usePagination } from "./usePagination";

export interface UseTableDataOptions<T> {
  // Filter options
  initialFilters?: FilterConfig<T> | null;

  // Sort options
  initialSort?: SortConfig<T>;
  multiSort?: boolean;

  // Pagination options
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

export interface UseTableDataResult<T> {
  // Data at each stage of processing
  filteredData: T[];
  sortedData: T[];
  paginatedData: T[];

  // Filter state and controls
  filters: FilterConfig<T> | null;
  setFilters: (filters: FilterConfig<T> | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic filter type
  addFilter: (filter: any) => void;
  removeFilter: (field: keyof T) => void;
  clearFilters: () => void;
  filterCount: number;

  // Sort state and controls
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic sort type
  sortConfig: SortConfig<T> | any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic sort type
  setSortConfig: (config: SortConfig<T> | any | null) => void;
  toggleSort: (field: keyof T) => void;
  clearSort: () => void;

  // Pagination state and controls
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  resetPagination: () => void;
}

/**
 * Generic composable hook that combines filtering, sorting, and pagination
 * Works with any entity type T
 *
 * @param data - The full dataset to process
 * @param options - Configuration options for filter, sort, and pagination
 * @returns All filter, sort, and pagination state and controls
 *
 * @example
 * ```typescript
 * const { data: commissions } = useCommissions();
 * const table = useTableData(commissions ?? [], {
 *   initialSort: { field: 'createdAt', direction: 'desc' },
 *   initialPageSize: 10
 * });
 * ```
 */
export function useTableData<T>(
  data: T[],
  options: UseTableDataOptions<T> = {},
): UseTableDataResult<T> {
  const {
    initialFilters = null,
    initialSort = {
      field: "createdAt" as keyof T,
      direction: "desc" as SortDirection,
    },
    multiSort = false,
    initialPage = 1,
    initialPageSize = 10,
    pageSizeOptions = [10, 25, 50, 100],
  } = options;

  // Apply filtering
  const {
    filteredData,
    filters,
    setFilters,
    addFilter,
    removeFilter,
    clearFilters,
    filterCount,
  } = useFilter<T>(data, initialFilters);

  // Apply sorting
  const { sortedData, sortConfig, setSortConfig, toggleSort, clearSort } =
    useSort<T>(filteredData, {
      initialSort,
      multiSort,
    });

  // Apply pagination
  const {
    paginatedData,
    pagination,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    resetPagination,
  } = usePagination<T>(sortedData, {
    initialPage,
    initialPageSize,
    pageSizeOptions,
  });

  return {
    // Data at each stage
    filteredData,
    sortedData,
    paginatedData,

    // Filter controls
    filters,
    setFilters,
    addFilter,
    removeFilter,
    clearFilters,
    filterCount,

    // Sort controls
    sortConfig,
    setSortConfig,
    toggleSort,
    clearSort,

    // Pagination controls
    currentPage: pagination.currentPage,
    pageSize: pagination.pageSize,
    totalPages: pagination.totalPages,
    totalItems: pagination.totalItems,
    startIndex: pagination.startIndex,
    endIndex: pagination.endIndex,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    resetPagination,
  };
}
