// src/hooks/expenses/useExpenseMetrics.ts

import { useQuery } from '@tanstack/react-query';
import { expenseService } from '../../services';
import { ExpenseCategory } from '../../types/expense.types';

export interface ExpenseMetrics {
  totalByCategory: Record<ExpenseCategory, number>;
  monthlyTotal: number;
  personalTotal: number;
  businessTotal: number;
  averageExpense: number;
  expenseCount: number;
  topCategories: Array<{
    category: ExpenseCategory;
    amount: number;
    percentage: number;
  }>;
}

export interface UseExpenseMetricsOptions {
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Fetch and calculate expense metrics using TanStack Query
 *
 * @param options Optional configuration for the query
 * @returns TanStack Query result with expense metrics
 */
export function useExpenseMetrics(options?: UseExpenseMetricsOptions) {
  return useQuery({
    queryKey: ['expense-metrics'],
    queryFn: async () => {
      // Get all expenses and category totals
      const [expenses, totalByCategory] = await Promise.all([
        expenseService.getAll(),
        expenseService.getTotalByCategory()
      ]);

      // Calculate metrics
      const personalTotal = totalByCategory.personal || 0;
      const businessTotal = totalByCategory.business || 0;
      const monthlyTotal = personalTotal + businessTotal;
      const expenseCount = expenses.length;
      const averageExpense = expenseCount > 0 ? monthlyTotal / expenseCount : 0;

      // Calculate top categories
      const topCategories = Object.entries(totalByCategory)
        .map(([category, amount]) => ({
          category: category as ExpenseCategory,
          amount,
          percentage: monthlyTotal > 0 ? (amount / monthlyTotal) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount);

      const metricsData: ExpenseMetrics = {
        totalByCategory,
        monthlyTotal,
        personalTotal,
        businessTotal,
        averageExpense,
        expenseCount,
        topCategories,
      };

      return metricsData;
    },
    staleTime: options?.staleTime ?? 2 * 60 * 1000, // 2 minutes default
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    enabled: options?.enabled ?? true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
