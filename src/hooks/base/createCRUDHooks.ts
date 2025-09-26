// /home/nneessen/projects/commissionTracker/src/hooks/base/createCRUDHooks.ts

import { useState, useEffect } from 'react';
import { useLocalStorageState } from './useLocalStorageState';
import { usePagination } from './usePagination';
import { useFilter } from './useFilter';
import { useSort } from './useSort';
import type { FilterConfig } from './useFilter';
import type { SortConfig, MultiSortConfig } from './useSort';

export interface CRUDHookConfig<TEntity, TForm> {
  storageKey: string;
  entityName: string;
  generateId?: () => string;
  validateForm: (form: TForm) => TEntity | { error: string };
  defaultSort?: SortConfig<TEntity>;
  defaultPageSize?: number;
}

export interface UseListResult<TEntity> {
  // Data
  items: TEntity[];
  paginatedItems: TEntity[];
  isLoading: boolean;

  // Pagination
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;

  // Filtering
  filters: FilterConfig<TEntity> | null;
  setFilters: (filters: FilterConfig<TEntity> | null) => void;
  clearFilters: () => void;
  filterCount: number;

  // Sorting
  sortConfig: SortConfig<TEntity> | MultiSortConfig<TEntity> | null;
  setSortConfig: (config: SortConfig<TEntity> | MultiSortConfig<TEntity> | null) => void;
  toggleSort: (field: keyof TEntity) => void;
}

export interface UseCreateResult<TEntity, TForm> {
  create: (form: TForm) => TEntity | null;
  isCreating: boolean;
  error: string | null;
}

export interface UseUpdateResult<TEntity> {
  update: (id: string, updates: Partial<TEntity>) => void;
  isUpdating: boolean;
  error: string | null;
}

export interface UseDeleteResult {
  deleteItem: (id: string) => void;
  isDeleting: boolean;
  error: string | null;
}

export interface UseGetResult<TEntity> {
  getById: (id: string) => TEntity | undefined;
  getByField: (field: keyof TEntity, value: any) => TEntity[];
  exists: (id: string) => boolean;
}

/**
 * Factory function to create entity-specific CRUD hooks
 */
export function createCRUDHooks<TEntity extends { id: string }, TForm>(
  config: CRUDHookConfig<TEntity, TForm>
) {
  const {
    storageKey,
    entityName,
    generateId = () => `${entityName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    validateForm,
    defaultSort = undefined,
    defaultPageSize = 10
  } = config;

  /**
   * Hook for listing entities with pagination, filtering, and sorting
   */
  function useList(): UseListResult<TEntity> {
    const [items, setItems] = useLocalStorageState<TEntity[]>(storageKey, []);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize loading state
    useEffect(() => {
      setIsLoading(false);
    }, []);

    // Apply filtering
    const filterResult = useFilter(items);
    const { filteredData, filters, setFilters, clearFilters, filterCount } = filterResult;

    // Apply sorting
    const sortResult = useSort(filteredData, { initialSort: defaultSort });
    const { sortedData, sortConfig, setSortConfig, toggleSort } = sortResult;

    // Apply pagination
    const paginationResult = usePagination(sortedData, {
      initialPageSize: defaultPageSize,
      pageSizeOptions: [10, 25, 50, 100]
    });
    const {
      paginatedData,
      pagination,
      goToPage,
      nextPage,
      previousPage,
      setPageSize
    } = paginationResult;

    return {
      items: sortedData,
      paginatedItems: paginatedData,
      isLoading,
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize,
      totalPages: pagination.totalPages,
      totalItems: pagination.totalItems,
      goToPage,
      nextPage,
      previousPage,
      setPageSize,
      filters,
      setFilters,
      clearFilters,
      filterCount,
      sortConfig,
      setSortConfig,
      toggleSort
    };
  }

  /**
   * Hook for creating new entities
   */
  function useCreate(): UseCreateResult<TEntity, TForm> {
    const [items, setItems] = useLocalStorageState<TEntity[]>(storageKey, []);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const create = (form: TForm): TEntity | null => {
      setIsCreating(true);
      setError(null);

      try {
        const validationResult = validateForm(form);

        if ('error' in validationResult) {
          setError(validationResult.error);
          setIsCreating(false);
          return null;
        }

        const newEntity: TEntity = {
          ...validationResult,
          id: generateId()
        };

        setItems(prevItems => [...prevItems, newEntity]);
        setIsCreating(false);
        return newEntity;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create entity');
        setIsCreating(false);
        return null;
      }
    };

    return {
      create,
      isCreating,
      error
    };
  }

  /**
   * Hook for updating existing entities
   */
  function useUpdate(): UseUpdateResult<TEntity> {
    const [items, setItems] = useLocalStorageState<TEntity[]>(storageKey, []);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const update = (id: string, updates: Partial<TEntity>) => {
      setIsUpdating(true);
      setError(null);

      try {
        setItems(prevItems =>
          prevItems.map(item =>
            item.id === id
              ? { ...item, ...updates, id } // Ensure ID cannot be changed
              : item
          )
        );
        setIsUpdating(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update entity');
        setIsUpdating(false);
      }
    };

    return {
      update,
      isUpdating,
      error
    };
  }

  /**
   * Hook for deleting entities
   */
  function useDelete(): UseDeleteResult {
    const [items, setItems] = useLocalStorageState<TEntity[]>(storageKey, []);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deleteItem = (id: string) => {
      setIsDeleting(true);
      setError(null);

      try {
        setItems(prevItems => prevItems.filter(item => item.id !== id));
        setIsDeleting(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete entity');
        setIsDeleting(false);
      }
    };

    return {
      deleteItem,
      isDeleting,
      error
    };
  }

  /**
   * Hook for getting specific entities
   */
  function useGet(): UseGetResult<TEntity> {
    const [items] = useLocalStorageState<TEntity[]>(storageKey, []);

    const getById = (id: string): TEntity | undefined => {
      return items.find(item => item.id === id);
    };

    const getByField = (field: keyof TEntity, value: any): TEntity[] => {
      return items.filter(item => item[field] === value);
    };

    const exists = (id: string): boolean => {
      return items.some(item => item.id === id);
    };

    return {
      getById,
      getByField,
      exists
    };
  }

  return {
    [`use${entityName}List`]: useList,
    [`useCreate${entityName}`]: useCreate,
    [`useUpdate${entityName}`]: useUpdate,
    [`useDelete${entityName}`]: useDelete,
    [`useGet${entityName}`]: useGet
  };
}