// src/hooks/expenses/useExpenseCategories.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getExpenseCategories,
  getAllExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  reorderExpenseCategories,
} from '@/services/expenses/expenseCategoryService';
import type {
  ExpenseCategory,
  CreateExpenseCategoryData,
  UpdateExpenseCategoryData,
} from '@/types/expense.types';

// Query keys
export const expenseCategoryKeys = {
  all: ['expense-categories'] as const,
  allIncludingInactive: ['expense-categories', 'all'] as const,
};

/**
 * Hook to fetch active expense categories
 */
export function useExpenseCategories() {
  return useQuery({
    queryKey: expenseCategoryKeys.all,
    queryFn: getExpenseCategories,
  });
}

/**
 * Hook to fetch all expense categories including inactive
 */
export function useAllExpenseCategories() {
  return useQuery({
    queryKey: expenseCategoryKeys.allIncludingInactive,
    queryFn: getAllExpenseCategories,
  });
}

/**
 * Hook to create a new expense category
 */
export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateExpenseCategoryData) => createExpenseCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseCategoryKeys.all });
      queryClient.invalidateQueries({
        queryKey: expenseCategoryKeys.allIncludingInactive,
      });
      toast.success('Category created successfully');
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
    mutationFn: ({ id, updates }: { id: string; updates: UpdateExpenseCategoryData }) =>
      updateExpenseCategory(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseCategoryKeys.all });
      queryClient.invalidateQueries({
        queryKey: expenseCategoryKeys.allIncludingInactive,
      });
      toast.success('Category updated successfully');
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
    mutationFn: (id: string) => deleteExpenseCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseCategoryKeys.all });
      queryClient.invalidateQueries({
        queryKey: expenseCategoryKeys.allIncludingInactive,
      });
      toast.success('Category deleted successfully');
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
    mutationFn: (categoryIds: string[]) => reorderExpenseCategories(categoryIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseCategoryKeys.all });
      queryClient.invalidateQueries({
        queryKey: expenseCategoryKeys.allIncludingInactive,
      });
      toast.success('Categories reordered successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder categories: ${error.message}`);
    },
  });
}
