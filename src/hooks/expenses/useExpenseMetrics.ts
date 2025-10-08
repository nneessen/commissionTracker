// src/hooks/expenses/useExpenseMetrics.ts

import { useQuery } from '@tanstack/react-query';
import { expenseService } from '../../services/expenses/expenseService';
import type { ExpenseTotals, ExpenseFilters } from '../../types/expense.types';

export interface UseExpenseMetricsOptions {
  filters?: ExpenseFilters;
  enabled?: boolean;
  staleTime?: number;
}

export interface UseExpenseMetricsResult {
  totals: ExpenseTotals | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch expense totals and metrics using TanStack Query
 *
 * @param options Optional configuration for the query
 * @returns TanStack Query result with expense totals
 */
export const useExpenseMetrics = (options?: UseExpenseMetricsOptions) => {
  return useQuery({
    queryKey: ['expense-metrics', options?.filters],
    queryFn: async () => {
      return await expenseService.getTotals(options?.filters);
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    enabled: options?.enabled ?? true,
    retry: 3,
  });
}
