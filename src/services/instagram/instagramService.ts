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
}

// Singleton export
export const instagramService = new InstagramServiceClass();
export default instagramService;
