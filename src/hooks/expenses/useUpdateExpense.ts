// src/hooks/expenses/useUpdateExpense.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { expenseService } from "@/services/expenses";
import type { UpdateExpenseData, Expense } from "@/types/expense.types";
import { toast } from "sonner";

/**
 * Hook for updating an existing expense
 */
export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateExpenseData;
    }): Promise<Expense> => {
      const result = await expenseService.update(id, updates);
      if (!result.success) {
        throw result.error;
      }
      return result.data!;
    },
    onSuccess: () => {
      // Invalidate all expense-related queries
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-metrics"] });
      toast.success("Expense updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update expense: ${error.message}`);
    },
  });
};
