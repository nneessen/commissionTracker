// src/hooks/expenses/useExpense.ts
import { useState, useEffect } from 'react';
import { ExpenseItem, ExpenseData, ExpenseCategory } from '../../types/expense.types';
import { useLocalStorageState } from '../base/useLocalStorageState';

const EXPENSES_STORAGE_KEY = 'expenses';

const DEFAULT_EXPENSES: ExpenseData = {
  personal: [],
  business: [],
  debt: [],
};

export interface UseExpenseResult {
  expense: ExpenseItem | null;
  category: ExpenseCategory | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useExpense(id: string): UseExpenseResult {
  const [expenseData] = useLocalStorageState<ExpenseData>(EXPENSES_STORAGE_KEY, DEFAULT_EXPENSES);
  const [expense, setExpense] = useState<ExpenseItem | null>(null);
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Search through all categories
    let found: ExpenseItem | null = null;
    let foundCategory: ExpenseCategory | null = null;

    const categories: ExpenseCategory[] = ['personal', 'business', 'debt'];
    for (const cat of categories) {
      const item = expenseData[cat].find(e => e.id === id);
      if (item) {
        found = {
          ...item,
          category: cat,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
        };
        foundCategory = cat;
        break;
      }
    }

    if (found) {
      setExpense(found);
      setCategory(foundCategory);
    } else {
      setExpense(null);
      setCategory(null);
      setError('Expense not found');
    }

    setIsLoading(false);
  }, [id, expenseData, refreshKey]);

  const refresh = () => setRefreshKey(key => key + 1);

  return {
    expense,
    category,
    isLoading,
    error,
    refresh,
  };
}