// src/hooks/linkedin/useLinkedInRealtime.ts
// Realtime subscription hooks for LinkedIn messages and conversations
// Provides live updates via Supabase Realtime when webhooks update the database

import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import {
  linkedinKeys,
  type LinkedInMessageRow,
  type LinkedInConversationRow,
} from "@/types/linkedin.types";

type MessagePayload = RealtimePostgresChangesPayload<LinkedInMessageRow>;
type ConversationPayload =
  RealtimePostgresChangesPayload<LinkedInConversationRow>;

/**
 * Subscribe to new messages for a specific conversation
 * Automatically updates the TanStack Query cache on new messages
 */
export function useLinkedInMessagesRealtime(conversationId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`linkedin-messages:${conversationId}`)
      .on<LinkedInMessageRow>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "linkedin_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: MessagePayload) => {
          if (payload.eventType !== "INSERT" || !payload.new) return;

          const newMessage = payload.new as LinkedInMessageRow;

          // Optimistically update the messages cache
          queryClient.setQueryData<LinkedInMessageRow[]>(
            linkedinKeys.messages(conversationId),
            (oldMessages) => {
              if (!oldMessages) return [newMessage];

              // Check if message already exists (deduplication)
              const exists = oldMessages.some(
                (m) => m.unipile_message_id === newMessage.unipile_message_id,
              );
              if (exists) return oldMessages;

              // Add new message (messages are ordered by sent_at DESC, so prepend)
              return [newMessage, ...oldMessages];
            },
          );

          console.log(
            `[linkedin-realtime] New message in conversation ${conversationId}`,
          );
        },
      )
      .on<LinkedInMessageRow>(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "linkedin_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: MessagePayload) => {
          if (payload.eventType !== "UPDATE" || !payload.new) return;

          const updatedMessage = payload.new as LinkedInMessageRow;

          // Update the message in cache (e.g., status change from delivered to read)
          queryClient.setQueryData<LinkedInMessageRow[]>(
            linkedinKeys.messages(conversationId),
            (oldMessages) => {
              if (!oldMessages) return oldMessages;

              return oldMessages.map((m) =>
                m.id === updatedMessage.id ? updatedMessage : m,
              );
            },
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);
}

/**
 * Subscribe to conversation updates for an integration
 * Handles: new conversations, unread count changes, last message updates
 */
export function useLinkedInConversationsRealtime(integrationId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!integrationId) return;

    const channel = supabase
      .channel(`linkedin-conversations:${integrationId}`)
      .on<LinkedInConversationRow>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "linkedin_conversations",
          filter: `integration_id=eq.${integrationId}`,
        },
        (payload: ConversationPayload) => {
          if (payload.eventType !== "INSERT" || !payload.new) return;

          // Invalidate conversations list to refetch with new conversation
          queryClient.invalidateQueries({
            queryKey: linkedinKeys.conversations(integrationId),
          });

          console.log(
            `[linkedin-realtime] New conversation in integration ${integrationId}`,
          );
        },
      )
      .on<LinkedInConversationRow>(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "linkedin_conversations",
          filter: `integration_id=eq.${integrationId}`,
        },
        (payload: ConversationPayload) => {
          if (payload.eventType !== "UPDATE" || !payload.new) return;

          const updatedConversation = payload.new as LinkedInConversationRow;

          // Update conversation in cache
          queryClient.setQueryData<LinkedInConversationRow[]>(
            linkedinKeys.conversations(integrationId),
            (oldConversations) => {
              if (!oldConversations) return oldConversations;

              return oldConversations.map((c) =>
                c.id === updatedConversation.id ? updatedConversation : c,
              );
            },
          );

          // Also update the single conversation query if it exists
          queryClient.setQueryData(
            linkedinKeys.conversation(updatedConversation.id),
            updatedConversation,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [integrationId, queryClient]);
}

/**
 * Combined hook for full realtime experience
 * Use at the top level of LinkedIn messaging feature
 */
export function useLinkedInRealtime(
  integrationId: string | null,
  activeConversationId: string | null,
) {
  useLinkedInConversationsRealtime(integrationId);
  useLinkedInMessagesRealtime(activeConversationId);
}

/**
 * Hook to get total unread count across all conversations
 * Updates in realtime when conversations change
 */
export function useLinkedInUnreadCount(integrationId: string | null) {
  const queryClient = useQueryClient();

  const getUnreadCount = useCallback(() => {
    if (!integrationId) return 0;

    const conversations = queryClient.getQueryData<LinkedInConversationRow[]>(
      linkedinKeys.conversations(integrationId),
    );

    if (!conversations) return 0;

    return conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  }, [integrationId, queryClient]);

  // Subscribe to conversation changes for unread updates
  useLinkedInConversationsRealtime(integrationId);

  return getUnreadCount();
}
