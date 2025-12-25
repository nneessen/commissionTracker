// src/hooks/slack/useSlackIntegration.ts
// TanStack Query hooks for Slack integration

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserProfile } from "@/hooks/admin/useUserApproval";
import { slackService } from "@/services/slack";
import { slackKeys } from "@/types/slack.types";
import type {
  SlackIntegration,
  SlackChannel,
  SlackMessage,
  SlackNotificationType,
} from "@/types/slack.types";

// ============================================================================
// Integration Hooks
// ============================================================================

/**
 * Get Slack integration status for the current user's IMO
 */
export function useSlackIntegration() {
  const { data: profile } = useCurrentUserProfile();
  const imoId = profile?.imo_id;

  return useQuery({
    queryKey: slackKeys.integration(imoId ?? ""),
    queryFn: async (): Promise<SlackIntegration | null> => {
      if (!imoId) return null;
      return slackService.getIntegration(imoId);
    },
    enabled: !!imoId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Check if user's IMO has active Slack integration
 */
export function useHasSlackIntegration() {
  const { data: integration, isLoading } = useSlackIntegration();
  return {
    hasIntegration: integration?.isConnected ?? false,
    isLoading,
  };
}

/**
 * Initiate Slack OAuth connection
 */
export function useConnectSlack() {
  const { user } = useAuth();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async (returnUrl?: string): Promise<void> => {
      if (!profile?.imo_id || !user?.id) {
        throw new Error("User not authenticated or no IMO assigned");
      }
      const oauthUrl = await slackService.initiateOAuth(
        profile.imo_id,
        user.id,
        returnUrl,
      );
      window.location.href = oauthUrl;
    },
  });
}

/**
 * Disconnect Slack workspace
 */
export function useDisconnectSlack() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!profile?.imo_id) {
        throw new Error("No IMO assigned");
      }
      await slackService.disconnect(profile.imo_id);
    },
    onSuccess: () => {
      if (profile?.imo_id) {
        queryClient.invalidateQueries({
          queryKey: slackKeys.integration(profile.imo_id),
        });
        queryClient.invalidateQueries({
          queryKey: slackKeys.channels(profile.imo_id),
        });
        queryClient.invalidateQueries({
          queryKey: slackKeys.channelConfigs(profile.imo_id),
        });
      }
    },
  });
}

/**
 * Test Slack connection
 */
export function useTestSlackConnection() {
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async (): Promise<{ ok: boolean; error?: string }> => {
      if (!profile?.imo_id) {
        throw new Error("No IMO assigned");
      }
      return slackService.testConnection(profile.imo_id);
    },
  });
}

/**
 * Update Slack channel settings
 */
export function useUpdateSlackChannelSettings() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async (settings: {
      policy_channel_id?: string | null;
      policy_channel_name?: string | null;
      leaderboard_channel_id?: string | null;
      leaderboard_channel_name?: string | null;
      include_client_info?: boolean;
      include_leaderboard_with_policy?: boolean;
    }): Promise<SlackIntegration> => {
      if (!profile?.imo_id) {
        throw new Error("No IMO assigned");
      }
      return slackService.updateChannelSettings(profile.imo_id, settings);
    },
    onSuccess: () => {
      if (profile?.imo_id) {
        queryClient.invalidateQueries({
          queryKey: slackKeys.integration(profile.imo_id),
        });
      }
    },
  });
}

// ============================================================================
// Channel Hooks
// ============================================================================

/**
 * List available Slack channels
 */
export function useSlackChannels() {
  const { data: profile } = useCurrentUserProfile();
  const imoId = profile?.imo_id;

  return useQuery({
    queryKey: slackKeys.channels(imoId ?? ""),
    queryFn: async (): Promise<SlackChannel[]> => {
      if (!imoId) return [];
      return slackService.listChannels(imoId);
    },
    enabled: !!imoId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Join a Slack channel
 */
export function useJoinSlackChannel() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async (
      channelId: string,
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!profile?.imo_id) {
        throw new Error("No IMO assigned");
      }
      return slackService.joinChannel(profile.imo_id, channelId);
    },
    onSuccess: () => {
      if (profile?.imo_id) {
        queryClient.invalidateQueries({
          queryKey: slackKeys.channels(profile.imo_id),
        });
      }
    },
  });
}

// ============================================================================
// Message Hooks
// ============================================================================

/**
 * Get Slack message history
 */
export function useSlackMessages(options?: {
  limit?: number;
  offset?: number;
  notificationType?: SlackNotificationType;
  status?: string;
}) {
  const { data: profile } = useCurrentUserProfile();
  const imoId = profile?.imo_id;

  return useQuery({
    queryKey: [...slackKeys.messages(imoId ?? ""), options],
    queryFn: async (): Promise<{ messages: SlackMessage[]; total: number }> => {
      if (!imoId) return { messages: [], total: 0 };
      return slackService.getMessages(imoId, options);
    },
    enabled: !!imoId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Get message statistics
 */
export function useSlackMessageStats() {
  const { data: profile } = useCurrentUserProfile();
  const imoId = profile?.imo_id;

  return useQuery({
    queryKey: [...slackKeys.messages(imoId ?? ""), "stats"],
    queryFn: async () => {
      if (!imoId) return { total: 0, sent: 0, failed: 0, pending: 0 };
      return slackService.getMessageStats(imoId);
    },
    enabled: !!imoId,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Send a test message
 */
export function useSendTestSlackMessage() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async ({
      channelId,
      message,
    }: {
      channelId: string;
      message: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      if (!profile?.imo_id) {
        throw new Error("No IMO assigned");
      }
      return slackService.sendTestMessage(profile.imo_id, channelId, message);
    },
    onSuccess: () => {
      if (profile?.imo_id) {
        queryClient.invalidateQueries({
          queryKey: slackKeys.messages(profile.imo_id),
        });
      }
    },
  });
}

/**
 * Manually trigger leaderboard post
 */
export function usePostLeaderboard() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async (
      agencyId?: string,
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!profile?.imo_id) {
        throw new Error("No IMO assigned");
      }
      return slackService.postLeaderboard(profile.imo_id, agencyId);
    },
    onSuccess: () => {
      if (profile?.imo_id) {
        queryClient.invalidateQueries({
          queryKey: slackKeys.messages(profile.imo_id),
        });
      }
    },
  });
}
