// src/hooks/expenses/useCreateExpense.ts
import { useState } from 'react';
import { ExpenseItem, NewExpenseForm } from '../../types/expense.types';
import { expenseService, CreateExpenseData } from '../../services/expenseService';

export interface UseCreateExpenseResult {
  createExpense: (formData: NewExpenseForm) => Promise<ExpenseItem | null>;
  isCreating: boolean;
  error: string | null;
  clearError: () => void;
}

export function useCreateExpense(): UseCreateExpenseResult {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createExpense = async (formData: NewExpenseForm): Promise<ExpenseItem | null> => {
    setIsCreating(true);
    setError(null);

    try {
      // Create expense data
      const expenseData: CreateExpenseData = {
        name: formData.name.trim(),
        amount: formData.amount,
        category: formData.category,
      };

      // Create via service
      const newExpense = await expenseService.create(expenseData);
      setIsCreating(false);
      return newExpense;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create expense';
      setError(errorMessage);
      setIsCreating(false);
      return null;
    }
  };

  const clearError = () => setError(null);

  return {
    createExpense,
    isCreating,
    error,
    clearError,
  };
}