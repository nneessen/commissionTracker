// src/hooks/expenses/useCreateExpense.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { expenseService } from "@/services/expenses";
import type { CreateExpenseData, Expense } from "@/types/expense.types";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook for creating a new expense with optimistic updates
 */
export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (newExpense: CreateExpenseData): Promise<Expense> => {
      if (!user?.id) {
        throw new Error("User must be authenticated to create expenses");
      }

      const result = await expenseService.create(newExpense, user.id);
      if (!result.success) {
        throw result.error;
      }

      // Display warnings if any (e.g., recurring expense generation partial failures)
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach((warning) => {
          toast.warning(warning);
        });
      }

      return result.data!;
    },
    onSuccess: (_data, variables) => {
      // Invalidate all expense-related queries
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-metrics"] });

      // Show appropriate success message
      if (variables.is_recurring && variables.recurring_frequency) {
        toast.success(
          `✓ Expense created! Auto-generated next 12 ${variables.recurring_frequency} occurrences.`,
        );
      } else {
        toast.success("Expense created successfully");
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to create expense: ${error.message}`);
    },
  });
};
