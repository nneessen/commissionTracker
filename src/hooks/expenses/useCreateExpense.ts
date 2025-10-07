// src/hooks/expenses/useCreateExpense.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseService } from '../../services/expenses/expenseService';
import type { CreateExpenseData, Expense } from '../../types/expense.types';
import { toast } from 'sonner';

/**
 * Hook for creating a new expense with optimistic updates
 */
export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newExpense: CreateExpenseData): Promise<Expense> => {
      return await expenseService.create(newExpense);
    },
    onSuccess: () => {
      // Invalidate all expense-related queries
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-metrics'] });
      toast.success('Expense created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create expense: ${error.message}`);
    },
  });
};
