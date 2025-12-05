// src/features/recruiting/hooks/useRecruitMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recruitingService } from '@/services/recruiting';
import type { UpdateRecruitInput } from '@/types/recruiting';
import type { CreateRecruitInput } from '@/types/recruiting.types';
import { showToast } from '@/utils/toast';

export function useCreateRecruit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recruit: CreateRecruitInput) => recruitingService.createRecruit(recruit),
    onSuccess: (data) => {
      const name = `${data.first_name} ${data.last_name}`.trim() || data.email;
      showToast.success(`Successfully added ${name} to recruiting pipeline`);
      queryClient.invalidateQueries({ queryKey: ['recruits'] });
      queryClient.invalidateQueries({ queryKey: ['recruiting-stats'] });
    },
    onError: (error: any) => {
      console.error('Failed to create recruit:', error);
      showToast.error(error?.message || 'Failed to add recruit. Please try again.');
    },
  });
}

export function useUpdateRecruit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateRecruitInput }) =>
      recruitingService.updateRecruit(id, updates),
    onSuccess: (data, variables) => {
      const name = `${data.first_name} ${data.last_name}`.trim() || data.email;
      showToast.success(`Successfully updated ${name}`);
      queryClient.invalidateQueries({ queryKey: ['recruits'] });
      queryClient.invalidateQueries({ queryKey: ['recruits', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['recruiting-stats'] });
    },
    onError: (error: any) => {
      console.error('Failed to update recruit:', error);
      showToast.error(error?.message || 'Failed to update recruit. Please try again.');
    },
  });
}

export function useDeleteRecruit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recruitingService.deleteRecruit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruits'] });
      queryClient.invalidateQueries({ queryKey: ['recruiting-stats'] });
    },
  });
}

export function useRecruitMutations() {
  const createRecruit = useCreateRecruit();
  const updateRecruit = useUpdateRecruit();
  const deleteRecruit = useDeleteRecruit();

  return {
    createRecruit,
    updateRecruit,
    deleteRecruit,
  };
}
