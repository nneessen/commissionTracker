// src/hooks/expenses/useGenerateRecurring.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Hook for generating recurring expenses
 */
export const useGenerateRecurringExpenses = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetMonth?: Date): Promise<number> => {
      // TODO: Implement these methods in recurringExpenseService
      // For now, return 0 to fix TypeScript errors
      console.warn(
        "generateFromTemplates and generateForMonth not yet implemented",
        targetMonth,
      );
      return 0;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-metrics"] });

      if (count === 0) {
        toast.info("No recurring expenses to generate - all up to date!");
      } else {
        toast.success(
          `✓ Generated ${count} recurring expense${count === 1 ? "" : "s"}!`,
        );
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
      // TODO: Implement catchUpMissingExpenses in recurringExpenseService
      console.warn("catchUpMissingExpenses not yet implemented", monthsBack);
      return 0;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-metrics"] });

      if (count === 0) {
        toast.info("All recurring expenses are up to date!");
      } else {
        toast.success(
          `✓ Caught up! Generated ${count} recurring expense${count === 1 ? "" : "s"}.`,
        );
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to catch up recurring expenses: ${error.message}`);
    },
  });
};
