// src/hooks/expenses/useCreateExpense.ts
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ExpenseItem, ExpenseData, NewExpenseForm } from '../../types/expense.types';
import { useLocalStorageState } from '../base/useLocalStorageState';

const EXPENSES_STORAGE_KEY = 'expenses';

const DEFAULT_EXPENSES: ExpenseData = {
  personal: [],
  business: [],
  debt: [],
};

export interface UseCreateExpenseResult {
  createExpense: (formData: NewExpenseForm) => ExpenseItem | null;
  isCreating: boolean;
  error: string | null;
  clearError: () => void;
}

export function useCreateExpense(): UseCreateExpenseResult {
  const [expenseData, setExpenseData] = useLocalStorageState<ExpenseData>(EXPENSES_STORAGE_KEY, DEFAULT_EXPENSES);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createExpense = (formData: NewExpenseForm): ExpenseItem | null => {
    setIsCreating(true);
    setError(null);

    try {
      // Validate form data
      if (!formData.name || formData.name.trim() === '') {
        throw new Error('Expense name is required');
      }

      if (formData.amount <= 0) {
        throw new Error('Expense amount must be greater than 0');
      }

      if (!['personal', 'business', 'debt'].includes(formData.category)) {
        throw new Error('Invalid expense category');
      }

      // Check for duplicate name in the same category
      const categoryExpenses = expenseData[formData.category];
      const duplicate = categoryExpenses.find(
        e => e.name.toLowerCase() === formData.name.trim().toLowerCase()
      );

      if (duplicate) {
        throw new Error(`An expense named "${formData.name}" already exists in ${formData.category} category`);
      }

      // Create new expense
      const newExpense: ExpenseItem = {
        id: uuidv4(),
        name: formData.name.trim(),
        amount: formData.amount,
        category: formData.category,
        createdAt: new Date(),
      };

      // Add to the appropriate category
      setExpenseData(prev => ({
        ...prev,
        [formData.category]: [...prev[formData.category], newExpense],
      }));

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