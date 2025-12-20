// src/hooks/expenses/useExpenses.ts

import { useQuery } from "@tanstack/react-query";
import { expenseService } from "@/services/expenses";
import type { Expense, ExpenseFilters } from "@/types/expense.types";

export interface UseExpensesOptions {
  filters?: ExpenseFilters;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

export interface UseExpensesResult {
  expenses: Expense[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch all expenses with optional filtering using TanStack Query
 *
 * @param options Optional configuration for the query including filters
 * @returns TanStack Query result with expenses data
 */
export const useExpenses = (options?: UseExpensesOptions) => {
  return useQuery({
    queryKey: ["expenses", options?.filters],
    queryFn: async () => {
      const result = await expenseService.getAll(options?.filters);
      if (!result.success) {
        throw result.error;
      }
      return result.data || [];
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    gcTime: options?.gcTime ?? 10 * 60 * 1000, // 10 minutes garbage collection
    enabled: options?.enabled ?? true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
