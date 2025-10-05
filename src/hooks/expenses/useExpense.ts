// src/hooks/expenses/useExpense.ts

import { useQuery } from '@tanstack/react-query';
import { expenseService } from '../../services';

export interface UseExpenseOptions {
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Fetch a single expense by ID using TanStack Query
 *
 * @param id Expense ID
 * @param options Optional configuration for the query
 * @returns TanStack Query result with expense data
 */
export function useExpense(id: string, options?: UseExpenseOptions) {
  return useQuery({
    queryKey: ['expenses', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Expense ID is required');
      }
      return await expenseService.getById(id);
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    enabled: options?.enabled ?? !!id,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
