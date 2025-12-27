// src/services/messaging/MessageThreadRepository.ts

import { BaseRepository, BaseEntity } from "../base/BaseRepository";
import type { Database } from "@/types/database.types";
import type { MessageThread } from "@/types/messaging.types";

// DB types from database.types.ts
type _ThreadRow = Database["public"]["Tables"]["message_threads"]["Row"];
type ThreadInsert = Database["public"]["Tables"]["message_threads"]["Insert"];
type ThreadUpdate = Database["public"]["Tables"]["message_threads"]["Update"];

// Entity type extending BaseEntity for BaseRepository compatibility
type MessageThreadEntity = MessageThread & BaseEntity;

export class MessageThreadRepository extends BaseRepository<
  MessageThreadEntity,
  ThreadInsert,
  ThreadUpdate
> {
  constructor() {
    super("message_threads");
  }

  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): MessageThreadEntity {
    return {
      id: dbRecord.id as string,
      subject: dbRecord.subject as string,
      participant_ids: dbRecord.participant_ids as string[],
      created_by: dbRecord.created_by as string,
      last_message_at: (dbRecord.last_message_at as string) || "",
      created_at: (dbRecord.created_at as string) || "",
      updated_at: (dbRecord.updated_at as string) || "",
      // Optional joined data
      created_by_profile:
        dbRecord.created_by_profile as MessageThreadEntity["created_by_profile"],
    } as MessageThreadEntity;
  }

  protected transformToDB(
    data: ThreadInsert | ThreadUpdate,
    _isUpdate = false,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if ("subject" in data && data.subject !== undefined) {
      result.subject = data.subject;
    }
    if ("participant_ids" in data && data.participant_ids !== undefined) {
      result.participant_ids = data.participant_ids;
    }
    if ("created_by" in data && data.created_by !== undefined) {
      result.created_by = data.created_by;
    }
    if ("last_message_at" in data) {
      result.last_message_at = data.last_message_at;
    }

    return result;
  }

  /**
   * Find all threads for a user (by participant_ids)
   */
  async findByParticipant(profileId: string): Promise<MessageThreadEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(
        `
        *,
        created_by_profile:user_profiles!created_by(id, first_name, last_name, profile_photo_url)
      `,
      )
      .contains("participant_ids", [profileId])
      .order("last_message_at", { ascending: false });

    if (error) {
      throw this.handleError(error, "findByParticipant");
    }

    return (data || []).map((item) => this.transformFromDB(item));
  }

  /**
   * Update thread's last_message_at timestamp
   */
  async updateLastMessage(threadId: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", threadId);

    if (error) {
      throw this.handleError(error, "updateLastMessage");
    }
  }
}
