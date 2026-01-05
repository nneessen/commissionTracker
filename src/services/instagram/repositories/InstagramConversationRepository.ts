// src/services/instagram/repositories/InstagramConversationRepository.ts
import { BaseRepository } from "@/services/base/BaseRepository";
import type {
  InstagramConversation,
  InstagramConversationRow,
  InstagramConversationInsert,
  InstagramConversationUpdate,
  ConversationFilters,
} from "@/types/instagram.types";
import {
  getWindowStatus,
  getWindowTimeRemaining,
} from "@/types/instagram.types";

export class InstagramConversationRepository extends BaseRepository<
  InstagramConversation,
  InstagramConversationInsert,
  InstagramConversationUpdate
> {
  constructor() {
    super("instagram_conversations");
  }

  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): InstagramConversation {
    const row = dbRecord as unknown as InstagramConversationRow;
    return {
      ...row,
      windowStatus: getWindowStatus(row.can_reply_until),
      windowTimeRemaining: getWindowTimeRemaining(row.can_reply_until),
      hasLinkedLead: !!row.recruiting_lead_id,
    };
  }

  protected transformToDB(
    data: InstagramConversationInsert | InstagramConversationUpdate,
  ): Record<string, unknown> {
    return { ...data };
  }

  /**
   * Find conversations by integration ID with optional filters
   */
  async findByIntegrationId(
    integrationId: string,
    filters?: ConversationFilters,
  ): Promise<InstagramConversation[]> {
    let query = this.client
      .from(this.tableName)
      .select("*")
      .eq("integration_id", integrationId)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (filters?.isPriority !== undefined) {
      query = query.eq("is_priority", filters.isPriority);
    }
    if (filters?.hasUnread) {
      query = query.gt("unread_count", 0);
    }
    if (filters?.hasOpenWindow) {
      query = query.gt("can_reply_until", new Date().toISOString());
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
    if (error) throw this.handleError(error, "findByIntegrationId");
    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Update priority status for a conversation
   */
  async updatePriority(
    id: string,
    isPriority: boolean,
    userId: string,
    notes?: string,
  ): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .update({
        is_priority: isPriority,
        priority_set_at: isPriority ? new Date().toISOString() : null,
        priority_set_by: isPriority ? userId : null,
        priority_notes: isPriority ? notes || null : null,
      })
      .eq("id", id);

    if (error) throw this.handleError(error, "updatePriority");
  }

  /**
   * Update manually-entered contact info for a conversation participant
   * Requires userId for authorization verification
   */
  async updateContactInfo(
    id: string,
    userId: string,
    contactInfo: {
      email?: string;
      phone?: string;
      notes?: string;
    },
  ): Promise<void> {
    // Verify ownership before updating
    const owned = await this.verifyOwnership(id, userId);
    if (!owned) {
      throw new Error("Unauthorized: You do not own this conversation");
    }

    const { error } = await this.client
      .from(this.tableName)
      .update({
        participant_email: contactInfo.email ?? null,
        participant_phone: contactInfo.phone ?? null,
        contact_notes: contactInfo.notes ?? null,
      })
      .eq("id", id);

    if (error) throw this.handleError(error, "updateContactInfo");
  }

  /**
   * Verify that a user owns the conversation (via integration ownership)
   * Returns the conversation if owned, null otherwise
   */
  async verifyOwnership(
    conversationId: string,
    userId: string,
  ): Promise<InstagramConversation | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(
        `
        *,
        instagram_integrations!inner (
          user_id
        )
      `,
      )
      .eq("id", conversationId)
      .eq("instagram_integrations.user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found or not owned
      }
      throw this.handleError(error, "verifyOwnership");
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Create a recruiting lead from an Instagram conversation
   * Verifies ownership before creating the lead
   */
  async createLeadFromConversation(
    conversationId: string,
    userId: string,
    leadData: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      city?: string;
      state?: string;
      availability?: string;
      insuranceExperience?: string;
      whyInterested?: string;
    },
  ): Promise<string> {
    // Verify ownership first
    const conversation = await this.verifyOwnership(conversationId, userId);
    if (!conversation) {
      throw new Error(
        "Conversation not found or you do not have permission to access it",
      );
    }

    // Check if already linked to a lead
    if (conversation.hasLinkedLead) {
      throw new Error("This conversation is already linked to a lead");
    }

    // Call RPC to create lead
    const { data, error } = await this.client.rpc(
      "create_lead_from_instagram",
      {
        p_conversation_id: conversationId,
        p_first_name: leadData.firstName,
        p_last_name: leadData.lastName,
        p_email: leadData.email,
        p_phone: leadData.phone,
        p_city: leadData.city || "",
        p_state: leadData.state || "",
        p_availability: leadData.availability || "exploring",
        p_insurance_experience: leadData.insuranceExperience || "none",
        p_why_interested:
          leadData.whyInterested || "Contacted via Instagram DM",
      },
    );

    if (error) throw this.handleError(error, "createLeadFromConversation");

    // Validate return type
    if (typeof data !== "string" || !data) {
      throw new Error("Failed to create lead: invalid response from database");
    }

    return data;
  }
}
