// src/hooks/slack/useUserSlackPreferences.ts
// TanStack Query hooks for per-user Slack preferences (multi-workspace support)

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserProfile } from "@/hooks/admin/useUserApproval";
import {
  userSlackPreferencesService,
  type UpdatePreferencesInput,
} from "@/services/slack/userSlackPreferencesService";
import { slackKeys } from "@/types/slack.types";
import type {
  UserSlackPreferences,
  PolicyPostChannel,
} from "@/types/slack.types";

/**
 * Get current user's Slack preferences for their IMO
 */
export function useUserSlackPreferences() {
  const { user } = useAuth();
  const { data: profile } = useCurrentUserProfile();
  const imoId = profile?.imo_id;

  return useQuery({
    queryKey: slackKeys.userPreferences(user?.id ?? "", imoId ?? ""),
    queryFn: async (): Promise<UserSlackPreferences | null> => {
      if (!user?.id || !imoId) return null;
      return userSlackPreferencesService.getPreferences(user.id, imoId);
    },
    enabled: !!user?.id && !!imoId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Update user's Slack preferences
 */
export function useUpdateUserSlackPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async (
      input: UpdatePreferencesInput,
    ): Promise<UserSlackPreferences> => {
      if (!user?.id || !profile?.imo_id) {
        throw new Error("User not authenticated or no IMO assigned");
      }
      return userSlackPreferencesService.upsertPreferences(
        user.id,
        profile.imo_id,
        input,
      );
    },
    onSuccess: (data) => {
      if (user?.id && profile?.imo_id) {
        queryClient.setQueryData(
          slackKeys.userPreferences(user.id, profile.imo_id),
          data,
        );
      }
    },
  });
}

/**
 * Set the default view channel for Slack tab (with integration reference)
 */
export function useSetDefaultSlackChannel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async ({
      integrationId,
      channelId,
      channelName,
    }: {
      integrationId: string | null;
      channelId: string | null;
      channelName: string | null;
    }): Promise<UserSlackPreferences> => {
      if (!user?.id || !profile?.imo_id) {
        throw new Error("User not authenticated or no IMO assigned");
      }
      return userSlackPreferencesService.setDefaultViewChannel(
        user.id,
        profile.imo_id,
        integrationId,
        channelId,
        channelName,
      );
    },
    onSuccess: (data) => {
      if (user?.id && profile?.imo_id) {
        queryClient.setQueryData(
          slackKeys.userPreferences(user.id, profile.imo_id),
          data,
        );
      }
    },
  });
}

/**
 * Set the policy post channels for auto-posting (multi-workspace format)
 */
export function useSetPolicyPostChannels() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async (
      channels: PolicyPostChannel[],
    ): Promise<UserSlackPreferences> => {
      if (!user?.id || !profile?.imo_id) {
        throw new Error("User not authenticated or no IMO assigned");
      }
      return userSlackPreferencesService.setPolicyPostChannels(
        user.id,
        profile.imo_id,
        channels,
      );
    },
    onSuccess: (data) => {
      if (user?.id && profile?.imo_id) {
        queryClient.setQueryData(
          slackKeys.userPreferences(user.id, profile.imo_id),
          data,
        );
      }
    },
  });
}

/**
 * Toggle a specific channel for policy posting
 */
export function useTogglePolicyPostChannel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async ({
      channel,
      enabled,
    }: {
      channel: PolicyPostChannel;
      enabled: boolean;
    }): Promise<UserSlackPreferences> => {
      if (!user?.id || !profile?.imo_id) {
        throw new Error("User not authenticated or no IMO assigned");
      }
      return userSlackPreferencesService.togglePolicyPostChannel(
        user.id,
        profile.imo_id,
        channel,
        enabled,
      );
    },
    onSuccess: (data) => {
      if (user?.id && profile?.imo_id) {
        queryClient.setQueryData(
          slackKeys.userPreferences(user.id, profile.imo_id),
          data,
        );
      }
    },
  });
}

/**
 * Toggle auto-post enabled setting
 */
export function useToggleAutoPost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async (enabled: boolean): Promise<UserSlackPreferences> => {
      if (!user?.id || !profile?.imo_id) {
        throw new Error("User not authenticated or no IMO assigned");
      }
      return userSlackPreferencesService.setAutoPostEnabled(
        user.id,
        profile.imo_id,
        enabled,
      );
    },
    onSuccess: (data) => {
      if (user?.id && profile?.imo_id) {
        queryClient.setQueryData(
          slackKeys.userPreferences(user.id, profile.imo_id),
          data,
        );
      }
    },
  });
}
