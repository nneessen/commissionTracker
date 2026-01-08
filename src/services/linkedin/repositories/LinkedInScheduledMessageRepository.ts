// src/services/linkedin/repositories/LinkedInScheduledMessageRepository.ts
import { BaseRepository } from "@/services/base/BaseRepository";
import type {
  LinkedInScheduledMessage,
  LinkedInScheduledMessageRow,
  LinkedInScheduledMessageInsert,
  LinkedInScheduledMessageUpdate,
} from "@/types/linkedin.types";

export class LinkedInScheduledMessageRepository extends BaseRepository<
  LinkedInScheduledMessage,
  LinkedInScheduledMessageInsert,
  LinkedInScheduledMessageUpdate
> {
  constructor() {
    super("linkedin_scheduled_messages");
  }

  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): LinkedInScheduledMessage {
    const row = dbRecord as unknown as LinkedInScheduledMessageRow;
    const now = new Date();
    const scheduledFor = new Date(row.scheduled_for);
    const validUntil = row.valid_until ? new Date(row.valid_until) : null;

    return {
      ...row,
      isPastDue: scheduledFor < now && row.status === "pending",
      isExpired:
        validUntil !== null && validUntil < now && row.status === "pending",
    };
  }

  protected transformToDB(
    data: LinkedInScheduledMessageInsert | LinkedInScheduledMessageUpdate,
  ): Record<string, unknown> {
    return { ...data };
  }

  /**
   * Find pending scheduled messages for a conversation
   */
  async findPendingByConversationId(
    conversationId: string,
  ): Promise<LinkedInScheduledMessage[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("status", "pending")
      .order("scheduled_for", { ascending: true });

    if (error) throw this.handleError(error, "findPendingByConversationId");
    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Cancel a pending scheduled message
   */
  async cancel(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "pending");

    if (error) throw this.handleError(error, "cancel");
  }

  /**
   * Create a new scheduled message
   */
  async create(
    data: LinkedInScheduledMessageInsert,
  ): Promise<LinkedInScheduledMessage> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert({
        ...data,
        status: data.status || "pending",
        retry_count: 0,
      })
      .select()
      .single();

    if (error) throw this.handleError(error, "create");
    return this.transformFromDB(result);
  }

  /**
   * Find pending auto-reminders for a conversation (to prevent duplicates)
   */
  async findPendingAutoReminders(
    conversationId: string,
  ): Promise<LinkedInScheduledMessage[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("status", "pending")
      .eq("is_auto_reminder", true)
      .order("scheduled_for", { ascending: true });

    if (error) throw this.handleError(error, "findPendingAutoReminders");
    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Mark a scheduled message as sent
   */
  async markSent(id: string, sentMessageId: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_message_id: sentMessageId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "pending");

    if (error) throw this.handleError(error, "markSent");
  }

  /**
   * Mark a scheduled message as failed with error message
   */
  async markFailed(
    id: string,
    errorMessage: string,
    incrementRetry = true,
  ): Promise<void> {
    // First get current retry count if we need to increment
    if (incrementRetry) {
      const { data: current } = await this.client
        .from(this.tableName)
        .select("retry_count")
        .eq("id", id)
        .single();

      const newRetryCount = (current?.retry_count || 0) + 1;
      const newStatus = newRetryCount >= 3 ? "failed" : "pending";

      const { error } = await this.client
        .from(this.tableName)
        .update({
          status: newStatus,
          error_message: errorMessage,
          retry_count: newRetryCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw this.handleError(error, "markFailed");
    } else {
      const { error } = await this.client
        .from(this.tableName)
        .update({
          status: "failed",
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw this.handleError(error, "markFailed");
    }
  }

  /**
   * Mark a scheduled message as expired (validity window closed before send)
   */
  async markExpired(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .update({
        status: "expired",
        error_message: "Validity window expired before scheduled send time",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "pending");

    if (error) throw this.handleError(error, "markExpired");
  }
}
