// src/services/instagram/repositories/InstagramMessageRepository.ts
import { BaseRepository } from "@/services/base/BaseRepository";
import type {
  InstagramMessage,
  InstagramMessageRow,
  InstagramMessageInsert,
} from "@/types/instagram.types";

export class InstagramMessageRepository extends BaseRepository<
  InstagramMessage,
  InstagramMessageInsert,
  never // Messages are insert-only, no updates
> {
  constructor() {
    super("instagram_messages");
  }

  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): InstagramMessage {
    const row = dbRecord as unknown as InstagramMessageRow;
    return {
      ...row,
      isOutbound: row.direction === "outbound",
      formattedSentAt: row.sent_at
        ? new Date(row.sent_at).toLocaleString()
        : undefined,
    };
  }

  protected transformToDB(
    data: InstagramMessageInsert,
  ): Record<string, unknown> {
    return { ...data };
  }

  /**
   * Find messages by conversation ID with pagination
   */
  async findByConversationId(
    conversationId: string,
    limit?: number,
    offset?: number,
  ): Promise<{ messages: InstagramMessage[]; total: number }> {
    let query = this.client
      .from(this.tableName)
      .select("*", { count: "exact" })
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: false });

    // Use range for pagination (not limit + range together)
    if (limit !== undefined && offset !== undefined) {
      query = query.range(offset, offset + limit - 1);
    } else if (limit !== undefined) {
      query = query.limit(limit);
    }

    const { data, error, count } = await query;
    if (error) throw this.handleError(error, "findByConversationId");

    return {
      messages: (data || []).map((row) => this.transformFromDB(row)),
      total: count || 0,
    };
  }
}
