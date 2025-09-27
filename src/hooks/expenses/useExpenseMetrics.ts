// src/hooks/expenses/useExpenseMetrics.ts
import { useState, useEffect } from 'react';
import { ExpenseCategory } from '../../types/expense.types';
import { expenseService } from '../../services';

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

export interface UseExpenseMetricsResult {
  metrics: ExpenseMetrics | null;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  refresh: () => void;
}

export function useExpenseMetrics(): UseExpenseMetricsResult {
  const [metrics, setMetrics] = useState<ExpenseMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setIsLoading(true);
        setError(null);

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

        setMetrics(metricsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load expense metrics');
        console.error('Error loading expense metrics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMetrics();
  }, [refreshKey]);

  const clearError = () => setError(null);
  const refresh = () => setRefreshKey(key => key + 1);

  return {
    metrics,
    isLoading,
    error,
    clearError,
    refresh,
  };
}