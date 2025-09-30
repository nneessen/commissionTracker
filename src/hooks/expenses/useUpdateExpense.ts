// /home/nneessen/projects/commissionTracker/src/hooks/expenses/useUpdateExpense.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseService, CreateExpenseData } from '../../services/expenses/expenseService';

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateExpenseData> }) => {
      return await expenseService.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    }
  });
};