// src/hooks/expenses/useUpdateExpense.ts
import { useState } from 'react';
import { ExpenseItem, ExpenseData, ExpenseCategory } from '../../types/expense.types';
import { useLocalStorageState } from '../base/useLocalStorageState';

const EXPENSES_STORAGE_KEY = 'expenses';

const DEFAULT_EXPENSES: ExpenseData = {
  personal: [],
  business: [],
  debt: [],
};

export interface UseUpdateExpenseResult {
  updateExpense: (category: ExpenseCategory, id: string, updates: Partial<Omit<ExpenseItem, 'id' | 'category' | 'createdAt'>>) => boolean;
  isUpdating: boolean;
  error: string | null;
  clearError: () => void;
}

export function useUpdateExpense(): UseUpdateExpenseResult {
  const [expenseData, setExpenseData] = useLocalStorageState<ExpenseData>(EXPENSES_STORAGE_KEY, DEFAULT_EXPENSES);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateExpense = (
    category: ExpenseCategory,
    id: string,
    updates: Partial<Omit<ExpenseItem, 'id' | 'category' | 'createdAt'>>
  ): boolean => {
    setIsUpdating(true);
    setError(null);

    try {
      const categoryExpenses = expenseData[category];
      const expenseIndex = categoryExpenses.findIndex(e => e.id === id);

      if (expenseIndex === -1) {
        throw new Error('Expense not found');
      }

      // Check for duplicate name if name is being updated
      if (updates.name) {
        const trimmedName = updates.name.trim();
        const duplicate = categoryExpenses.find(
          e => e.id !== id && e.name.toLowerCase() === trimmedName.toLowerCase()
        );

        if (duplicate) {
          throw new Error(`An expense named "${trimmedName}" already exists in ${category} category`);
        }
      }

      // Update expense
      setExpenseData(prev => ({
        ...prev,
        [category]: prev[category].map(expense =>
          expense.id === id
            ? { ...expense, ...updates, updatedAt: new Date() }
            : expense
        ),
      }));

      setIsUpdating(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update expense';
      setError(errorMessage);
      setIsUpdating(false);
      return false;
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