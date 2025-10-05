// src/hooks/expenses/useExpenses.ts

import { useQuery } from '@tanstack/react-query';
import { expenseService } from '../../services/expenses/expenseService';

export interface UseExpensesOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch all expenses using TanStack Query
 *
 * @param options Optional configuration for the query
 * @returns TanStack Query result with expenses data
 */
export const useExpenses = (options?: UseExpensesOptions) => {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      return await expenseService.getAll();
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    gcTime: options?.gcTime ?? 10 * 60 * 1000, // 10 minutes garbage collection
    enabled: options?.enabled ?? true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
