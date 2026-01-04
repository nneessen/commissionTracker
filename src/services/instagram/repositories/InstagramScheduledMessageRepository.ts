// src/services/instagram/repositories/InstagramScheduledMessageRepository.ts
import { BaseRepository } from "@/services/base/BaseRepository";
import type {
  InstagramScheduledMessage,
  InstagramScheduledMessageRow,
  InstagramScheduledMessageInsert,
  InstagramScheduledMessageUpdate,
} from "@/types/instagram.types";

export class InstagramScheduledMessageRepository extends BaseRepository<
  InstagramScheduledMessage,
  InstagramScheduledMessageInsert,
  InstagramScheduledMessageUpdate
> {
  constructor() {
    super("instagram_scheduled_messages");
  }

  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): InstagramScheduledMessage {
    const row = dbRecord as unknown as InstagramScheduledMessageRow;
    const now = new Date();
    const scheduledFor = new Date(row.scheduled_for);
    const windowExpires = new Date(row.messaging_window_expires_at);

    return {
      ...row,
      isPastDue: scheduledFor < now && row.status === "pending",
      isWindowExpired: windowExpires < now,
    };
  }

  protected transformToDB(
    data: InstagramScheduledMessageInsert | InstagramScheduledMessageUpdate,
  ): Record<string, unknown> {
    return { ...data };
  }

  /**
   * Find pending scheduled messages for a conversation
   */
  async findPendingByConversationId(
    conversationId: string,
  ): Promise<InstagramScheduledMessage[]> {
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
    data: InstagramScheduledMessageInsert,
  ): Promise<InstagramScheduledMessage> {
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
  ): Promise<InstagramScheduledMessage[]> {
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
   * Mark a scheduled message as expired (window closed before send)
   */
  async markExpired(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .update({
        status: "expired",
        error_message: "Messaging window expired before scheduled send time",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "pending");

    if (error) throw this.handleError(error, "markExpired");
  }
}
