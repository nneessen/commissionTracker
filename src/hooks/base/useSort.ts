// /home/nneessen/projects/commissionTracker/src/hooks/base/useSort.ts

import { useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T> {
  field: keyof T;
  direction: SortDirection;
}

export interface MultiSortConfig<T> {
  sorts: SortConfig<T>[];
}

export interface UseSortOptions<T> {
  initialSort?: SortConfig<T> | MultiSortConfig<T>;
  multiSort?: boolean;
}

export interface UseSortResult<T> {
  sortedData: T[];
  sortConfig: SortConfig<T> | MultiSortConfig<T> | null;
  setSortConfig: (config: SortConfig<T> | MultiSortConfig<T> | null) => void;
  toggleSort: (field: keyof T) => void;
  clearSort: () => void;
}

/**
 * Compare two values for sorting
 */
function compareValues(a: any, b: any, direction: SortDirection): number {
  // Handle null/undefined values
  if (a === null || a === undefined) return direction === 'asc' ? 1 : -1;
  if (b === null || b === undefined) return direction === 'asc' ? -1 : 1;

  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    const diff = a.getTime() - b.getTime();
    return direction === 'asc' ? diff : -diff;
  }

  // Handle strings (case-insensitive)
  if (typeof a === 'string' && typeof b === 'string') {
    const comparison = a.toLowerCase().localeCompare(b.toLowerCase());
    return direction === 'asc' ? comparison : -comparison;
  }

  // Handle numbers and other primitives
  if (a < b) return direction === 'asc' ? -1 : 1;
  if (a > b) return direction === 'asc' ? 1 : -1;
  return 0;
}

/**
 * Sort data by a single field
 */
function sortByField<T>(data: T[], config: SortConfig<T>): T[] {
  return [...data].sort((a, b) => {
    const aValue = a[config.field];
    const bValue = b[config.field];
    return compareValues(aValue, bValue, config.direction);
  });
}

/**
 * Sort data by multiple fields
 */
function sortByMultipleFields<T>(data: T[], config: MultiSortConfig<T>): T[] {
  return [...data].sort((a, b) => {
    for (const sort of config.sorts) {
      const aValue = a[sort.field];
      const bValue = b[sort.field];
      const comparison = compareValues(aValue, bValue, sort.direction);

      if (comparison !== 0) {
        return comparison;
      }
    }
    return 0;
  });
}

/**
 * Custom hook for sorting data
 * @param data - The dataset to sort
 * @param options - Sorting configuration options
 * @returns Sorted data and sort control functions
 */
export function useSort<T>(
  data: T[],
  options: UseSortOptions<T> = {}
): UseSortResult<T> {
  const { initialSort = null, multiSort = false } = options;

  const [sortConfig, setSortConfig] = useState<SortConfig<T> | MultiSortConfig<T> | null>(
    initialSort
  );

  const sortedData = (() => {
    if (!sortConfig) {
      return data;
    }

    if ('sorts' in sortConfig) {
      return sortByMultipleFields(data, sortConfig);
    } else {
      return sortByField(data, sortConfig);
    }
  })();

  const toggleSort = (field: keyof T) => {
    if (!sortConfig) {
      // No current sort - add ascending sort
      setSortConfig({ field, direction: 'asc' });
      return;
    }

    if (multiSort && 'sorts' in sortConfig) {
      // Multi-sort mode
      const existingIndex = sortConfig.sorts.findIndex(s => s.field === field);

      if (existingIndex !== -1) {
        // Field is already being sorted
        const existingSort = sortConfig.sorts[existingIndex];
        if (existingSort.direction === 'asc') {
          // Change to descending
          const newSorts = [...sortConfig.sorts];
          newSorts[existingIndex] = { field, direction: 'desc' };
          setSortConfig({ sorts: newSorts });
        } else {
          // Remove this sort
          const newSorts = sortConfig.sorts.filter((_, i) => i !== existingIndex);
          if (newSorts.length === 0) {
            setSortConfig(null);
          } else {
            setSortConfig({ sorts: newSorts });
          }
        }
      } else {
        // Add new sort field
        setSortConfig({
          sorts: [...sortConfig.sorts, { field, direction: 'asc' }]
        });
      }
    } else if ('sorts' in sortConfig) {
      // Single sort mode but current config is multi-sort
      setSortConfig({ field, direction: 'asc' });
    } else {
      // Single sort mode
      if (sortConfig.field === field) {
        if (sortConfig.direction === 'asc') {
          setSortConfig({ field, direction: 'desc' });
        } else {
          setSortConfig(null);
        }
      } else {
        setSortConfig({ field, direction: 'asc' });
      }
    }
  };

  const clearSort = () => {
    setSortConfig(null);
  };

  return {
    sortedData,
    sortConfig,
    setSortConfig,
    toggleSort,
    clearSort
  };
}