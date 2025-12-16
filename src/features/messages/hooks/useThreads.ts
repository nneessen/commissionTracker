// src/features/messages/hooks/useThreads.ts
// Hook for fetching and managing email threads

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  getThreads,
  toggleThreadStar,
  archiveThread,
  unarchiveThread,
  deleteThread,
  type Thread,
} from "../services/threadService";

export type { Thread } from "../services/threadService";

interface UseThreadsOptions {
  search?: string;
  filter?:
    | "all"
    | "inbox"
    | "sent"
    | "starred"
    | "drafts"
    | "scheduled"
    | "archived";
}

export function useThreads(options: UseThreadsOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { search, filter = "inbox" } = options;

  const {
    data: threads,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["threads", user?.id, search, filter],
    queryFn: () =>
      getThreads({
        userId: user!.id,
        search,
        filter,
      }),
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute for new emails
  });

  const starMutation = useMutation({
    mutationFn: ({
      threadId,
      isStarred,
    }: {
      threadId: string;
      isStarred: boolean;
    }) => toggleThreadStar(threadId, isStarred),
    onMutate: async ({ threadId, isStarred }) => {
      // Cancel any pending queries
      await queryClient.cancelQueries({ queryKey: ["threads"] });
      await queryClient.cancelQueries({ queryKey: ["thread", threadId] });

      // Save previous state for rollback
      const previousThreads = queryClient.getQueryData<Thread[]>([
        "threads",
        user?.id,
        search,
        filter,
      ]);
      const previousThread = queryClient.getQueryData<{ thread: Thread }>([
        "thread",
        threadId,
      ]);

      // Optimistic update for threads list
      queryClient.setQueryData<Thread[]>(
        ["threads", user?.id, search, filter],
        (old) => old?.map((t) => (t.id === threadId ? { ...t, isStarred } : t)),
      );

      // Optimistic update for single thread view
      queryClient.setQueryData<{
        thread: Thread;
        messages: unknown[];
        totalMessages: number;
        hasMore: boolean;
      }>(["thread", threadId], (old) =>
        old ? { ...old, thread: { ...old.thread, isStarred } } : old,
      );

      return { previousThreads, previousThread };
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousThreads) {
        queryClient.setQueryData(
          ["threads", user?.id, search, filter],
          context.previousThreads,
        );
      }
      if (context?.previousThread) {
        queryClient.setQueryData(
          ["thread", variables.threadId],
          context.previousThread,
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      // Invalidate to ensure data is fresh
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      queryClient.invalidateQueries({
        queryKey: ["thread", variables.threadId],
      });
      queryClient.invalidateQueries({ queryKey: ["folderCounts"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (threadId: string) => archiveThread(threadId),
    onSuccess: (_data, threadId) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      queryClient.invalidateQueries({ queryKey: ["thread", threadId] });
      queryClient.invalidateQueries({ queryKey: ["folderCounts"] });
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: (threadId: string) => unarchiveThread(threadId),
    onSuccess: (_data, threadId) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      queryClient.invalidateQueries({ queryKey: ["thread", threadId] });
      queryClient.invalidateQueries({ queryKey: ["folderCounts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (threadId: string) => deleteThread(threadId, user!.id),
    onSuccess: (_data, threadId) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      queryClient.invalidateQueries({ queryKey: ["thread", threadId] });
      queryClient.invalidateQueries({ queryKey: ["folderCounts"] });
    },
  });

  return {
    threads: threads || [],
    isLoading,
    error,
    refetch,
    toggleStar: (threadId: string, isStarred: boolean) =>
      starMutation.mutate({ threadId, isStarred }),
    archive: (threadId: string) => archiveMutation.mutate(threadId),
    unarchive: (threadId: string) => unarchiveMutation.mutate(threadId),
    deleteThread: (threadId: string) => deleteMutation.mutate(threadId),
    isStarring: starMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isUnarchiving: unarchiveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
