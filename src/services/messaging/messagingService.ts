import { supabase } from "../base/supabase";
import type {
  MessageThread,
  Message,
  CreateThreadRequest,
  SendMessageRequest,
} from "@/types/messaging.types";

export const messagingService = {
  /**
   * Get all threads for current user
   */
  async getThreads(): Promise<MessageThread[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");

    const { data, error } = await supabase
      .from("message_threads")
      .select(
        `
        *,
        created_by_profile:user_profiles!created_by(id, first_name, last_name, profile_photo_url)
      `,
      )
      .contains("participant_ids", [profile.id])
      .order("last_message_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get messages in a thread
   */
  async getThreadMessages(threadId: string): Promise<Message[]> {
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

    if (error) throw error;
    return data || [];
  },

  /**
   * Create new thread
   */
  async createThread(request: CreateThreadRequest): Promise<MessageThread> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");

    // Create thread with current user + recipients
    const { data: thread, error: threadError } = await supabase
      .from("message_threads")
      .insert({
        subject: request.subject,
        participant_ids: [profile.id, ...request.recipient_ids],
        created_by: profile.id,
      })
      .select()
      .single();

    if (threadError) throw threadError;
    if (!thread) throw new Error("Failed to create thread");

    // If initial message provided, send it
    if (request.initial_message) {
      await this.sendMessage({
        threadId: thread.id,
        content: request.initial_message,
      });
    }

    return thread;
  },

  /**
   * Send message in thread
   */
  async sendMessage(request: SendMessageRequest): Promise<Message> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");

    const { data, error } = await supabase
      .from("messages")
      .insert({
        thread_id: request.threadId,
        sender_id: profile.id,
        content: request.content,
      })
      .select(
        `
        *,
        sender:user_profiles!sender_id(id, first_name, last_name, profile_photo_url)
      `,
      )
      .single();

    if (error) throw error;
    if (!data) throw new Error("Failed to send message");

    // Update thread's last_message_at
    await supabase
      .from("message_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", request.threadId);

    return data;
  },

  /**
   * Mark messages as read
   */
  async markAsRead(messageIds: string[]): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");

    // Call RPC function for each message
    for (const messageId of messageIds) {
      const { error } = await supabase.rpc("add_to_read_by", {
        message_id: messageId,
        user_id: profile.id,
      });

      if (error) {
        console.error(`Failed to mark message ${messageId} as read:`, error);
      }
    }
  },

  /**
   * Get unread message count for current user
   */
  async getUnreadCount(): Promise<number> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");

    // Get all threads user participates in
    const { data: threads } = await supabase
      .from("message_threads")
      .select("id")
      .contains("participant_ids", [profile.id]);

    if (!threads || threads.length === 0) return 0;

    const threadIds = threads.map((t) => t.id);

    // Count messages in those threads that user hasn't read
    const { data, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("thread_id", threadIds)
      .not("read_by", "cs", `{${profile.id}}`); // NOT contains profile.id

    if (error) throw error;
    return data?.length || 0;
  },
};
