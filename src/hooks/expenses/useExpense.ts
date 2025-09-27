// src/hooks/expenses/useExpense.ts
import { useState, useEffect } from 'react';
import { ExpenseItem } from '../../types/expense.types';
import { expenseService } from '../../services';

export interface UseExpenseResult {
  expense: ExpenseItem | null;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  refresh: () => void;
}

export function useExpense(id: string): UseExpenseResult {
  const [expense, setExpense] = useState<ExpenseItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadExpense = async () => {
      if (!id) {
        setExpense(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await expenseService.getById(id);
        setExpense(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load expense');
        console.error('Error loading expense:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadExpense();
  }, [id, refreshKey]);

  const clearError = () => setError(null);
  const refresh = () => setRefreshKey(key => key + 1);

  return {
    expense,
    isLoading,
    error,
    clearError,
    refresh,
  };
}