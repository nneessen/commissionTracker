// src/hooks/expenses/useDeleteExpense.ts

import {useMutation, useQueryClient} from '@tanstack/react-query';
import {expenseService} from '../../services/expenses/expenseService';
import {toast} from 'sonner';

/**
 * Hook for deleting an expense
 */
export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return await expenseService.delete(id);
    },
    onSuccess: () => {
      // Invalidate all expense-related queries
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-metrics'] });
      toast.success('Expense deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete expense: ${error.message}`);
    },
  });
};