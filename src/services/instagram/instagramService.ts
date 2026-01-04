// src/services/instagram/InstagramService.ts
// Instagram DM integration service - Facade pattern composing all repositories

import { supabase } from "@/services/base/supabase";
import {
  InstagramIntegrationRepository,
  InstagramConversationRepository,
  InstagramMessageRepository,
  InstagramScheduledMessageRepository,
  InstagramTemplateRepository,
} from "./repositories";
import type {
  InstagramIntegration,
  InstagramConversation,
  InstagramMessage,
  InstagramScheduledMessage,
  InstagramMessageTemplate,
  InstagramMessageTemplateInsert,
  InstagramMessageTemplateUpdate,
  ConversationFilters,
  CreateLeadFromIGInput,
} from "@/types/instagram.types";

class InstagramServiceClass {
  private integrationRepo: InstagramIntegrationRepository;
  private conversationRepo: InstagramConversationRepository;
  private messageRepo: InstagramMessageRepository;
  private scheduledMessageRepo: InstagramScheduledMessageRepository;
  private templateRepo: InstagramTemplateRepository;

  constructor() {
    this.integrationRepo = new InstagramIntegrationRepository();
    this.conversationRepo = new InstagramConversationRepository();
    this.messageRepo = new InstagramMessageRepository();
    this.scheduledMessageRepo = new InstagramScheduledMessageRepository();
    this.templateRepo = new InstagramTemplateRepository();
  }

  // ============================================================================
  // OAuth & Integration (Edge Functions)
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
      console.error("[InstagramService] Error initiating OAuth:", error);
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
  }

  /**
   * Get all Instagram integrations for an IMO
   */
  async getIntegrations(imoId: string): Promise<InstagramIntegration[]> {
    return this.integrationRepo.findByImoId(imoId);
  }

  /**
   * Get a single Instagram integration by ID
   */
  async getIntegrationById(
    integrationId: string,
  ): Promise<InstagramIntegration | null> {
    return this.integrationRepo.findById(integrationId);
  }

  /**
   * Get the first active Instagram integration for a user
   */
  async getActiveIntegration(
    userId: string,
  ): Promise<InstagramIntegration | null> {
    return this.integrationRepo.findActiveByUserId(userId);
  }

  /**
   * Check if user has at least one active Instagram integration
   */
  async hasActiveIntegration(userId: string): Promise<boolean> {
    const integration = await this.integrationRepo.findActiveByUserId(userId);
    return !!integration;
  }

  /**
   * Disconnect an Instagram integration
   */
  async disconnect(integrationId: string): Promise<void> {
    return this.integrationRepo.disconnect(integrationId);
  }

  /**
   * Delete an Instagram integration completely
   */
  async deleteIntegration(integrationId: string): Promise<void> {
    return this.integrationRepo.delete(integrationId);
  }

  // ============================================================================
  // Conversations
  // ============================================================================

  /**
   * Get conversations for an integration
   */
  async getConversations(
    integrationId: string,
    filters?: ConversationFilters,
  ): Promise<InstagramConversation[]> {
    return this.conversationRepo.findByIntegrationId(integrationId, filters);
  }

  /**
   * Get a single conversation by ID
   */
  async getConversationById(
    conversationId: string,
  ): Promise<InstagramConversation | null> {
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
   * Create a recruiting lead from an Instagram conversation
   * Requires userId for authorization verification
   */
  async createLeadFromConversation(
    input: CreateLeadFromIGInput,
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
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    limit?: number,
    offset?: number,
  ): Promise<{ messages: InstagramMessage[]; total: number }> {
    return this.messageRepo.findByConversationId(conversationId, limit, offset);
  }

  // ============================================================================
  // Templates
  // ============================================================================

  /**
   * Get message templates for an IMO
   */
  async getTemplates(imoId: string): Promise<InstagramMessageTemplate[]> {
    return this.templateRepo.findActiveByImoId(imoId);
  }

  /**
   * Create a new message template
   */
  async createTemplate(
    template: InstagramMessageTemplateInsert,
  ): Promise<InstagramMessageTemplate> {
    return this.templateRepo.create(template);
  }

  /**
   * Update a message template
   */
  async updateTemplate(
    templateId: string,
    updates: InstagramMessageTemplateUpdate,
  ): Promise<InstagramMessageTemplate> {
    return this.templateRepo.update(templateId, {
      ...updates,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Delete a message template (soft delete)
   */
  async deleteTemplate(templateId: string): Promise<void> {
    return this.templateRepo.softDelete(templateId);
  }

  // ============================================================================
  // Scheduled Messages
  // ============================================================================

  /**
   * Get scheduled messages for a conversation
   */
  async getScheduledMessages(
    conversationId: string,
  ): Promise<InstagramScheduledMessage[]> {
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
   * Validates that scheduled time is within the messaging window
   */
  async scheduleMessage(
    conversationId: string,
    messageText: string,
    scheduledFor: Date,
    userId: string,
    templateId?: string,
  ): Promise<InstagramScheduledMessage> {
    // Validate message content
    if (!messageText || messageText.trim().length === 0) {
      throw new Error("Message text is required");
    }
    if (messageText.length > 1000) {
      throw new Error("Message exceeds 1000 character limit");
    }

    // Get conversation to verify ownership and check window
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Verify user ownership through conversation repository
    const ownsConversation = await this.conversationRepo.verifyOwnership(
      conversationId,
      userId,
    );
    if (!ownsConversation) {
      throw new Error("Access denied to this conversation");
    }

    // Check messaging window
    if (!conversation.can_reply_until) {
      throw new Error(
        "Cannot schedule message: messaging window is closed. Wait for the contact to message you first.",
      );
    }

    const windowExpiry = new Date(conversation.can_reply_until);
    const now = new Date();

    if (windowExpiry <= now) {
      throw new Error(
        "Cannot schedule message: messaging window has expired. Wait for the contact to message you first.",
      );
    }

    // Validate scheduled time is in the future
    if (scheduledFor <= now) {
      throw new Error("Scheduled time must be in the future");
    }

    // Validate scheduled time is before window expiry
    if (scheduledFor >= windowExpiry) {
      throw new Error(
        "Scheduled time must be before the messaging window expires",
      );
    }

    // Create the scheduled message
    return this.scheduledMessageRepo.create({
      conversation_id: conversationId,
      message_text: messageText.trim(),
      template_id: templateId || null,
      scheduled_for: scheduledFor.toISOString(),
      scheduled_by: userId,
      messaging_window_expires_at: conversation.can_reply_until,
      status: "pending",
      is_auto_reminder: false,
    });
  }

  /**
   * Find pending auto-reminders for a conversation
   */
  async getPendingAutoReminders(
    conversationId: string,
  ): Promise<InstagramScheduledMessage[]> {
    return this.scheduledMessageRepo.findPendingAutoReminders(conversationId);
  }
}

// Singleton export
export const instagramService = new InstagramServiceClass();
export default instagramService;
