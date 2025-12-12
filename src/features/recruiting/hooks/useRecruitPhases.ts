// src/features/recruiting/hooks/useRecruitPhases.ts
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {recruitingService} from '@/services/recruiting';
import type {UpdatePhaseInput} from '@/types/recruiting';

export function useRecruitPhases(recruitId: string) {
  return useQuery({
    queryKey: ['recruits', recruitId, 'phases'],
    queryFn: () => recruitingService.getRecruitPhases(recruitId),
    enabled: !!recruitId,
  });
}

export function useUpdatePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ phaseId, updates }: { phaseId: string; updates: UpdatePhaseInput }) =>
      recruitingService.updatePhase(phaseId, updates),
    onSuccess: (data) => {
      // Invalidate phases for this user (changed from recruit_id to user_id)
      queryClient.invalidateQueries({ queryKey: ['recruits', data.user_id, 'phases'] });
      // Also invalidate user details (current_onboarding_phase may have changed)
      queryClient.invalidateQueries({ queryKey: ['recruits', data.user_id] });
      // Invalidate recruit list
      queryClient.invalidateQueries({ queryKey: ['recruits'] });
    },
  });
}
