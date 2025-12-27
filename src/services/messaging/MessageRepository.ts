// src/services/messaging/MessageRepository.ts

import { BaseRepository, BaseEntity } from "../base/BaseRepository";
import type { Database } from "@/types/database.types";
import type { Message } from "@/types/messaging.types";

// DB types from database.types.ts
type _MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];
type MessageUpdate = Database["public"]["Tables"]["messages"]["Update"];

// Entity type extending BaseEntity for BaseRepository compatibility
type MessageEntity = Message & BaseEntity;

export class MessageRepository extends BaseRepository<
  MessageEntity,
  MessageInsert,
  MessageUpdate
> {
  constructor() {
    super("messages");
  }

  protected transformFromDB(dbRecord: Record<string, unknown>): MessageEntity {
    return {
      id: dbRecord.id as string,
      thread_id: dbRecord.thread_id as string,
      sender_id: dbRecord.sender_id as string,
      content: dbRecord.content as string,
      read_by: (dbRecord.read_by as string[]) || [],
      created_at: (dbRecord.created_at as string) || "",
      updated_at: (dbRecord.updated_at as string) || "",
      // Optional joined data
      sender: dbRecord.sender as MessageEntity["sender"],
    } as MessageEntity;
  }

  protected transformToDB(
    data: MessageInsert | MessageUpdate,
    _isUpdate = false,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if ("thread_id" in data && data.thread_id !== undefined) {
      result.thread_id = data.thread_id;
    }
    if ("sender_id" in data && data.sender_id !== undefined) {
      result.sender_id = data.sender_id;
    }
    if ("content" in data && data.content !== undefined) {
      result.content = data.content;
    }
    if ("read_by" in data) {
      result.read_by = data.read_by;
    }

    return result;
  }

  /**
   * Find all messages in a thread
   */
  async findByThreadId(threadId: string): Promise<MessageEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(
        `
        *,
        sender:user_profiles!sender_id(id, first_name, last_name, profile_photo_url)
      `,
      )
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      throw this.handleError(error, "findByThreadId");
    }

    return (data || []).map((item) => this.transformFromDB(item));
  }

  /**
   * Create a message with sender profile included in response
   */
  async createWithSender(data: MessageInsert): Promise<MessageEntity> {
    const { data: message, error } = await this.client
      .from(this.tableName)
      .insert(this.transformToDB(data))
      .select(
        `
        *,
        sender:user_profiles!sender_id(id, first_name, last_name, profile_photo_url)
      `,
      )
      .single();

    if (error) {
      throw this.handleError(error, "createWithSender");
    }

    return this.transformFromDB(message);
  }

  /**
   * Add user to message's read_by array via RPC
   */
  async markAsRead(messageId: string, userId: string): Promise<void> {
    const { error } = await this.client.rpc("add_to_read_by", {
      message_id: messageId,
      user_id: userId,
    });

    if (error) {
      // Log but don't throw - marking as read is not critical
      console.error(`Failed to mark message ${messageId} as read:`, error);
    }
  }

  /**
   * Count unread messages for a user across specified threads
   */
  async countUnread(profileId: string, threadIds: string[]): Promise<number> {
    if (threadIds.length === 0) return 0;

    const { count, error } = await this.client
      .from(this.tableName)
      .select("id", { count: "exact", head: true })
      .in("thread_id", threadIds)
      .not("read_by", "cs", `{${profileId}}`);

    if (error) {
      throw this.handleError(error, "countUnread");
    }

    return count || 0;
  }
}
