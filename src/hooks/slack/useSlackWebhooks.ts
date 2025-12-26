// src/hooks/slack/useSlackWebhooks.ts
// TanStack Query hooks for Slack webhooks (multi-workspace notifications)

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUserProfile } from "@/hooks/admin/useUserApproval";
import { webhookService } from "@/services/slack/webhookService";
import { slackKeys } from "@/types/slack.types";
import type { SlackWebhook } from "@/types/slack.types";

/**
 * Get all webhooks for the current user's IMO
 */
export function useSlackWebhooks() {
  const { data: profile } = useCurrentUserProfile();
  const imoId = profile?.imo_id;

  return useQuery({
    queryKey: slackKeys.webhooks(imoId ?? ""),
    queryFn: async (): Promise<SlackWebhook[]> => {
      if (!imoId) return [];
      return webhookService.getWebhooks(imoId);
    },
    enabled: !!imoId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Add a new webhook
 */
export function useAddSlackWebhook() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();
  const imoId = profile?.imo_id;

  return useMutation({
    mutationFn: async (input: {
      webhookUrl: string;
      channelName: string;
      workspaceName?: string;
    }) => {
      if (!imoId) throw new Error("No IMO ID");
      return webhookService.addWebhook({
        imoId,
        webhookUrl: input.webhookUrl,
        channelName: input.channelName,
        workspaceName: input.workspaceName,
      });
    },
    onSuccess: () => {
      if (imoId) {
        queryClient.invalidateQueries({ queryKey: slackKeys.webhooks(imoId) });
      }
    },
  });
}

/**
 * Update webhook settings
 */
export function useUpdateSlackWebhook() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();
  const imoId = profile?.imo_id;

  return useMutation({
    mutationFn: async (input: {
      webhookId: string;
      updates: {
        is_active?: boolean;
        notifications_enabled?: boolean;
        include_client_info?: boolean;
        include_leaderboard?: boolean;
        channel_name?: string;
        workspace_name?: string;
      };
    }) => {
      return webhookService.updateWebhook(input.webhookId, input.updates);
    },
    onSuccess: () => {
      if (imoId) {
        queryClient.invalidateQueries({ queryKey: slackKeys.webhooks(imoId) });
      }
    },
  });
}

/**
 * Delete a webhook
 */
export function useDeleteSlackWebhook() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();
  const imoId = profile?.imo_id;

  return useMutation({
    mutationFn: async (webhookId: string) => {
      return webhookService.deleteWebhook(webhookId);
    },
    onSuccess: () => {
      if (imoId) {
        queryClient.invalidateQueries({ queryKey: slackKeys.webhooks(imoId) });
      }
    },
  });
}

/**
 * Test a webhook
 */
export function useTestSlackWebhook() {
  return useMutation({
    mutationFn: async (webhookUrl: string) => {
      return webhookService.testWebhook(webhookUrl);
    },
  });
}
