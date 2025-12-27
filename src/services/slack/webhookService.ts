// src/services/slack/webhookService.ts
// Slack webhook service for multi-workspace notifications without OAuth

import { supabase } from "@/services/base/supabase";
import type {
  SlackWebhook,
  SlackWebhookInsert,
  SlackWebhookUpdate,
} from "@/types/slack.types";

export const webhookService = {
  /**
   * Get all webhooks for an IMO
   */
  async getWebhooks(imoId: string): Promise<SlackWebhook[]> {
    const { data, error } = await supabase
      .from("slack_webhooks")
      .select("*")
      .eq("imo_id", imoId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[webhookService] Error fetching webhooks:", error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get a single webhook by ID
   */
  async getWebhookById(webhookId: string): Promise<SlackWebhook | null> {
    const { data, error } = await supabase
      .from("slack_webhooks")
      .select("*")
      .eq("id", webhookId)
      .maybeSingle();

    if (error) {
      console.error("[webhookService] Error fetching webhook:", error);
      throw error;
    }

    return data;
  },

  /**
   * Add a new webhook
   */
  async addWebhook(input: {
    imoId: string;
    webhookUrl: string;
    channelName: string;
    workspaceName?: string;
  }): Promise<SlackWebhook> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error("User not authenticated");
    }

    const insert: SlackWebhookInsert = {
      imo_id: input.imoId,
      webhook_url: input.webhookUrl,
      channel_name: input.channelName,
      workspace_name: input.workspaceName || null,
      created_by: userData.user.id,
      is_active: true,
      notifications_enabled: true,
      include_client_info: false,
      include_leaderboard: true,
    };

    const { data, error } = await supabase
      .from("slack_webhooks")
      .insert(insert)
      .select()
      .single();

    if (error) {
      console.error("[webhookService] Error adding webhook:", error);
      throw error;
    }

    return data;
  },

  /**
   * Update webhook settings
   */
  async updateWebhook(
    webhookId: string,
    updates: Partial<
      Pick<
        SlackWebhookUpdate,
        | "is_active"
        | "notifications_enabled"
        | "include_client_info"
        | "include_leaderboard"
        | "channel_name"
        | "workspace_name"
      >
    >,
  ): Promise<SlackWebhook> {
    const { data, error } = await supabase
      .from("slack_webhooks")
      .update(updates)
      .eq("id", webhookId)
      .select()
      .single();

    if (error) {
      console.error("[webhookService] Error updating webhook:", error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    const { error } = await supabase
      .from("slack_webhooks")
      .delete()
      .eq("id", webhookId);

    if (error) {
      console.error("[webhookService] Error deleting webhook:", error);
      throw error;
    }
  },

  /**
   * Test a webhook by sending a test message
   */
  async testWebhook(
    webhookUrl: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "Test message from The Standard HQ - webhook is working!",
        }),
      });

      if (response.ok) {
        return { ok: true };
      } else {
        const text = await response.text();
        return { ok: false, error: text || `HTTP ${response.status}` };
      }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  },
};
