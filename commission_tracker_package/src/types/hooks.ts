// src/types/hooks.ts
/**
 * Type-safe hook interfaces for filtering, sorting, and queries
 */

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T = Record<string, unknown>> {
  field: keyof T | string;
  direction: SortDirection;
}

export interface FilterConfig {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in';
  value: string | number | boolean | string[] | number[] | null;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
}

export interface QueryState<T> {
  data: T[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
