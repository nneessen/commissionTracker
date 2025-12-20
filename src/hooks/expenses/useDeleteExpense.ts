// src/hooks/expenses/useDeleteExpense.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { expenseService } from "@/services/expenses";
import { toast } from "sonner";

/**
 * Hook for deleting an expense
 */
export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const result = await expenseService.delete(id);
      if (!result.success) {
        throw result.error;
      }
    },
    onSuccess: () => {
      // Invalidate all expense-related queries
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-metrics"] });
      toast.success("Expense deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete expense: ${error.message}`);
    },
  });
};
