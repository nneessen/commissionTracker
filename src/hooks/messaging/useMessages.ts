/**
 * Messaging Hooks
 *
 * TanStack Query hooks for messaging functionality.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { messagingService } from "@/services/messaging";
import {
  subscribeToThreadMessages,
  subscribeToAllThreads,
  subscribeToUserMessages,
} from "@/services/messaging/realtimeMessaging";
import type {
  CreateThreadRequest,
  SendMessageRequest,
} from "@/types/messaging.types";

/**
 * Get all message threads for current user
 */
export const useThreads = () => {
  return useQuery({
    queryKey: ["message-threads"],
    queryFn: async () => {
      const result = await messagingService.getThreads();
      if (!result.success) {
        throw result.error;
      }
      return result.data || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
};

/**
 * Get messages for a specific thread
 */
export const useThreadMessages = (threadId: string | undefined) => {
  return useQuery({
    queryKey: ["thread-messages", threadId],
    queryFn: async () => {
      const result = await messagingService.getThreadMessages(threadId!);
      if (!result.success) {
        throw result.error;
      }
      return result.data || [];
    },
    enabled: !!threadId,
    refetchInterval: 30000,
    staleTime: 10000,
  });
};

/**
 * Get unread message count
 */
export const useUnreadMessageCount = () => {
  return useQuery({
    queryKey: ["unread-message-count"],
    queryFn: async () => {
      const result = await messagingService.getUnreadCount();
      if (!result.success) {
        throw result.error;
      }
      return result.data || 0;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });
};

/**
 * Create new message thread
 */
export const useCreateThread = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateThreadRequest) => {
      const result = await messagingService.createThread(request);
      if (!result.success) {
        throw result.error;
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["unread-message-count"] });
    },
  });
};

/**
 * Send message in thread
 */
export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SendMessageRequest) => {
      const result = await messagingService.sendMessage(request);
      if (!result.success) {
        throw result.error;
      }
      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["thread-messages", variables.threadId],
      });
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["unread-message-count"] });
    },
  });
};

/**
 * Mark messages as read
 */
export const useMarkMessagesAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageIds: string[]) => {
      const result = await messagingService.markAsRead(messageIds);
      if (!result.success) {
        throw result.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thread-messages"] });
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["unread-message-count"] });
    },
  });
};

/**
 * Real-time subscription to thread messages
 */
export const useThreadMessagesRealtime = (
  threadId: string | undefined,
  enabled = true,
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!threadId || !enabled) return;

    const unsubscribe = subscribeToThreadMessages(threadId, () => {
      // Invalidate queries to refetch latest data
      queryClient.invalidateQueries({
        queryKey: ["thread-messages", threadId],
      });
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["unread-message-count"] });
    });

    return unsubscribe;
  }, [threadId, enabled, queryClient]);
};

/**
 * Real-time subscription to all user threads
 */
export const useThreadsRealtime = (
  profileId: string | undefined,
  enabled = true,
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profileId || !enabled) return;

    const unsubscribe = subscribeToAllThreads(profileId, () => {
      // Invalidate queries to refetch latest data
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["unread-message-count"] });
    });

    return unsubscribe;
  }, [profileId, enabled, queryClient]);
};

/**
 * Real-time subscription to all user messages (for notifications)
 */
export const useUserMessagesRealtime = (
  profileId: string | undefined,
  onNewMessage?: (threadId: string) => void,
  enabled = true,
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profileId || !enabled) return;

    const unsubscribe = subscribeToUserMessages(
      profileId,
      (_message, threadId) => {
        // Invalidate queries
        queryClient.invalidateQueries({
          queryKey: ["thread-messages", threadId],
        });
        queryClient.invalidateQueries({ queryKey: ["message-threads"] });
        queryClient.invalidateQueries({ queryKey: ["unread-message-count"] });

        // Call callback if provided
        if (onNewMessage) {
          onNewMessage(threadId);
        }
      },
    );

    return unsubscribe;
  }, [profileId, enabled, queryClient, onNewMessage]);
};
