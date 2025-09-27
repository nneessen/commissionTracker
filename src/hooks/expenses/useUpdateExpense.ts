// src/hooks/expenses/useUpdateExpense.ts
import { useState } from 'react';
import { ExpenseItem } from '../../types/expense.types';
import { expenseService, CreateExpenseData } from '../../services';

export interface UseUpdateExpenseResult {
  updateExpense: (id: string, updates: Partial<CreateExpenseData>) => Promise<ExpenseItem | null>;
  isUpdating: boolean;
  error: string | null;
  clearError: () => void;
}

export function useUpdateExpense(): UseUpdateExpenseResult {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateExpense = async (id: string, updates: Partial<CreateExpenseData>): Promise<ExpenseItem | null> => {
    setIsUpdating(true);
    setError(null);

    try {
      // Update via service
      const updatedExpense = await expenseService.update(id, updates);
      setIsUpdating(false);
      return updatedExpense;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update expense';
      setError(errorMessage);
      setIsUpdating(false);
      return null;
    }
  };

  const clearError = () => setError(null);

  return {
    updateExpense,
    isUpdating,
    error,
    clearError,
  };
}