// src/hooks/expenses/useExpenseTemplates.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { expenseTemplateService } from "@/services/expenses/expenseTemplateService";
import type {
  ExpenseTemplate,
  CreateExpenseTemplateData,
  UpdateExpenseTemplateData,
} from "@/types/expense.types";

// Query keys
export const expenseTemplateKeys = {
  all: ["expense-templates"] as const,
  grouped: ["expense-templates", "grouped"] as const,
};

/**
 * Hook to fetch all expense templates for the current user
 */
export function useExpenseTemplates() {
  return useQuery({
    queryKey: expenseTemplateKeys.all,
    queryFn: async (): Promise<ExpenseTemplate[]> => {
      const result = await expenseTemplateService.getAll();
      if (!result.success) throw result.error;
      return result.data || [];
    },
  });
}

/**
 * Hook to fetch expense templates grouped by frequency
 */
export function useExpenseTemplatesGrouped() {
  return useQuery({
    queryKey: expenseTemplateKeys.grouped,
    queryFn: async (): Promise<Record<string, ExpenseTemplate[]>> => {
      const result = await expenseTemplateService.getGroupedByFrequency();
      if (!result.success) throw result.error;
      return result.data || {};
    },
  });
}

/**
 * Hook to create a new expense template
 */
export function useCreateExpenseTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExpenseTemplateData) => {
      const result = await expenseTemplateService.create(data);
      if (!result.success) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseTemplateKeys.all });
      queryClient.invalidateQueries({ queryKey: expenseTemplateKeys.grouped });
      toast.success("Template created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });
}

/**
 * Hook to update an existing expense template
 */
export function useUpdateExpenseTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateExpenseTemplateData;
    }) => {
      const result = await expenseTemplateService.update(id, updates);
      if (!result.success) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseTemplateKeys.all });
      queryClient.invalidateQueries({ queryKey: expenseTemplateKeys.grouped });
      toast.success("Template updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });
}

/**
 * Hook to delete an expense template
 */
export function useDeleteExpenseTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await expenseTemplateService.delete(id);
      if (!result.success) throw result.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseTemplateKeys.all });
      queryClient.invalidateQueries({ queryKey: expenseTemplateKeys.grouped });
      toast.success("Template deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });
}
