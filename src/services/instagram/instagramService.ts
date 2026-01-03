// src/services/instagram/instagramService.ts
// Instagram DM integration service for managing account connections and messaging

import { supabase } from "@/services/base/supabase";
import {
  getWindowStatus,
  getWindowTimeRemaining,
} from "@/types/instagram.types";
import type {
  InstagramIntegration,
  InstagramIntegrationRow,
  InstagramConversation,
  InstagramConversationRow,
  InstagramMessage,
  InstagramMessageRow,
  InstagramMessageTemplate,
  InstagramMessageTemplateRow,
  InstagramScheduledMessage,
  InstagramScheduledMessageRow,
  ConversationFilters,
} from "@/types/instagram.types";

/**
 * Transform database row to InstagramIntegration with computed fields
 */
function transformIntegrationRow(
  row: InstagramIntegrationRow,
): InstagramIntegration {
  const now = new Date();
  const expiresAt = row.token_expires_at
    ? new Date(row.token_expires_at)
    : null;

  // Token is expiring soon if within 7 days
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    ...row,
    isConnected: row.is_active && row.connection_status === "connected",
    tokenExpiringSoon: expiresAt ? expiresAt < sevenDaysFromNow : false,
  };
}

/**
 * Transform database row to InstagramConversation with computed fields
 */
function transformConversationRow(
  row: InstagramConversationRow,
): InstagramConversation {
  return {
    ...row,
    windowStatus: getWindowStatus(row.can_reply_until),
    windowTimeRemaining: getWindowTimeRemaining(row.can_reply_until),
    hasLinkedLead: !!row.recruiting_lead_id,
  };
}

/**
 * Transform database row to InstagramMessage with computed fields
 */
function transformMessageRow(row: InstagramMessageRow): InstagramMessage {
  return {
    ...row,
    isOutbound: row.direction === "outbound",
    formattedSentAt: row.sent_at
      ? new Date(row.sent_at).toLocaleString()
      : undefined,
  };
}

/**
 * Transform database row to InstagramScheduledMessage with computed fields
 */
function transformScheduledMessageRow(
  row: InstagramScheduledMessageRow,
): InstagramScheduledMessage {
  const now = new Date();
  const scheduledFor = new Date(row.scheduled_for);
  const windowExpires = new Date(row.messaging_window_expires_at);

  return {
    ...row,
    isPastDue: scheduledFor < now && row.status === "pending",
    isWindowExpired: windowExpires < now,
  };
}

export const instagramService = {
  // ============================================================================
  // OAuth & Integration Management
  // ============================================================================

  /**
   * Initiate Instagram OAuth flow
   * Returns the OAuth URL to redirect the user to
   */
  async initiateOAuth(
    imoId: string,
    userId: string,
    returnUrl?: string,
  ): Promise<string> {
    const { data, error } = await supabase.functions.invoke(
      "instagram-oauth-init",
      {
        body: { imoId, userId, returnUrl },
      },
    );

    if (error) {
      console.error("[instagramService] Error initiating OAuth:", error);
      throw new Error("Failed to initiate Instagram OAuth");
    }

    if (!data?.ok) {
      if (data?.upgradeRequired) {
        throw new Error(
          "Instagram DM integration requires Team tier subscription",
        );
      }
      if (data?.needsCredentials) {
        throw new Error(
          "Instagram integration not configured. Contact administrator.",
        );
      }
      throw new Error(data?.error || "Failed to generate OAuth URL");
    }

    return data.url;
  },

  /**
   * Get all Instagram integrations for an IMO
   */
  async getIntegrations(imoId: string): Promise<InstagramIntegration[]> {
    const { data, error } = await supabase
      .from("instagram_integrations")
      .select("*")
      .eq("imo_id", imoId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[instagramService] Error fetching integrations:", error);
      throw error;
    }

    return (data || []).map(transformIntegrationRow);
  },

  /**
   * Get a single Instagram integration by ID
   */
  async getIntegrationById(
    integrationId: string,
  ): Promise<InstagramIntegration | null> {
    const { data, error } = await supabase
      .from("instagram_integrations")
      .select("*")
      .eq("id", integrationId)
      .maybeSingle();

    if (error) {
      console.error("[instagramService] Error fetching integration:", error);
      throw error;
    }

    return data ? transformIntegrationRow(data) : null;
  },

  /**
   * Get the first active Instagram integration for a user
   */
  async getActiveIntegration(
    userId: string,
  ): Promise<InstagramIntegration | null> {
    const { data, error } = await supabase
      .from("instagram_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq("connection_status", "connected")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "[instagramService] Error fetching active integration:",
        error,
      );
      throw error;
    }

    return data ? transformIntegrationRow(data) : null;
  },

  /**
   * Check if user has at least one active Instagram integration
   */
  async hasActiveIntegration(userId: string): Promise<boolean> {
    const integration = await this.getActiveIntegration(userId);
    return !!integration;
  },

  /**
   * Disconnect an Instagram integration
   */
  async disconnect(integrationId: string): Promise<void> {
    const { error } = await supabase
      .from("instagram_integrations")
      .update({
        is_active: false,
        connection_status: "disconnected",
      })
      .eq("id", integrationId);

    if (error) {
      console.error("[instagramService] Error disconnecting:", error);
      throw error;
    }
  },

  /**
   * Delete an Instagram integration completely
   */
  async deleteIntegration(integrationId: string): Promise<void> {
    const { error } = await supabase
      .from("instagram_integrations")
      .delete()
      .eq("id", integrationId);

    if (error) {
      console.error("[instagramService] Error deleting integration:", error);
      throw error;
    }
  },

  // ============================================================================
  // Conversations (Placeholder - will be implemented in Milestone 4)
  // ============================================================================

  /**
   * Get conversations for an integration
   */
  async getConversations(
    integrationId: string,
    filters?: ConversationFilters,
  ): Promise<InstagramConversation[]> {
    let query = supabase
      .from("instagram_conversations")
      .select("*")
      .eq("integration_id", integrationId)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (filters?.isPriority !== undefined) {
      query = query.eq("is_priority", filters.isPriority);
    }

    if (filters?.hasUnread) {
      query = query.gt("unread_count", 0);
    }

    if (filters?.search) {
      query = query.or(
        `participant_username.ilike.%${filters.search}%,participant_name.ilike.%${filters.search}%`,
      );
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 50) - 1,
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("[instagramService] Error fetching conversations:", error);
      throw error;
    }

    return (data || []).map(transformConversationRow);
  },

  /**
   * Get a single conversation by ID
   */
  async getConversationById(
    conversationId: string,
  ): Promise<InstagramConversation | null> {
    const { data, error } = await supabase
      .from("instagram_conversations")
      .select("*")
      .eq("id", conversationId)
      .maybeSingle();

    if (error) {
      console.error("[instagramService] Error fetching conversation:", error);
      throw error;
    }

    return data ? transformConversationRow(data) : null;
  },

  // ============================================================================
  // Messages (Placeholder - will be implemented in Milestone 4)
  // ============================================================================

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    limit?: number,
    offset?: number,
  ): Promise<{ messages: InstagramMessage[]; total: number }> {
    let query = supabase
      .from("instagram_messages")
      .select("*", { count: "exact" })
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.range(offset, offset + (limit || 50) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[instagramService] Error fetching messages:", error);
      throw error;
    }

    return {
      messages: (data || []).map(transformMessageRow),
      total: count || 0,
    };
  },

  // ============================================================================
  // Priority & Leads (Placeholder - will be implemented in Milestone 5)
  // ============================================================================

  /**
   * Set priority status for a conversation
   */
  async setPriority(
    conversationId: string,
    isPriority: boolean,
    userId: string,
    notes?: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("instagram_conversations")
      .update({
        is_priority: isPriority,
        priority_set_at: isPriority ? new Date().toISOString() : null,
        priority_set_by: isPriority ? userId : null,
        priority_notes: isPriority ? notes || null : null,
      })
      .eq("id", conversationId);

    if (error) {
      console.error("[instagramService] Error setting priority:", error);
      throw error;
    }
  },

  // ============================================================================
  // Templates
  // ============================================================================

  /**
   * Get message templates for an IMO
   */
  async getTemplates(imoId: string): Promise<InstagramMessageTemplate[]> {
    const { data, error } = await supabase
      .from("instagram_message_templates")
      .select("*")
      .eq("imo_id", imoId)
      .eq("is_active", true)
      .order("use_count", { ascending: false });

    if (error) {
      console.error("[instagramService] Error fetching templates:", error);
      throw error;
    }

    return data || [];
  },

  /**
   * Create a new message template
   */
  async createTemplate(
    template: Omit<
      InstagramMessageTemplateRow,
      "id" | "created_at" | "updated_at" | "use_count" | "last_used_at"
    >,
  ): Promise<InstagramMessageTemplate> {
    const { data, error } = await supabase
      .from("instagram_message_templates")
      .insert(template)
      .select()
      .single();

    if (error) {
      console.error("[instagramService] Error creating template:", error);
      throw error;
    }

    return data;
  },

  /**
   * Update a message template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<InstagramMessageTemplateRow>,
  ): Promise<InstagramMessageTemplate> {
    const { data, error } = await supabase
      .from("instagram_message_templates")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", templateId)
      .select()
      .single();

    if (error) {
      console.error("[instagramService] Error updating template:", error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a message template (soft delete)
   */
  async deleteTemplate(templateId: string): Promise<void> {
    const { error } = await supabase
      .from("instagram_message_templates")
      .update({ is_active: false })
      .eq("id", templateId);

    if (error) {
      console.error("[instagramService] Error deleting template:", error);
      throw error;
    }
  },

  // ============================================================================
  // Scheduled Messages (Placeholder - will be implemented in Milestone 7)
  // ============================================================================

  /**
   * Get scheduled messages for a conversation
   */
  async getScheduledMessages(
    conversationId: string,
  ): Promise<InstagramScheduledMessage[]> {
    const { data, error } = await supabase
      .from("instagram_scheduled_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("status", "pending")
      .order("scheduled_for", { ascending: true });

    if (error) {
      console.error(
        "[instagramService] Error fetching scheduled messages:",
        error,
      );
      throw error;
    }

    return (data || []).map(transformScheduledMessageRow);
  },

  /**
   * Cancel a scheduled message
   */
  async cancelScheduledMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from("instagram_scheduled_messages")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .eq("status", "pending");

    if (error) {
      console.error(
        "[instagramService] Error cancelling scheduled message:",
        error,
      );
      throw error;
    }
  },
};

export default instagramService;
