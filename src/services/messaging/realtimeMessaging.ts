/**
 * Real-Time Messaging Service
 *
 * Handles real-time subscriptions for messages and threads using Supabase Realtime.
 */

import { supabase } from "../base/supabase";
import type { Message, MessageThread } from "@/types/messaging.types";

/**
 * Subscribe to messages in a specific thread
 */
export const subscribeToThreadMessages = (
  threadId: string,
  onNewMessage: (message: Message) => void,
): (() => void) => {
  const channel = supabase
    .channel(`thread:${threadId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `thread_id=eq.${threadId}`,
      },
      async (payload) => {
        // Fetch full message with sender info
        const { data } = await supabase
          .from("messages")
          .select(
            `
            *,
            sender:user_profiles!sender_id(id, first_name, last_name, profile_photo_url)
          `,
          )
          .eq("id", payload.new.id)
          .single();

        if (data) {
          onNewMessage(data as Message);
        }
      },
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Subscribe to all thread updates for current user
 */
export const subscribeToAllThreads = (
  profileId: string,
  onThreadUpdate: (thread: MessageThread) => void,
): (() => void) => {
  const channel = supabase
    .channel("all-threads")
    .on(
      "postgres_changes",
      {
        event: "*", // INSERT, UPDATE, DELETE
        schema: "public",
        table: "message_threads",
      },
      async (payload) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase realtime payload type
        const thread = payload.new as any;

        // Only notify if user is a participant
        if (thread?.participant_ids?.includes(profileId)) {
          // Fetch full thread with creator info
          const { data } = await supabase
            .from("message_threads")
            .select(
              `
              *,
              created_by_profile:user_profiles!created_by(id, first_name, last_name, profile_photo_url)
            `,
            )
            .eq("id", thread.id)
            .single();

          if (data) {
            onThreadUpdate(data as MessageThread);
          }
        }
      },
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Subscribe to new messages across all user threads
 * Useful for showing unread count badge in header
 */
export const subscribeToUserMessages = (
  profileId: string,
  onNewMessage: (message: Message, threadId: string) => void,
): (() => void) => {
  const channel = supabase
    .channel("user-messages")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      async (payload) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase realtime payload type
        const message = payload.new as any;

        // Check if this message is in a thread the user participates in
        const { data: thread } = await supabase
          .from("message_threads")
          .select("id, participant_ids")
          .eq("id", message.thread_id)
          .single();

        if (thread?.participant_ids?.includes(profileId)) {
          // Don't notify for user's own messages
          if (message.sender_id !== profileId) {
            // Fetch full message with sender info
            const { data: fullMessage } = await supabase
              .from("messages")
              .select(
                `
                *,
                sender:user_profiles!sender_id(id, first_name, last_name, profile_photo_url)
              `,
              )
              .eq("id", message.id)
              .single();

            if (fullMessage) {
              onNewMessage(fullMessage as Message, thread.id);
            }
          }
        }
      },
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};
