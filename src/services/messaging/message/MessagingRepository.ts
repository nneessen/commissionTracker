// src/services/messaging/message/MessagingRepository.ts

import { supabase } from "../../base/supabase";
import type { Database } from "@/types/database.types";
import type { MessageThread, Message } from "@/types/messaging.types";

type ThreadInsert = Database["public"]["Tables"]["message_threads"]["Insert"];
type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];

export class MessagingRepository {
  /**
   * Find all threads for a user (by participant_ids)
   */
  async findThreadsByParticipant(profileId: string): Promise<MessageThread[]> {
    const { data, error } = await supabase
      .from("message_threads")
      .select(
        `
        *,
        created_by_profile:user_profiles!created_by(id, first_name, last_name, profile_photo_url)
      `,
      )
      .contains("participant_ids", [profileId])
      .order("last_message_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch threads: ${error.message}`);
    }

    return (data || []) as MessageThread[];
  }

  /**
   * Find messages in a thread
   */
  async findMessagesByThreadId(threadId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from("messages")
      .select(
        `
        *,
        sender:user_profiles!sender_id(id, first_name, last_name, profile_photo_url)
      `,
      )
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    return (data || []) as Message[];
  }

  /**
   * Create a new thread
   */
  async createThread(data: ThreadInsert): Promise<MessageThread> {
    const { data: thread, error } = await supabase
      .from("message_threads")
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create thread: ${error.message}`);
    }

    return thread as MessageThread;
  }

  /**
   * Create a new message
   */
  async createMessage(data: MessageInsert): Promise<Message> {
    const { data: message, error } = await supabase
      .from("messages")
      .insert(data)
      .select(
        `
        *,
        sender:user_profiles!sender_id(id, first_name, last_name, profile_photo_url)
      `,
      )
      .single();

    if (error) {
      throw new Error(`Failed to create message: ${error.message}`);
    }

    return message as Message;
  }

  /**
   * Update thread's last_message_at
   */
  async updateThreadLastMessage(threadId: string): Promise<void> {
    const { error } = await supabase
      .from("message_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", threadId);

    if (error) {
      throw new Error(`Failed to update thread: ${error.message}`);
    }
  }

  /**
   * Add user to message's read_by array via RPC
   */
  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc("add_to_read_by", {
      message_id: messageId,
      user_id: userId,
    });

    if (error) {
      console.error(`Failed to mark message ${messageId} as read:`, error);
    }
  }

  /**
   * Count unread messages for a user across all their threads
   */
  async countUnreadMessages(
    profileId: string,
    threadIds: string[],
  ): Promise<number> {
    if (threadIds.length === 0) return 0;

    const { data, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("thread_id", threadIds)
      .not("read_by", "cs", `{${profileId}}`);

    if (error) {
      throw new Error(`Failed to count unread messages: ${error.message}`);
    }

    return data?.length || 0;
  }
}
