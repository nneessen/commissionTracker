// src/features/messages/hooks/useThread.ts
// Hook for fetching a single thread with messages and pagination

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  getThread,
  getEarlierMessages,
  markThreadAsRead,
  type ThreadWithMessages,
} from "../services/threadService";

export type { Thread, Message } from "../services/threadService";

// Type alias for internal use (using import type to avoid redeclaration)
type _Thread = import("../services/threadService").Thread;

// Default: show latest 5 messages expanded, with option to load more
const INITIAL_MESSAGE_LIMIT = 20;
const MESSAGES_PER_PAGE = 10;

export function useThread(threadId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loadedOffset, setLoadedOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () =>
      getThread(threadId!, user!.id, { limit: INITIAL_MESSAGE_LIMIT }),
    enabled: !!threadId && !!user?.id,
    staleTime: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: () => markThreadAsRead(threadId!, user!.id),
    onSuccess: () => {
      // Update thread data
      queryClient.setQueryData<ThreadWithMessages | null>(
        ["thread", threadId],
        (old) => {
          if (!old) return null;
          return {
            ...old,
            thread: { ...old.thread, unreadCount: 0 },
            messages: old.messages.map((m) => ({ ...m, isRead: true })),
          };
        },
      );
      // Invalidate threads list to update unread counts
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  // Load more earlier messages
  const loadMoreMessages = useCallback(async () => {
    if (!threadId || !data || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const newOffset = loadedOffset + INITIAL_MESSAGE_LIMIT;
      const result = await getEarlierMessages(
        threadId,
        newOffset,
        MESSAGES_PER_PAGE,
      );

      // Prepend older messages to the beginning
      queryClient.setQueryData<ThreadWithMessages | null>(
        ["thread", threadId],
        (old) => {
          if (!old) return null;
          return {
            ...old,
            messages: [...result.messages, ...old.messages],
            hasMore: result.hasMore,
          };
        },
      );

      setLoadedOffset(newOffset);
    } catch (err) {
      console.error("Error loading more messages:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [threadId, data, loadedOffset, isLoadingMore, queryClient]);

  return {
    thread: data?.thread || null,
    messages: data?.messages || [],
    totalMessages: data?.totalMessages || 0,
    hasMore: data?.hasMore || false,
    isLoading,
    isLoadingMore,
    error,
    refetch,
    loadMoreMessages,
    markAsRead: () => markReadMutation.mutate(),
    isMarkingRead: markReadMutation.isPending,
  };
}
