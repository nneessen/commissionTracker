// src/hooks/expenses/useExpense.ts

import { useQuery } from '@tanstack/react-query';
import { expenseService } from '../../services/expenses/expenseService';
import type { Expense } from '../../types/expense.types';

export interface UseExpenseOptions {
  enabled?: boolean;
  staleTime?: number;
}

export interface UseExpenseResult {
  expense: Expense | null | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch a single expense by ID using TanStack Query
 *
 * @param id The expense ID to fetch
 * @param options Optional configuration for the query
 * @returns TanStack Query result with expense data
 */
export const useExpense = (id: string, options?: UseExpenseOptions) => {
  return useQuery({
    queryKey: ['expenses', id],
    queryFn: async () => {
      return await expenseService.getById(id);
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    enabled: options?.enabled ?? true,
    retry: 3,
  });
};
