// src/features/messages/hooks/useThread.ts
// Hook for fetching a single thread with messages

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  getThread,
  markThreadAsRead,
  type Thread,
  type Message,
} from "../services/threadService";

export type { Thread, Message } from "../services/threadService";

export function useThread(threadId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => getThread(threadId!, user!.id),
    enabled: !!threadId && !!user?.id,
    staleTime: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: () => markThreadAsRead(threadId!, user!.id),
    onSuccess: () => {
      // Update thread data
      queryClient.setQueryData<{ thread: Thread; messages: Message[] } | null>(
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

  return {
    thread: data?.thread || null,
    messages: data?.messages || [],
    isLoading,
    error,
    refetch,
    markAsRead: () => markReadMutation.mutate(),
    isMarkingRead: markReadMutation.isPending,
  };
}
