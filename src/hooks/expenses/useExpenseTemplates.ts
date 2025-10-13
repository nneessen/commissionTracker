// src/hooks/expenses/useExpenseTemplates.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseTemplateService } from '../../services/expenses/expenseTemplateService';
import type { CreateExpenseTemplateData, UpdateExpenseTemplateData } from '../../types/expense.types';

/**
 * Hook to fetch all expense templates for the current user
 */
export function useExpenseTemplates() {
  return useQuery({
    queryKey: ['expense-templates'],
    queryFn: () => expenseTemplateService.getAll(),
  });
}

/**
 * Hook to create a new expense template
 */
export function useCreateExpenseTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateExpenseTemplateData) => expenseTemplateService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-templates'] });
    },
  });
}

/**
 * Hook to update an existing expense template
 */
export function useUpdateExpenseTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateExpenseTemplateData }) =>
      expenseTemplateService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-templates'] });
    },
  });
}

/**
 * Hook to delete an expense template
 */
export function useDeleteExpenseTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => expenseTemplateService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-templates'] });
    },
  });
}
