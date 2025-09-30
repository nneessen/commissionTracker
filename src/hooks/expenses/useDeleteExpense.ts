// /home/nneessen/projects/commissionTracker/src/hooks/expenses/useDeleteExpense.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseService } from '../../services/expenses/expenseService';

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await expenseService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    }
  });
};