// src/features/recruiting/hooks/useRecruitEmails.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recruitingService } from '@/services/recruiting';
import type { SendEmailRequest } from '@/types/recruiting';

export function useRecruitEmails(recruitId: string) {
  return useQuery({
    queryKey: ['recruits', recruitId, 'emails'],
    queryFn: () => recruitingService.getRecruitEmails(recruitId),
    enabled: !!recruitId,
  });
}

export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (emailRequest: SendEmailRequest) => recruitingService.sendEmail(emailRequest),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recruits', variables.recruitId, 'emails'] });
    },
  });
}
