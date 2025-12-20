// src/hooks/expenses/useExpenseCategories.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { expenseCategoryService } from "@/services/expenses/categories";
import type {
  ExpenseCategory,
  CreateExpenseCategoryData,
  UpdateExpenseCategoryData,
} from "@/types/expense.types";

// Query keys
export const expenseCategoryKeys = {
  all: ["expense-categories"] as const,
  allIncludingInactive: ["expense-categories", "all"] as const,
};

/**
 * Hook to fetch active expense categories
 */
export function useExpenseCategories() {
  return useQuery({
    queryKey: expenseCategoryKeys.all,
    queryFn: async (): Promise<ExpenseCategory[]> => {
      const result = await expenseCategoryService.getAll();
      if (!result.success) throw result.error;
      return result.data || [];
    },
  });
}

/**
 * Hook to fetch all expense categories including inactive
 */
export function useAllExpenseCategories() {
  return useQuery({
    queryKey: expenseCategoryKeys.allIncludingInactive,
    queryFn: async (): Promise<ExpenseCategory[]> => {
      const result = await expenseCategoryService.getAllIncludingInactive();
      if (!result.success) throw result.error;
      return result.data || [];
    },
  });
}

/**
 * Hook to create a new expense category
 */
export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExpenseCategoryData) => {
      const result = await expenseCategoryService.create(data);
      if (!result.success) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseCategoryKeys.all });
      queryClient.invalidateQueries({
        queryKey: expenseCategoryKeys.allIncludingInactive,
      });
      toast.success("Category created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });
}

/**
 * Hook to update an expense category
 */
export function useUpdateExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateExpenseCategoryData;
    }) => {
      const result = await expenseCategoryService.update(id, updates);
      if (!result.success) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseCategoryKeys.all });
      queryClient.invalidateQueries({
        queryKey: expenseCategoryKeys.allIncludingInactive,
      });
      toast.success("Category updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });
}

/**
 * Hook to delete (soft delete) an expense category
 */
export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await expenseCategoryService.delete(id);
      if (!result.success) throw result.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseCategoryKeys.all });
      queryClient.invalidateQueries({
        queryKey: expenseCategoryKeys.allIncludingInactive,
      });
      toast.success("Category deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });
}

/**
 * Hook to reorder expense categories
 */
export function useReorderExpenseCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryIds: string[]) => {
      const result = await expenseCategoryService.reorder(categoryIds);
      if (!result.success) throw result.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseCategoryKeys.all });
      queryClient.invalidateQueries({
        queryKey: expenseCategoryKeys.allIncludingInactive,
      });
      toast.success("Categories reordered successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder categories: ${error.message}`);
    },
  });
}
