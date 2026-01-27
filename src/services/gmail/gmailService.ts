// src/services/gmail/gmailService.ts
// Gmail OAuth integration service

import { supabase } from "@/services/base";
import type { GmailIntegration } from "@/types/gmail.types";

class GmailServiceClass {
  /**
   * Initiate Gmail OAuth flow
   * Returns the OAuth URL to redirect the user to
   */
  async initiateOAuth(userId: string, returnUrl?: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke(
      "gmail-oauth-init",
      {
        body: { userId, returnUrl },
      },
    );

    if (error) {
      console.error("[GmailService] Error initiating OAuth:", error);
      throw new Error("Failed to initiate Gmail OAuth");
    }

    if (!data?.ok) {
      if (data?.needsCredentials) {
        throw new Error(
          "Gmail integration not configured. Contact administrator.",
        );
      }
      throw new Error(data?.error || "Failed to generate OAuth URL");
    }

    return data.url;
  }

  /**
   * Get Gmail integration for a specific user
   */
  async getIntegration(userId: string): Promise<GmailIntegration | null> {
    const { data, error } = await supabase
      .from("gmail_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("[GmailService] Error fetching integration:", error);
      throw new Error("Failed to fetch Gmail integration");
    }

    return data as GmailIntegration | null;
  }

  /**
   * Disconnect Gmail integration
   */
  async disconnect(integrationId: string): Promise<void> {
    const { error } = await supabase
      .from("gmail_integrations")
      .update({
        is_active: false,
        connection_status: "disconnected",
      })
      .eq("id", integrationId);

    if (error) {
      console.error("[GmailService] Error disconnecting integration:", error);
      throw new Error("Failed to disconnect Gmail");
    }
  }

  /**
   * Trigger manual inbox sync
   */
  async syncNow(integrationId: string): Promise<void> {
    const { error } = await supabase.functions.invoke("gmail-sync-inbox", {
      body: { integrationId, manual: true },
    });

    if (error) {
      console.error("[GmailService] Error triggering sync:", error);
      throw new Error("Failed to sync Gmail inbox");
    }
  }

  /**
   * Check if user has an active Gmail integration
   */
  async hasActiveIntegration(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("gmail_integrations")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq("connection_status", "connected")
      .maybeSingle();

    if (error) {
      console.error("[GmailService] Error checking integration:", error);
      return false;
    }

    return !!data;
  }

  /**
   * Get sync logs for an integration
   */
  async getSyncLogs(
    integrationId: string,
    limit = 20,
  ): Promise<{
    logs: Array<{
      id: string;
      sync_type: string;
      status: string;
      created_at: string;
    }>;
  }> {
    const { data, error } = await supabase
      .from("gmail_sync_log")
      .select(
        "id, sync_type, status, messages_synced, error_message, created_at",
      )
      .eq("integration_id", integrationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[GmailService] Error fetching sync logs:", error);
      throw new Error("Failed to fetch sync logs");
    }

    return { logs: data || [] };
  }
}

export const gmailService = new GmailServiceClass();
