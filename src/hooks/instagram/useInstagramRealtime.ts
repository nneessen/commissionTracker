// src/hooks/instagram/useInstagramRealtime.ts
// Realtime subscription hooks for Instagram messages and conversations
// Provides live updates without polling

import { useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import {
  instagramKeys,
  type InstagramMessageRow,
  type InstagramConversationRow,
} from "@/types/instagram.types";
import { usePageVisibility } from "@/hooks/usePageVisibility";

type MessagePayload = RealtimePostgresChangesPayload<InstagramMessageRow>;
type ConversationPayload =
  RealtimePostgresChangesPayload<InstagramConversationRow>;

/**
 * Subscribe to new messages for a specific conversation
 * Automatically updates the TanStack Query cache on new messages
 */
export function useInstagramMessagesRealtime(conversationId: string | null) {
  const queryClient = useQueryClient();
  const isVisible = usePageVisibility();
  const wasVisibleRef = useRef(isVisible);

  useEffect(() => {
    if (!conversationId) {
      wasVisibleRef.current = isVisible;
      return;
    }

    if (isVisible && !wasVisibleRef.current) {
      const messagesKey = instagramKeys.messages(conversationId);
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === messagesKey[0] &&
          query.queryKey[1] === messagesKey[1] &&
          query.queryKey[2] === messagesKey[2],
      });
    }

    wasVisibleRef.current = isVisible;
  }, [conversationId, isVisible, queryClient]);

  useEffect(() => {
    if (!conversationId || !isVisible) return;

    const channel = supabase
      .channel(`instagram-messages:${conversationId}`)
      .on<InstagramMessageRow>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "instagram_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: MessagePayload) => {
          if (payload.eventType !== "INSERT" || !payload.new) return;

          const newMessage = payload.new as InstagramMessageRow;

          // Optimistically update the messages cache
          queryClient.setQueryData<InstagramMessageRow[]>(
            instagramKeys.messages(conversationId),
            (oldMessages) => {
              if (!oldMessages) return [newMessage];

              // Check if message already exists (deduplication)
              const exists = oldMessages.some(
                (m) =>
                  m.instagram_message_id === newMessage.instagram_message_id,
              );
              if (exists) return oldMessages;

              // Add new message (messages are ordered by sent_at DESC, so prepend)
              return [newMessage, ...oldMessages];
            },
          );

          console.log(
            `[realtime] New message in conversation ${conversationId}`,
          );
        },
      )
      .on<InstagramMessageRow>(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "instagram_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: MessagePayload) => {
          if (payload.eventType !== "UPDATE" || !payload.new) return;

          const updatedMessage = payload.new as InstagramMessageRow;

          // Update the message in cache (e.g., status change)
          queryClient.setQueryData<InstagramMessageRow[]>(
            instagramKeys.messages(conversationId),
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
  }, [conversationId, isVisible, queryClient]);
}

/**
 * Subscribe to conversation updates for an integration
 * Handles: new conversations, unread count changes, last message updates
 */
export function useInstagramConversationsRealtime(
  integrationId: string | null,
) {
  const queryClient = useQueryClient();
  const isVisible = usePageVisibility();
  const wasVisibleRef = useRef(isVisible);

  useEffect(() => {
    if (!integrationId) {
      wasVisibleRef.current = isVisible;
      return;
    }

    if (isVisible && !wasVisibleRef.current) {
      const conversationsKey = instagramKeys.conversations(integrationId);
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === conversationsKey[0] &&
          query.queryKey[1] === conversationsKey[1] &&
          query.queryKey[2] === conversationsKey[2],
      });
    }

    wasVisibleRef.current = isVisible;
  }, [integrationId, isVisible, queryClient]);

  useEffect(() => {
    if (!integrationId || !isVisible) return;

    const channel = supabase
      .channel(`instagram-conversations:${integrationId}`)
      .on<InstagramConversationRow>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "instagram_conversations",
          filter: `integration_id=eq.${integrationId}`,
        },
        (payload: ConversationPayload) => {
          if (payload.eventType !== "INSERT" || !payload.new) return;

          // Invalidate conversations list to refetch with new conversation
          queryClient.invalidateQueries({
            queryKey: instagramKeys.conversations(integrationId),
          });

          console.log(
            `[realtime] New conversation in integration ${integrationId}`,
          );
        },
      )
      .on<InstagramConversationRow>(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "instagram_conversations",
          filter: `integration_id=eq.${integrationId}`,
        },
        (payload: ConversationPayload) => {
          if (payload.eventType !== "UPDATE" || !payload.new) return;

          const updatedConversation = payload.new as InstagramConversationRow;

          // Update ALL conversation list variants (base + filtered) in cache
          queryClient.setQueriesData(
            { queryKey: instagramKeys.conversations(integrationId) },
            (old: unknown) => {
              const oldList = (old as InstagramConversationRow[]) ?? [];
              return oldList.map((c) =>
                c.id === updatedConversation.id ? updatedConversation : c,
              );
            },
          );

          // Also update the single conversation query if it exists
          queryClient.setQueryData(
            instagramKeys.conversation(updatedConversation.id),
            updatedConversation,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [integrationId, isVisible, queryClient]);
}

/**
 * Combined hook for full realtime experience
 * Use at the top level of Instagram messaging feature
 */
export function useInstagramRealtime(
  integrationId: string | null,
  activeConversationId: string | null,
) {
  useInstagramConversationsRealtime(integrationId);
  useInstagramMessagesRealtime(activeConversationId);
}

/**
 * Hook to get total unread count across all conversations
 * Updates in realtime when conversations change
 */
export function useInstagramUnreadCount(integrationId: string | null) {
  const queryClient = useQueryClient();

  const getUnreadCount = useCallback(() => {
    if (!integrationId) return 0;

    const conversations = queryClient.getQueryData<InstagramConversationRow[]>(
      instagramKeys.conversations(integrationId),
    );

    if (!conversations) return 0;

    return conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  }, [integrationId, queryClient]);

  // Subscribe to conversation changes for unread updates
  useInstagramConversationsRealtime(integrationId);

  return getUnreadCount();
}
