// /home/nneessen/projects/commissionTracker/src/hooks/base/useFilter.ts

import { useState } from 'react';

export type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'endsWith' |
  'greaterThan' | 'lessThan' | 'between' | 'in' | 'notIn';

export interface Filter<T> {
  field: keyof T;
  operator: FilterOperator;
  value: string | number | boolean | string[] | number[] | null | Date;
  caseSensitive?: boolean;
}

export interface FilterGroup<T> {
  operator: 'and' | 'or';
  filters: (Filter<T> | FilterGroup<T>)[];
}

export type FilterConfig<T> = Filter<T> | FilterGroup<T>;

export interface UseFilterResult<T> {
  filteredData: T[];
  filters: FilterConfig<T> | null;
  setFilters: (filters: FilterConfig<T> | null) => void;
  addFilter: (filter: Filter<T>) => void;
  removeFilter: (field: keyof T) => void;
  clearFilters: () => void;
  filterCount: number;
}

/**
 * Apply a single filter to a value
 */
function applyFilter<T>(item: T, filter: Filter<T>): boolean {
  const fieldValue = item[filter.field] as any;
  const filterValue = filter.value;
  const caseSensitive = filter.caseSensitive ?? false;

  // Handle null/undefined values
  if (fieldValue === null || fieldValue === undefined) {
    return filter.operator === 'equals' && filterValue === fieldValue;
  }

  // Convert to string for string operations
  const fieldStr = caseSensitive ? String(fieldValue) : String(fieldValue).toLowerCase();
  const filterStr = caseSensitive ? String(filterValue) : String(filterValue).toLowerCase();

  switch (filter.operator) {
    case 'equals':
      return fieldValue === filterValue;

    case 'contains':
      return fieldStr.includes(filterStr);

    case 'startsWith':
      return fieldStr.startsWith(filterStr);

    case 'endsWith':
      return fieldStr.endsWith(filterStr);

    case 'greaterThan':
      return filterValue !== null && fieldValue > filterValue;

    case 'lessThan':
      return filterValue !== null && fieldValue < filterValue;

    case 'between':
      if (Array.isArray(filterValue) && filterValue.length === 2) {
        return fieldValue >= filterValue[0] && fieldValue <= filterValue[1];
      }
      return false;

    case 'in':
      return Array.isArray(filterValue) && (filterValue as unknown[]).includes(fieldValue);

    case 'notIn':
      return Array.isArray(filterValue) && !(filterValue as unknown[]).includes(fieldValue);

    default:
      return true;
  }
}

/**
 * Apply a filter configuration to an item
 */
function applyFilterConfig<T>(item: T, config: FilterConfig<T>): boolean {
  if ('field' in config) {
    // Single filter
    return applyFilter(item, config);
  } else {
    // Filter group
    const results = config.filters.map(f => applyFilterConfig(item, f));
    return config.operator === 'and'
      ? results.every(Boolean)
      : results.some(Boolean);
  }
}

/**
 * Count the number of active filters
 */
function countFilters<T>(config: FilterConfig<T> | null): number {
  if (!config) return 0;

  if ('field' in config) {
    return 1;
  } else {
    return config.filters.reduce((count, f) => count + countFilters(f), 0);
  }
}

/**
 * Custom hook for filtering data
 * @param data - The dataset to filter
 * @param initialFilters - Optional initial filter configuration
 * @returns Filtered data and filter control functions
 */
export function useFilter<T>(
  data: T[],
  initialFilters: FilterConfig<T> | null = null
): UseFilterResult<T> {
  const [filters, setFilters] = useState<FilterConfig<T> | null>(initialFilters);

  const filteredData = filters
    ? data.filter(item => applyFilterConfig(item, filters))
    : data;

  const addFilter = (newFilter: Filter<T>) => {
    if (!filters) {
      setFilters(newFilter);
    } else if ('field' in filters) {
      // Convert single filter to group
      setFilters({
        operator: 'and',
        filters: [filters, newFilter]
      });
    } else {
      // Add to existing group
      setFilters({
        ...filters,
        filters: [...filters.filters, newFilter]
      });
    }
  };

  const removeFilter = (field: keyof T) => {
    if (!filters) return;

    const removeFromConfig = (config: FilterConfig<T>): FilterConfig<T> | null => {
      if ('field' in config) {
        return config.field === field ? null : config;
      } else {
        const updatedFilters = config.filters
          .map(f => removeFromConfig(f))
          .filter(Boolean) as FilterConfig<T>[];

        if (updatedFilters.length === 0) return null;
        if (updatedFilters.length === 1) return updatedFilters[0];

        return {
          ...config,
          filters: updatedFilters
        };
      }
    };

    setFilters(removeFromConfig(filters));
  };

  const clearFilters = () => {
    setFilters(null);
  };

  return {
    filteredData,
    filters,
    setFilters,
    addFilter,
    removeFilter,
    clearFilters,
    filterCount: countFilters(filters)
  };
}