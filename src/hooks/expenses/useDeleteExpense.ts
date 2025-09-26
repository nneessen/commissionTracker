// src/hooks/expenses/useDeleteExpense.ts
import { useState } from 'react';
import { ExpenseData, ExpenseCategory } from '../../types/expense.types';
import { useLocalStorageState } from '../base/useLocalStorageState';

const EXPENSES_STORAGE_KEY = 'expenses';

const DEFAULT_EXPENSES: ExpenseData = {
  personal: [],
  business: [],
  debt: [],
};

export interface UseDeleteExpenseResult {
  deleteExpense: (category: ExpenseCategory, id: string) => boolean;
  deleteMultipleExpenses: (items: Array<{ category: ExpenseCategory; id: string }>) => number;
  isDeleting: boolean;
  error: string | null;
  clearError: () => void;
}

export function useDeleteExpense(): UseDeleteExpenseResult {
  const [expenseData, setExpenseData] = useLocalStorageState<ExpenseData>(EXPENSES_STORAGE_KEY, DEFAULT_EXPENSES);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteExpense = (category: ExpenseCategory, id: string): boolean => {
    setIsDeleting(true);
    setError(null);

    try {
      const exists = expenseData[category].some(e => e.id === id);

      if (!exists) {
        throw new Error('Expense not found');
      }

      setExpenseData(prev => ({
        ...prev,
        [category]: prev[category].filter(expense => expense.id !== id),
      }));

      setIsDeleting(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete expense';
      setError(errorMessage);
      setIsDeleting(false);
      return false;
    }
  };

  const deleteMultipleExpenses = (items: Array<{ category: ExpenseCategory; id: string }>): number => {
    setIsDeleting(true);
    setError(null);

    try {
      let deletedCount = 0;

      setExpenseData(prev => {
        const newData = { ...prev };

        items.forEach(({ category, id }) => {
          const index = newData[category].findIndex(e => e.id === id);
          if (index !== -1) {
            newData[category] = newData[category].filter(e => e.id !== id);
            deletedCount++;
          }
        });

        return newData;
      });

      if (deletedCount === 0) {
        setError('No expenses found to delete');
      }

      setIsDeleting(false);
      return deletedCount;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete expenses';
      setError(errorMessage);
      setIsDeleting(false);
      return 0;
    }
  };

  const clearError = () => setError(null);

  return {
    deleteExpense,
    deleteMultipleExpenses,
    isDeleting,
    error,
    clearError,
  };
}