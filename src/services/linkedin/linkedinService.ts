// src/services/linkedin/linkedinService.ts
// LinkedIn DM integration service via Unipile - Facade pattern composing all repositories

import { supabase } from "@/services/base/supabase";
import {
  LinkedInIntegrationRepository,
  LinkedInConversationRepository,
  LinkedInMessageRepository,
  LinkedInScheduledMessageRepository,
} from "./repositories";
import type {
  LinkedInIntegration,
  LinkedInConversation,
  LinkedInMessage,
  LinkedInScheduledMessage,
  LinkedInConversationFilters,
  CreateLeadFromLinkedInInput,
} from "@/types/linkedin.types";

class LinkedInServiceClass {
  private integrationRepo: LinkedInIntegrationRepository;
  private conversationRepo: LinkedInConversationRepository;
  private messageRepo: LinkedInMessageRepository;
  private scheduledMessageRepo: LinkedInScheduledMessageRepository;

  constructor() {
    this.integrationRepo = new LinkedInIntegrationRepository();
    this.conversationRepo = new LinkedInConversationRepository();
    this.messageRepo = new LinkedInMessageRepository();
    this.scheduledMessageRepo = new LinkedInScheduledMessageRepository();
  }

  /**
   * Get auth headers for edge function calls
   */
  private async getAuthHeaders(): Promise<{ Authorization: string }> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }
    return { Authorization: `Bearer ${session.access_token}` };
  }

  // ============================================================================
  // OAuth & Integration (Edge Functions via Unipile Hosted Auth)
  // ============================================================================

  /**
   * Initiate LinkedIn OAuth flow via Unipile Hosted Auth
   * Returns the Unipile redirect URL
   */
  async initiateOAuth(
    imoId: string,
    userId: string,
    returnUrl?: string,
    accountType?: "LINKEDIN" | "LINKEDIN_RECRUITER" | "LINKEDIN_SALES_NAV",
  ): Promise<string> {
    const { data, error } = await supabase.functions.invoke(
      "linkedin-hosted-auth-init",
      {
        body: { imoId, userId, returnUrl, accountType },
      },
    );

    if (error) {
      console.error("[LinkedInService] Error initiating OAuth:", error);
      throw new Error("Failed to initiate LinkedIn OAuth");
    }

    if (!data?.ok) {
      if (data?.error?.includes("Account limit reached")) {
        throw new Error(
          "LinkedIn account limit reached. Please contact administrator.",
        );
      }
      if (data?.error?.includes("not have access")) {
        throw new Error(
          "LinkedIn integration not configured for your organization.",
        );
      }
      throw new Error(data?.error || "Failed to generate OAuth URL");
    }

    return data.url;
  }

  /**
   * Get all LinkedIn integrations for an IMO
   */
  async getIntegrations(imoId: string): Promise<LinkedInIntegration[]> {
    return this.integrationRepo.findByImoId(imoId);
  }

  /**
   * Get a single LinkedIn integration by ID
   */
  async getIntegrationById(
    integrationId: string,
  ): Promise<LinkedInIntegration | null> {
    return this.integrationRepo.findById(integrationId);
  }

  /**
   * Get the first active LinkedIn integration for a user
   */
  async getActiveIntegration(
    userId: string,
  ): Promise<LinkedInIntegration | null> {
    return this.integrationRepo.findActiveByUserId(userId);
  }

  /**
   * Check if user has at least one active LinkedIn integration
   */
  async hasActiveIntegration(userId: string): Promise<boolean> {
    const integration = await this.integrationRepo.findActiveByUserId(userId);
    return !!integration;
  }

  /**
   * Disconnect a LinkedIn integration
   */
  async disconnect(integrationId: string): Promise<void> {
    return this.integrationRepo.disconnect(integrationId);
  }

  /**
   * Delete a LinkedIn integration completely
   */
  async deleteIntegration(integrationId: string): Promise<void> {
    return this.integrationRepo.delete(integrationId);
  }

  // ============================================================================
  // Conversations
  // ============================================================================

  /**
   * Sync conversations from Unipile API and store in local DB
   */
  async syncConversations(
    integrationId: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<{
    conversations: LinkedInConversation[];
    hasMore: boolean;
    nextCursor?: string;
    syncedCount: number;
  }> {
    const headers = await this.getAuthHeaders();
    const { data, error } = await supabase.functions.invoke(
      "linkedin-get-conversations",
      {
        headers,
        body: {
          integrationId,
          limit: options?.limit ?? 50,
          cursor: options?.cursor,
          syncToDb: true,
        },
      },
    );

    if (error) {
      console.error("[LinkedInService] Error syncing conversations:", error);
      throw new Error("Failed to sync LinkedIn conversations");
    }

    if (!data?.ok) {
      if (data?.code === "TOKEN_EXPIRED") {
        throw new Error("LinkedIn session expired. Please reconnect.");
      }
      throw new Error(data?.error || "Failed to sync conversations");
    }

    return {
      conversations: data.conversations || [],
      hasMore: !!data.cursor,
      nextCursor: data.cursor,
      syncedCount: data.count || 0,
    };
  }

  /**
   * Get conversations for an integration (from local DB)
   */
  async getConversations(
    integrationId: string,
    filters?: LinkedInConversationFilters,
  ): Promise<LinkedInConversation[]> {
    return this.conversationRepo.findByIntegrationId(integrationId, filters);
  }

  /**
   * Get a single conversation by ID
   */
  async getConversationById(
    conversationId: string,
  ): Promise<LinkedInConversation | null> {
    return this.conversationRepo.findById(conversationId);
  }

  /**
   * Set priority status for a conversation
   */
  async setPriority(
    conversationId: string,
    isPriority: boolean,
    userId: string,
    notes?: string,
  ): Promise<void> {
    return this.conversationRepo.updatePriority(
      conversationId,
      isPriority,
      userId,
      notes,
    );
  }

  /**
   * Update manually-entered contact info for a conversation participant
   */
  async updateContactInfo(
    conversationId: string,
    userId: string,
    contactInfo: {
      email?: string;
      phone?: string;
      notes?: string;
    },
  ): Promise<void> {
    return this.conversationRepo.updateContactInfo(
      conversationId,
      userId,
      contactInfo,
    );
  }

  /**
   * Create a recruiting lead from a LinkedIn conversation
   */
  async createLeadFromConversation(
    input: CreateLeadFromLinkedInInput,
    userId: string,
  ): Promise<string> {
    return this.conversationRepo.createLeadFromConversation(
      input.conversationId,
      userId,
      {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        city: input.city,
        state: input.state,
        availability: input.availability,
        insuranceExperience: input.insuranceExperience,
        whyInterested: input.whyInterested,
      },
    );
  }

  // ============================================================================
  // Messages
  // ============================================================================

  /**
   * Sync messages from Unipile API for a conversation
   */
  async syncMessages(
    conversationId: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<{
    messages: LinkedInMessage[];
    hasMore: boolean;
    nextCursor?: string;
    syncedCount: number;
  }> {
    const headers = await this.getAuthHeaders();
    const { data, error } = await supabase.functions.invoke(
      "linkedin-get-messages",
      {
        headers,
        body: {
          conversationId,
          limit: options?.limit ?? 50,
          cursor: options?.cursor,
          syncToDb: true,
        },
      },
    );

    if (error) {
      console.error("[LinkedInService] Error syncing messages:", error);
      throw new Error("Failed to sync LinkedIn messages");
    }

    if (!data?.ok) {
      if (data?.code === "TOKEN_EXPIRED") {
        throw new Error("LinkedIn session expired. Please reconnect.");
      }
      throw new Error(data?.error || "Failed to sync messages");
    }

    return {
      messages: data.messages || [],
      hasMore: !!data.cursor,
      nextCursor: data.cursor,
      syncedCount: data.count || 0,
    };
  }

  /**
   * Send a message via Unipile API
   */
  async sendMessage(
    conversationId: string,
    messageText: string,
    templateId?: string,
  ): Promise<LinkedInMessage> {
    const headers = await this.getAuthHeaders();
    const { data, error } = await supabase.functions.invoke(
      "linkedin-send-message",
      {
        headers,
        body: {
          conversationId,
          messageText,
          templateId,
        },
      },
    );

    if (error) {
      console.error("[LinkedInService] Error sending message:", error);
      throw new Error("Failed to send LinkedIn message");
    }

    if (!data?.ok) {
      if (data?.code === "TOKEN_EXPIRED") {
        throw new Error("LinkedIn session expired. Please reconnect.");
      }
      if (data?.code === "RATE_LIMITED") {
        throw new Error(
          "LinkedIn API rate limit reached. Please try again later.",
        );
      }
      throw new Error(data?.error || "Failed to send message");
    }

    return data.message;
  }

  /**
   * Get messages for a conversation (from local DB)
   */
  async getMessages(
    conversationId: string,
    limit?: number,
    offset?: number,
  ): Promise<{ messages: LinkedInMessage[]; total: number }> {
    return this.messageRepo.findByConversationId(conversationId, limit, offset);
  }

  // ============================================================================
  // Scheduled Messages
  // ============================================================================

  /**
   * Get scheduled messages for a conversation
   */
  async getScheduledMessages(
    conversationId: string,
  ): Promise<LinkedInScheduledMessage[]> {
    return this.scheduledMessageRepo.findPendingByConversationId(
      conversationId,
    );
  }

  /**
   * Cancel a scheduled message
   */
  async cancelScheduledMessage(messageId: string): Promise<void> {
    return this.scheduledMessageRepo.cancel(messageId);
  }

  /**
   * Schedule a message for future sending
   * LinkedIn doesn't have a 24-hour window, so we optionally validate against validUntil
   */
  async scheduleMessage(
    conversationId: string,
    messageText: string,
    scheduledFor: Date,
    userId: string,
    templateId?: string,
    validUntil?: Date,
  ): Promise<LinkedInScheduledMessage> {
    // Validate message content
    if (!messageText || messageText.trim().length === 0) {
      throw new Error("Message text is required");
    }
    if (messageText.length > 8000) {
      throw new Error("Message exceeds 8000 character limit");
    }

    // Get conversation to verify ownership
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Verify user ownership
    const ownsConversation = await this.conversationRepo.verifyOwnership(
      conversationId,
      userId,
    );
    if (!ownsConversation) {
      throw new Error("Access denied to this conversation");
    }

    const now = new Date();

    // Validate scheduled time is in the future
    if (scheduledFor <= now) {
      throw new Error("Scheduled time must be in the future");
    }

    // Validate scheduled time is before validUntil if provided
    if (validUntil && scheduledFor >= validUntil) {
      throw new Error(
        "Scheduled time must be before the validity window expires",
      );
    }

    // Create the scheduled message
    return this.scheduledMessageRepo.create({
      conversation_id: conversationId,
      message_text: messageText.trim(),
      template_id: templateId || null,
      scheduled_for: scheduledFor.toISOString(),
      scheduled_by: userId,
      valid_until: validUntil?.toISOString() || null,
      status: "pending",
      is_auto_reminder: false,
    });
  }

  /**
   * Find pending auto-reminders for a conversation
   */
  async getPendingAutoReminders(
    conversationId: string,
  ): Promise<LinkedInScheduledMessage[]> {
    return this.scheduledMessageRepo.findPendingAutoReminders(conversationId);
  }
}

// Singleton export
export const linkedinService = new LinkedInServiceClass();
export default linkedinService;
