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
}
