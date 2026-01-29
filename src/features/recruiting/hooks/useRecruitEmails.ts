// src/features/recruiting/hooks/useRecruitEmails.ts
// Uses unified emailService for all email operations

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emailService, type SendEmailRequest } from "@/services/email";

/**
 * Validates that a string is a valid UUID format.
 * Prevents invalid IDs (like "invitation-{uuid}") from being used in database queries.
 */
const isValidUuid = (id: string | undefined): boolean => {
  if (!id) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export function useRecruitEmails(recruitId: string | undefined) {
  return useQuery({
    queryKey: ["recruits", recruitId, "emails"],
    queryFn: () => emailService.getEmailsForRecruit(recruitId!),
    enabled: !!recruitId && isValidUuid(recruitId),
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
