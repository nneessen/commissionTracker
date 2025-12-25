// src/services/slack/slackService.ts
// Slack integration service for managing workspace connections and channel configurations

import { supabase } from "@/services/base/supabase";
import type { Json } from "@/types/database.types";
import type {
  SlackIntegration,
  SlackIntegrationRow,
  SlackChannelConfig,
  SlackChannelConfigRow,
  SlackChannelConfigInsert,
  SlackChannelConfigUpdate,
  SlackMessage,
  SlackMessageRow,
  SlackChannel,
  SlackNotificationType,
  CreateChannelConfigForm,
  UpdateChannelConfigForm,
} from "@/types/slack.types";

// No client-side environment variables needed - OAuth init is handled server-side

/**
 * Transform database row to SlackIntegration
 */
function transformIntegrationRow(row: SlackIntegrationRow): SlackIntegration {
  return {
    ...row,
    isConnected: row.is_active && row.connection_status === "connected",
  };
}

/**
 * Transform database row to SlackChannelConfig
 */
function transformChannelConfigRow(
  row: SlackChannelConfigRow,
): SlackChannelConfig {
  return {
    ...row,
  };
}

/**
 * Transform database row to SlackMessage
 */
function transformMessageRow(row: SlackMessageRow): SlackMessage {
  return {
    ...row,
    formattedSentAt: row.sent_at
      ? new Date(row.sent_at).toLocaleString()
      : undefined,
  };
}

export const slackService = {
  // ============================================================================
  // Integration Management
  // ============================================================================

  /**
   * Get Slack integration for an IMO
   */
  async getIntegration(imoId: string): Promise<SlackIntegration | null> {
    const { data, error } = await supabase
      .from("slack_integrations")
      .select("*")
      .eq("imo_id", imoId)
      .maybeSingle();

    if (error) {
      console.error("[slackService] Error fetching integration:", error);
      throw error;
    }

    return data ? transformIntegrationRow(data) : null;
  },

  /**
   * Check if IMO has active Slack integration
   */
  async hasActiveIntegration(imoId: string): Promise<boolean> {
    const integration = await this.getIntegration(imoId);
    return integration?.isConnected ?? false;
  },

  /**
   * Initiate Slack OAuth flow
   * Returns the OAuth URL to redirect the user to
   * Uses server-side state signing for security
   */
  async initiateOAuth(
    imoId: string,
    userId: string,
    returnUrl?: string,
  ): Promise<string> {
    const { data, error } = await supabase.functions.invoke(
      "slack-oauth-init",
      {
        body: { imoId, userId, returnUrl },
      },
    );

    if (error) {
      console.error("[slackService] Error initiating OAuth:", error);
      throw new Error("Failed to initiate Slack OAuth");
    }

    if (!data?.ok || !data?.url) {
      throw new Error(data?.error || "Failed to generate OAuth URL");
    }

    return data.url;
  },

  /**
   * Disconnect Slack workspace (deactivate integration)
   */
  async disconnect(imoId: string): Promise<void> {
    const { error } = await supabase
      .from("slack_integrations")
      .update({
        is_active: false,
        connection_status: "disconnected",
      })
      .eq("imo_id", imoId);

    if (error) {
      console.error("[slackService] Error disconnecting:", error);
      throw error;
    }
  },

  /**
   * Delete Slack integration completely
   */
  async deleteIntegration(imoId: string): Promise<void> {
    const { error } = await supabase
      .from("slack_integrations")
      .delete()
      .eq("imo_id", imoId);

    if (error) {
      console.error("[slackService] Error deleting integration:", error);
      throw error;
    }
  },

  /**
   * Test Slack connection by calling edge function
   */
  async testConnection(
    imoId: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await supabase.functions.invoke(
      "slack-test-connection",
      {
        body: { imoId },
      },
    );

    if (error) {
      return { ok: false, error: error.message };
    }

    return data;
  },

  // ============================================================================
  // Channel Management
  // ============================================================================

  /**
   * List available Slack channels via edge function
   */
  async listChannels(imoId: string): Promise<SlackChannel[]> {
    const { data, error } = await supabase.functions.invoke(
      "slack-list-channels",
      {
        body: { imoId },
      },
    );

    if (error) {
      console.error("[slackService] Error listing channels:", error);
      throw error;
    }

    return data?.channels || [];
  },

  /**
   * Join a Slack channel via edge function
   */
  async joinChannel(
    imoId: string,
    channelId: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await supabase.functions.invoke(
      "slack-join-channel",
      {
        body: { imoId, channelId },
      },
    );

    if (error) {
      return { ok: false, error: error.message };
    }

    return data;
  },

  // ============================================================================
  // Channel Configuration
  // ============================================================================

  /**
   * Get all channel configs for an IMO
   */
  async getChannelConfigs(imoId: string): Promise<SlackChannelConfig[]> {
    const { data, error } = await supabase
      .from("slack_channel_configs")
      .select(
        `
        *,
        agencies:agency_id (name)
      `,
      )
      .eq("imo_id", imoId)
      .order("channel_name", { ascending: true });

    if (error) {
      console.error("[slackService] Error fetching channel configs:", error);
      throw error;
    }

    return (data || []).map((row) => ({
      ...transformChannelConfigRow(row),
      agencyName: row.agencies?.name,
    }));
  },

  /**
   * Get channel configs for a specific agency
   */
  async getChannelConfigsForAgency(
    imoId: string,
    agencyId: string | null,
  ): Promise<SlackChannelConfig[]> {
    let query = supabase
      .from("slack_channel_configs")
      .select("*")
      .eq("imo_id", imoId)
      .eq("is_active", true);

    // Get configs that match this agency OR are for all agencies (null)
    if (agencyId) {
      query = query.or(`agency_id.eq.${agencyId},agency_id.is.null`);
    } else {
      query = query.is("agency_id", null);
    }

    const { data, error } = await query.order("notification_type");

    if (error) {
      console.error(
        "[slackService] Error fetching agency channel configs:",
        error,
      );
      throw error;
    }

    return (data || []).map(transformChannelConfigRow);
  },

  /**
   * Get channel configs for a specific notification type
   */
  async getChannelConfigsByType(
    imoId: string,
    notificationType: SlackNotificationType,
    agencyId?: string,
  ): Promise<SlackChannelConfig[]> {
    let query = supabase
      .from("slack_channel_configs")
      .select("*")
      .eq("imo_id", imoId)
      .eq("notification_type", notificationType)
      .eq("is_active", true);

    // If agency specified, get configs for that agency or global configs
    if (agencyId) {
      query = query.or(`agency_id.eq.${agencyId},agency_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[slackService] Error fetching configs by type:", error);
      throw error;
    }

    return (data || []).map(transformChannelConfigRow);
  },

  /**
   * Get a specific channel config by ID
   */
  async getChannelConfig(id: string): Promise<SlackChannelConfig | null> {
    const { data, error } = await supabase
      .from("slack_channel_configs")
      .select(
        `
        *,
        agencies:agency_id (name)
      `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[slackService] Error fetching channel config:", error);
      throw error;
    }

    if (!data) return null;

    return {
      ...transformChannelConfigRow(data),
      agencyName: data.agencies?.name,
    };
  },

  /**
   * Create a new channel configuration
   */
  async createChannelConfig(
    imoId: string,
    integrationId: string,
    form: CreateChannelConfigForm,
    createdBy: string,
  ): Promise<SlackChannelConfig> {
    const insertData: SlackChannelConfigInsert = {
      imo_id: imoId,
      slack_integration_id: integrationId,
      channel_id: form.channelId,
      channel_name: form.channelName,
      channel_type: form.channelType,
      agency_id: form.agencyId,
      notification_type: form.notificationType,
      filter_config: (form.filterConfig ?? {}) as Json,
      include_client_info: form.includeClientInfo,
      include_agent_photo: form.includeAgentPhoto,
      include_leaderboard: form.includeLeaderboard,
      is_active: true,
      created_by: createdBy,
    };

    const { data, error } = await supabase
      .from("slack_channel_configs")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("[slackService] Error creating channel config:", error);
      throw error;
    }

    return transformChannelConfigRow(data);
  },

  /**
   * Update a channel configuration
   */
  async updateChannelConfig(
    id: string,
    form: UpdateChannelConfigForm,
  ): Promise<SlackChannelConfig> {
    const updateData: SlackChannelConfigUpdate = {};

    if (form.channelId !== undefined) updateData.channel_id = form.channelId;
    if (form.channelName !== undefined)
      updateData.channel_name = form.channelName;
    if (form.channelType !== undefined)
      updateData.channel_type = form.channelType;
    if (form.agencyId !== undefined) updateData.agency_id = form.agencyId;
    if (form.notificationType !== undefined)
      updateData.notification_type = form.notificationType;
    if (form.filterConfig !== undefined)
      updateData.filter_config = form.filterConfig as Json;
    if (form.includeClientInfo !== undefined)
      updateData.include_client_info = form.includeClientInfo;
    if (form.includeAgentPhoto !== undefined)
      updateData.include_agent_photo = form.includeAgentPhoto;
    if (form.includeLeaderboard !== undefined)
      updateData.include_leaderboard = form.includeLeaderboard;

    const { data, error } = await supabase
      .from("slack_channel_configs")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[slackService] Error updating channel config:", error);
      throw error;
    }

    return transformChannelConfigRow(data);
  },

  /**
   * Toggle channel config active status
   */
  async toggleChannelConfig(
    id: string,
    isActive: boolean,
  ): Promise<SlackChannelConfig> {
    const { data, error } = await supabase
      .from("slack_channel_configs")
      .update({ is_active: isActive })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[slackService] Error toggling channel config:", error);
      throw error;
    }

    return transformChannelConfigRow(data);
  },

  /**
   * Delete a channel configuration
   */
  async deleteChannelConfig(id: string): Promise<void> {
    const { error } = await supabase
      .from("slack_channel_configs")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[slackService] Error deleting channel config:", error);
      throw error;
    }
  },

  // ============================================================================
  // Message History
  // ============================================================================

  /**
   * Get message history for an IMO
   */
  async getMessages(
    imoId: string,
    options?: {
      limit?: number;
      offset?: number;
      notificationType?: SlackNotificationType;
      status?: string;
    },
  ): Promise<{ messages: SlackMessage[]; total: number }> {
    let query = supabase
      .from("slack_messages")
      .select("*", { count: "exact" })
      .eq("imo_id", imoId)
      .order("created_at", { ascending: false });

    if (options?.notificationType) {
      query = query.eq("notification_type", options.notificationType);
    }
    if (options?.status) {
      query = query.eq("status", options.status);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 50) - 1,
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[slackService] Error fetching messages:", error);
      throw error;
    }

    return {
      messages: (data || []).map(transformMessageRow),
      total: count || 0,
    };
  },

  /**
   * Get a specific message by ID
   */
  async getMessage(id: string): Promise<SlackMessage | null> {
    const { data, error } = await supabase
      .from("slack_messages")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[slackService] Error fetching message:", error);
      throw error;
    }

    return data ? transformMessageRow(data) : null;
  },

  /**
   * Get message statistics for an IMO
   */
  async getMessageStats(imoId: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
  }> {
    const { data, error } = await supabase
      .from("slack_messages")
      .select("status")
      .eq("imo_id", imoId);

    if (error) {
      console.error("[slackService] Error fetching message stats:", error);
      throw error;
    }

    const messages = data || [];
    return {
      total: messages.length,
      sent: messages.filter(
        (m) => m.status === "sent" || m.status === "delivered",
      ).length,
      failed: messages.filter((m) => m.status === "failed").length,
      pending: messages.filter(
        (m) => m.status === "pending" || m.status === "retrying",
      ).length,
    };
  },

  // ============================================================================
  // Manual Message Sending (for testing/manual triggers)
  // ============================================================================

  /**
   * Send a test message to a channel
   */
  async sendTestMessage(
    imoId: string,
    channelId: string,
    message: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await supabase.functions.invoke(
      "slack-send-message",
      {
        body: {
          imoId,
          channelId,
          text: message,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: message,
              },
            },
          ],
        },
      },
    );

    if (error) {
      return { ok: false, error: error.message };
    }

    return data;
  },

  /**
   * Manually trigger a leaderboard post
   */
  async postLeaderboard(
    imoId: string,
    agencyId?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await supabase.functions.invoke(
      "slack-daily-leaderboard",
      {
        body: { imoId, agencyId, manual: true },
      },
    );

    if (error) {
      return { ok: false, error: error.message };
    }

    return data;
  },
};

export default slackService;
