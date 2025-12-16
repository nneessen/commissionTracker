// src/features/messages/hooks/useSendEmail.ts
// Hook for sending emails and managing drafts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  sendEmail,
  saveDraft,
  deleteDraft,
  getDrafts,
  getEmailQuota,
  type SendEmailParams,
} from "../services/emailService";

export type {
  SendEmailParams,
  EmailQuota,
  EmailDraft,
} from "../services/emailService";

export function useSendEmail() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: (params: Omit<SendEmailParams, "userId">) =>
      sendEmail({ ...params, userId: user!.id }),
    onSuccess: (result) => {
      // Only invalidate caches if the send was successful
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["threads"] });
        queryClient.invalidateQueries({ queryKey: ["folderCounts"] });
        queryClient.invalidateQueries({ queryKey: ["totalUnread"] });
        queryClient.invalidateQueries({ queryKey: ["quota"] });
      }
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: (params: {
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      bodyHtml: string;
      draftId?: string;
    }) => saveDraft({ ...params, userId: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: (draftId: string) => deleteDraft(draftId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
    },
  });

  return {
    send: sendMutation.mutateAsync,
    saveDraft: saveDraftMutation.mutateAsync,
    deleteDraft: deleteDraftMutation.mutateAsync,
    isSending: sendMutation.isPending,
    isSavingDraft: saveDraftMutation.isPending,
    sendError: sendMutation.error,
  };
}

export function useEmailQuota() {
  const { user } = useAuth();

  const { data: quota, isLoading } = useQuery({
    queryKey: ["quota", user?.id],
    queryFn: () => getEmailQuota(user!.id),
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  return {
    quota,
    isLoading,
    remainingDaily: quota ? quota.dailyLimit - quota.dailyUsed : 0,
    percentUsed: quota
      ? Math.round((quota.dailyUsed / quota.dailyLimit) * 100)
      : 0,
  };
}

export function useDrafts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: drafts, isLoading } = useQuery({
    queryKey: ["drafts", user?.id],
    queryFn: () => getDrafts(user!.id),
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: (draftId: string) => deleteDraft(draftId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
    },
  });

  return {
    drafts: drafts || [],
    isLoading,
    deleteDraft: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
