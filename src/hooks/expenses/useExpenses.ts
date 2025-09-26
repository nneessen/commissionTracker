// src/hooks/expenses/useExpenses.ts
import { useState, useEffect } from 'react';
import { ExpenseItem, ExpenseData, ExpenseCategory } from '../../types/expense.types';
import { useLocalStorageState } from '../base/useLocalStorageState';
import { useSort } from '../base/useSort';
import { usePagination } from '../base/usePagination';

const EXPENSES_STORAGE_KEY = 'expenses';

const DEFAULT_EXPENSES: ExpenseData = {
  personal: [],
  business: [],
  debt: [],
};

export interface ExpenseFilters {
  category?: ExpenseCategory;
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface UseExpensesResult {
  expenses: ExpenseItem[];
  paginatedExpenses: ExpenseItem[];
  expensesByCategory: ExpenseData;
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
  filters: ExpenseFilters;
  setFilters: (filters: ExpenseFilters) => void;
  clearFilters: () => void;
  filterCount: number;

  // Sorting
  sortConfig: any;
  setSortConfig: (config: any) => void;
  toggleSort: (field: keyof ExpenseItem) => void;
  clearSort: () => void;

  // Refresh
  refresh: () => void;
}

export function useExpenses(): UseExpensesResult {
  const [expenseData, setExpenseData] = useLocalStorageState<ExpenseData>(EXPENSES_STORAGE_KEY, DEFAULT_EXPENSES);
  const [allExpenses, setAllExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Flatten all expenses into a single array
  useEffect(() => {
    const flatExpenses: ExpenseItem[] = [
      ...expenseData.personal.map(e => ({ ...e, category: 'personal' as ExpenseCategory })),
      ...expenseData.business.map(e => ({ ...e, category: 'business' as ExpenseCategory })),
      ...expenseData.debt.map(e => ({ ...e, category: 'debt' as ExpenseCategory })),
    ];

    // Parse dates
    const parsedExpenses = flatExpenses.map(expense => ({
      ...expense,
      createdAt: expense.createdAt ? new Date(expense.createdAt) : new Date(),
      updatedAt: expense.updatedAt ? new Date(expense.updatedAt) : undefined,
    }));

    setAllExpenses(parsedExpenses);
    setIsLoading(false);
  }, [expenseData, refreshKey]);

  // Apply filtering using a simpler approach for complex filters
  const [customFilters, setCustomFilters] = useState<ExpenseFilters>({});

  const filteredData = allExpenses.filter(expense => {
    const f = customFilters;
    if (f.category && expense.category !== f.category) return false;
    if (f.minAmount !== undefined && expense.amount < f.minAmount) return false;
    if (f.maxAmount !== undefined && expense.amount > f.maxAmount) return false;
    if (f.searchTerm) {
      const term = f.searchTerm.toLowerCase();
      if (!expense.name.toLowerCase().includes(term)) return false;
    }
    if (f.startDate && expense.createdAt && new Date(expense.createdAt) < f.startDate) return false;
    if (f.endDate && expense.createdAt && new Date(expense.createdAt) > f.endDate) return false;
    return true;
  });

  const clearFilters = () => setCustomFilters({});
  const filterCount = Object.keys(customFilters).filter(key =>
    customFilters[key as keyof ExpenseFilters] !== undefined
  ).length;

  // Apply sorting
  const { sortedData, sortConfig, setSortConfig, toggleSort, clearSort } =
    useSort<ExpenseItem>(filteredData, {
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
  } = usePagination<ExpenseItem>(sortedData, {
    initialPageSize: 10,
    pageSizeOptions: [10, 25, 50, 100]
  });

  const pageSizeOptions = [10, 25, 50, 100];

  const refresh = () => setRefreshKey(key => key + 1);

  return {
    expenses: sortedData,
    paginatedExpenses: paginatedData,
    expensesByCategory: expenseData,
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