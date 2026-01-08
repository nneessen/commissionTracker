// src/services/linkedin/repositories/LinkedInMessageRepository.ts
import { BaseRepository } from "@/services/base/BaseRepository";
import type {
  LinkedInMessage,
  LinkedInMessageRow,
  LinkedInMessageInsert,
} from "@/types/linkedin.types";

export class LinkedInMessageRepository extends BaseRepository<
  LinkedInMessage,
  LinkedInMessageInsert,
  never // Messages are insert-only, no updates
> {
  constructor() {
    super("linkedin_messages");
  }

  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): LinkedInMessage {
    const row = dbRecord as unknown as LinkedInMessageRow;
    return {
      ...row,
      isOutbound: row.direction === "outbound",
      formattedSentAt: row.sent_at
        ? new Date(row.sent_at).toLocaleString()
        : undefined,
    };
  }

  protected transformToDB(
    data: LinkedInMessageInsert,
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
  ): Promise<{ messages: LinkedInMessage[]; total: number }> {
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

  /**
   * Find message by Unipile message ID
   */
  async findByUnipileMessageId(
    unipileMessageId: string,
  ): Promise<LinkedInMessage | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("unipile_message_id", unipileMessageId)
      .maybeSingle();

    if (error) throw this.handleError(error, "findByUnipileMessageId");
    return data ? this.transformFromDB(data) : null;
  }
}
