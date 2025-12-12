// /home/nneessen/projects/commissionTracker/src/hooks/base/usePagination.ts

import {useState} from 'react';

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
}

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

export interface UsePaginationResult<T> {
  paginatedData: T[];
  pagination: PaginationState;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  resetPagination: () => void;
}

/**
 * Custom hook for handling pagination logic
 * @param data - The full dataset to paginate
 * @param options - Pagination configuration options
 * @returns Pagination state and control functions
 */
export function usePagination<T>(
  data: T[],
  options: UsePaginationOptions = {}
): UsePaginationResult<T> {
  const {
    initialPage = 1,
    initialPageSize = 10,
    pageSizeOptions = [10, 25, 50, 100]
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Ensure current page is within bounds
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages || 1);

  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedData = data.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    const targetPage = Math.min(Math.max(1, page), totalPages || 1);
    setCurrentPage(targetPage);
  };

  const nextPage = () => {
    if (validCurrentPage < totalPages) {
      setCurrentPage(validCurrentPage + 1);
    }
  };

  const previousPage = () => {
    if (validCurrentPage > 1) {
      setCurrentPage(validCurrentPage - 1);
    }
  };

  const handleSetPageSize = (size: number) => {
    if (pageSizeOptions.includes(size)) {
      // Calculate which item should remain visible
      const firstItemIndex = startIndex;
      const newPage = Math.floor(firstItemIndex / size) + 1;

      setPageSize(size);
      setCurrentPage(newPage);
    }
  };

  const resetPagination = () => {
    setCurrentPage(initialPage);
    setPageSize(initialPageSize);
  };

  return {
    paginatedData,
    pagination: {
      currentPage: validCurrentPage,
      pageSize,
      totalItems,
      totalPages,
      startIndex,
      endIndex
    },
    goToPage,
    nextPage,
    previousPage,
    setPageSize: handleSetPageSize,
    resetPagination
  };
}