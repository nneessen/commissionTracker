// src/services/slack/userSlackPreferencesService.ts
// Service for managing per-user Slack preferences (multi-workspace support)

import { supabase } from "@/services/base/supabase";
import type {
  UserSlackPreferences,
  UserSlackPreferencesRow,
  UserSlackPreferencesInsert,
  UserSlackPreferencesUpdate,
  PolicyPostChannel,
} from "@/types/slack.types";

/**
 * Transform database row to UserSlackPreferences
 */
function transformRow(row: UserSlackPreferencesRow): UserSlackPreferences {
  // Parse JSONB policy_post_channels to typed array
  const channels = row.policy_post_channels as unknown as
    | PolicyPostChannel[]
    | null;
  return {
    ...row,
    policy_post_channels: channels || [],
  };
}

export interface UpdatePreferencesInput {
  defaultViewChannelId?: string | null;
  defaultViewChannelName?: string | null;
  defaultViewIntegrationId?: string | null;
  // Multi-workspace channel selections
  policyPostChannels?: PolicyPostChannel[];
  autoPostEnabled?: boolean;
}

export const userSlackPreferencesService = {
  /**
   * Get user's Slack preferences for a specific IMO
   */
  async getPreferences(
    userId: string,
    imoId: string,
  ): Promise<UserSlackPreferences | null> {
    const { data, error } = await supabase
      .from("user_slack_preferences")
      .select("*")
      .eq("user_id", userId)
      .eq("imo_id", imoId)
      .maybeSingle();

    if (error) {
      console.error(
        "[userSlackPreferencesService] Error fetching preferences:",
        error,
      );
      throw error;
    }

    return data ? transformRow(data) : null;
  },

  /**
   * Create or update user's Slack preferences (upsert)
   */
  async upsertPreferences(
    userId: string,
    imoId: string,
    input: UpdatePreferencesInput,
  ): Promise<UserSlackPreferences> {
    const updateData: UserSlackPreferencesUpdate = {};

    if (input.defaultViewChannelId !== undefined) {
      updateData.default_view_channel_id = input.defaultViewChannelId;
    }
    if (input.defaultViewChannelName !== undefined) {
      updateData.default_view_channel_name = input.defaultViewChannelName;
    }
    if (input.defaultViewIntegrationId !== undefined) {
      updateData.default_view_integration_id = input.defaultViewIntegrationId;
    }
    if (input.policyPostChannels !== undefined) {
      // Cast to unknown first to satisfy TypeScript's JSONB type requirements
      updateData.policy_post_channels =
        input.policyPostChannels as unknown as UserSlackPreferencesUpdate["policy_post_channels"];
    }
    if (input.autoPostEnabled !== undefined) {
      updateData.auto_post_enabled = input.autoPostEnabled;
    }

    const { data, error } = await supabase
      .from("user_slack_preferences")
      .upsert(
        {
          user_id: userId,
          imo_id: imoId,
          ...updateData,
        } as UserSlackPreferencesInsert,
        {
          onConflict: "user_id,imo_id",
        },
      )
      .select()
      .single();

    if (error) {
      console.error(
        "[userSlackPreferencesService] Error upserting preferences:",
        error,
      );
      throw error;
    }

    return transformRow(data);
  },

  /**
   * Set default view channel with integration reference
   */
  async setDefaultViewChannel(
    userId: string,
    imoId: string,
    integrationId: string | null,
    channelId: string | null,
    channelName: string | null,
  ): Promise<UserSlackPreferences> {
    return this.upsertPreferences(userId, imoId, {
      defaultViewIntegrationId: integrationId,
      defaultViewChannelId: channelId,
      defaultViewChannelName: channelName,
    });
  },

  /**
   * Set policy post channels (multi-workspace format)
   */
  async setPolicyPostChannels(
    userId: string,
    imoId: string,
    channels: PolicyPostChannel[],
  ): Promise<UserSlackPreferences> {
    return this.upsertPreferences(userId, imoId, {
      policyPostChannels: channels,
    });
  },

  /**
   * Add a channel to policy post channels
   */
  async addPolicyPostChannel(
    userId: string,
    imoId: string,
    channel: PolicyPostChannel,
  ): Promise<UserSlackPreferences> {
    const prefs = await this.getPreferences(userId, imoId);
    const currentChannels = prefs?.policy_post_channels ?? [];

    // Check if already exists
    const exists = currentChannels.some(
      (c) =>
        c.integration_id === channel.integration_id &&
        c.channel_id === channel.channel_id,
    );

    if (exists) {
      return prefs!;
    }

    return this.setPolicyPostChannels(userId, imoId, [
      ...currentChannels,
      channel,
    ]);
  },

  /**
   * Remove a channel from policy post channels
   */
  async removePolicyPostChannel(
    userId: string,
    imoId: string,
    integrationId: string,
    channelId: string,
  ): Promise<UserSlackPreferences> {
    const prefs = await this.getPreferences(userId, imoId);
    const currentChannels = prefs?.policy_post_channels ?? [];

    const newChannels = currentChannels.filter(
      (c) =>
        !(c.integration_id === integrationId && c.channel_id === channelId),
    );

    return this.setPolicyPostChannels(userId, imoId, newChannels);
  },

  /**
   * Toggle a channel in policy post channels
   */
  async togglePolicyPostChannel(
    userId: string,
    imoId: string,
    channel: PolicyPostChannel,
    enabled: boolean,
  ): Promise<UserSlackPreferences> {
    if (enabled) {
      return this.addPolicyPostChannel(userId, imoId, channel);
    } else {
      return this.removePolicyPostChannel(
        userId,
        imoId,
        channel.integration_id,
        channel.channel_id,
      );
    }
  },

  /**
   * Toggle auto-post enabled
   */
  async setAutoPostEnabled(
    userId: string,
    imoId: string,
    enabled: boolean,
  ): Promise<UserSlackPreferences> {
    return this.upsertPreferences(userId, imoId, {
      autoPostEnabled: enabled,
    });
  },

  /**
   * Get all channels that a user's policy should be posted to
   * Returns channels grouped by integration for multi-workspace posting
   */
  async getPolicyPostChannels(
    userId: string,
    imoId: string,
  ): Promise<{ channels: PolicyPostChannel[]; autoPostEnabled: boolean }> {
    const prefs = await this.getPreferences(userId, imoId);

    return {
      channels: prefs?.policy_post_channels ?? [],
      autoPostEnabled: prefs?.auto_post_enabled ?? true,
    };
  },

  /**
   * Get channels grouped by integration ID
   */
  async getPolicyPostChannelsByIntegration(
    userId: string,
    imoId: string,
  ): Promise<Map<string, PolicyPostChannel[]>> {
    const { channels } = await this.getPolicyPostChannels(userId, imoId);

    const byIntegration = new Map<string, PolicyPostChannel[]>();
    for (const channel of channels) {
      const existing = byIntegration.get(channel.integration_id) || [];
      existing.push(channel);
      byIntegration.set(channel.integration_id, existing);
    }

    return byIntegration;
  },
};
