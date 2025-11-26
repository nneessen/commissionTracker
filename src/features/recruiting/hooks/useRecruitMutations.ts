// src/features/recruiting/hooks/useRecruitMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recruitingService } from '@/services/recruiting';
import type { CreateRecruitInput, UpdateRecruitInput } from '@/types/recruiting';

export function useCreateRecruit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recruit: CreateRecruitInput) => recruitingService.createRecruit(recruit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruits'] });
      queryClient.invalidateQueries({ queryKey: ['recruiting-stats'] });
    },
  });
}

export function useUpdateRecruit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateRecruitInput }) =>
      recruitingService.updateRecruit(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recruits'] });
      queryClient.invalidateQueries({ queryKey: ['recruits', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['recruiting-stats'] });
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
