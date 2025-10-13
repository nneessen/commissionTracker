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
    onSuccess: (_data, variables) => {
      // Invalidate all expense-related queries
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-metrics'] });

      // Show appropriate success message
      if (variables.is_recurring && variables.recurring_frequency) {
        toast.success(`✓ Expense created! Auto-generated next 12 ${variables.recurring_frequency} occurrences.`);
      } else {
        toast.success('Expense created successfully');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to create expense: ${error.message}`);
    },
  });
};
