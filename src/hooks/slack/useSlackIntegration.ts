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
  SlackChannelConfig,
  SlackMessage,
  CreateChannelConfigForm,
  UpdateChannelConfigForm,
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
// Channel Configuration Hooks
// ============================================================================

/**
 * Get all channel configurations for current IMO
 */
export function useSlackChannelConfigs() {
  const { data: profile } = useCurrentUserProfile();
  const imoId = profile?.imo_id;

  return useQuery({
    queryKey: slackKeys.channelConfigs(imoId ?? ""),
    queryFn: async (): Promise<SlackChannelConfig[]> => {
      if (!imoId) return [];
      return slackService.getChannelConfigs(imoId);
    },
    enabled: !!imoId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get channel configs for a specific agency
 */
export function useSlackChannelConfigsForAgency(agencyId: string | null) {
  const { data: profile } = useCurrentUserProfile();
  const imoId = profile?.imo_id;

  return useQuery({
    queryKey: [...slackKeys.channelConfigs(imoId ?? ""), "agency", agencyId],
    queryFn: async (): Promise<SlackChannelConfig[]> => {
      if (!imoId) return [];
      return slackService.getChannelConfigsForAgency(imoId, agencyId);
    },
    enabled: !!imoId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get channel configs by notification type
 */
export function useSlackChannelConfigsByType(
  notificationType: SlackNotificationType,
  agencyId?: string,
) {
  const { data: profile } = useCurrentUserProfile();
  const imoId = profile?.imo_id;

  return useQuery({
    queryKey: [
      ...slackKeys.channelConfigs(imoId ?? ""),
      "type",
      notificationType,
      agencyId,
    ],
    queryFn: async (): Promise<SlackChannelConfig[]> => {
      if (!imoId) return [];
      return slackService.getChannelConfigsByType(
        imoId,
        notificationType,
        agencyId,
      );
    },
    enabled: !!imoId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get a specific channel config
 */
export function useSlackChannelConfig(id: string | null) {
  return useQuery({
    queryKey: slackKeys.channelConfig(id ?? ""),
    queryFn: async (): Promise<SlackChannelConfig | null> => {
      if (!id) return null;
      return slackService.getChannelConfig(id);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new channel configuration
 */
export function useCreateSlackChannelConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useCurrentUserProfile();
  const { data: integration } = useSlackIntegration();

  return useMutation({
    mutationFn: async (
      form: CreateChannelConfigForm,
    ): Promise<SlackChannelConfig> => {
      if (!profile?.imo_id || !user?.id || !integration?.id) {
        throw new Error("Missing required context");
      }
      return slackService.createChannelConfig(
        profile.imo_id,
        integration.id,
        form,
        user.id,
      );
    },
    onSuccess: () => {
      if (profile?.imo_id) {
        queryClient.invalidateQueries({
          queryKey: slackKeys.channelConfigs(profile.imo_id),
        });
      }
    },
  });
}

/**
 * Update a channel configuration
 */
export function useUpdateSlackChannelConfig() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async ({
      id,
      form,
    }: {
      id: string;
      form: UpdateChannelConfigForm;
    }): Promise<SlackChannelConfig> => {
      return slackService.updateChannelConfig(id, form);
    },
    onSuccess: (data) => {
      if (profile?.imo_id) {
        queryClient.invalidateQueries({
          queryKey: slackKeys.channelConfigs(profile.imo_id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: slackKeys.channelConfig(data.id),
      });
    },
  });
}

/**
 * Toggle channel config active status
 */
export function useToggleSlackChannelConfig() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: {
      id: string;
      isActive: boolean;
    }): Promise<SlackChannelConfig> => {
      return slackService.toggleChannelConfig(id, isActive);
    },
    onSuccess: (data) => {
      if (profile?.imo_id) {
        queryClient.invalidateQueries({
          queryKey: slackKeys.channelConfigs(profile.imo_id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: slackKeys.channelConfig(data.id),
      });
    },
  });
}

/**
 * Delete a channel configuration
 */
export function useDeleteSlackChannelConfig() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return slackService.deleteChannelConfig(id);
    },
    onSuccess: () => {
      if (profile?.imo_id) {
        queryClient.invalidateQueries({
          queryKey: slackKeys.channelConfigs(profile.imo_id),
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
