// /home/nneessen/projects/commissionTracker/src/hooks/expenses/useCreateExpense.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseService, CreateExpenseData } from '../../services/expenses/expenseService';

export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newExpense: CreateExpenseData) => {
      return await expenseService.create(newExpense);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    }
  });
};