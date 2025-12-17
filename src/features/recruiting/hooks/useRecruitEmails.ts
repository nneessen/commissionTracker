// src/features/recruiting/hooks/useRecruitEmails.ts
// Uses unified emailService for all email operations

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emailService, type SendEmailRequest } from "@/services/emailService";

export function useRecruitEmails(recruitId: string) {
  return useQuery({
    queryKey: ["recruits", recruitId, "emails"],
    queryFn: () => emailService.getEmailsForRecruit(recruitId),
    enabled: !!recruitId,
  });
}

export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SendEmailRequest) => emailService.sendEmail(request),
    onSuccess: (_, variables) => {
      if (variables.recruitId) {
        queryClient.invalidateQueries({
          queryKey: ["recruits", variables.recruitId, "emails"],
        });
      }
      // Also invalidate user messages for CommunicationPanel
      if (variables.senderId) {
        queryClient.invalidateQueries({
          queryKey: ["user-messages", variables.senderId],
        });
      }
    },
  });
}
