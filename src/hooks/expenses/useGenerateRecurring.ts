// src/hooks/expenses/useGenerateRecurring.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recurringExpenseService } from '../../services/expenses/recurringExpenseService';
import { toast } from 'sonner';

/**
 * Hook for generating recurring expenses
 */
export const useGenerateRecurringExpenses = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetMonth?: Date): Promise<number> => {
      const fromTemplates = await recurringExpenseService.generateFromTemplates(targetMonth);
      const fromExpenses = await recurringExpenseService.generateForMonth(targetMonth);
      return fromTemplates + fromExpenses;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-metrics'] });

      if (count === 0) {
        toast.info('No recurring expenses to generate - all up to date!');
      } else {
        toast.success(`✓ Generated ${count} recurring expense${count === 1 ? '' : 's'}!`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate recurring expenses: ${error.message}`);
    },
  });
};

/**
 * Hook for catching up missing recurring expenses
 */
export const useCatchUpRecurring = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (monthsBack: number = 3): Promise<number> => {
      return await recurringExpenseService.catchUpMissingExpenses(monthsBack);
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-metrics'] });

      if (count === 0) {
        toast.info('All recurring expenses are up to date!');
      } else {
        toast.success(`✓ Caught up! Generated ${count} recurring expense${count === 1 ? '' : 's'}.`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to catch up recurring expenses: ${error.message}`);
    },
  });
};
