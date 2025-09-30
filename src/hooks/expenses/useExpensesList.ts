// /home/nneessen/projects/commissionTracker/src/hooks/expenses/useExpensesList.ts

import { useQuery } from '@tanstack/react-query';
import { expenseService } from '../../services/expenses/expenseService';

export const useExpensesList = () => {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      return await expenseService.getAll();
    }
  });
};