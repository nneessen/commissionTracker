// src/features/messages/hooks/useThreads.ts
// Hook for fetching and managing email threads

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  getThreads,
  toggleThreadStar,
  archiveThread,
  deleteThread,
  addLabelToThread,
  removeLabelFromThread,
  type Thread,
} from "../services/threadService";

export type { Thread } from "../services/threadService";

interface UseThreadsOptions {
  labelId?: string;
  search?: string;
  filter?: "inbox" | "sent" | "drafts" | "scheduled" | "archived";
}

export function useThreads(options: UseThreadsOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { labelId, search, filter = "inbox" } = options;

  const {
    data: threads,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["threads", user?.id, labelId, search, filter],
    queryFn: () =>
      getThreads({
        userId: user!.id,
        labelId,
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
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["threads"] });
      const previousThreads = queryClient.getQueryData<Thread[]>([
        "threads",
        user?.id,
        labelId,
        search,
        filter,
      ]);

      queryClient.setQueryData<Thread[]>(
        ["threads", user?.id, labelId, search, filter],
        (old) => old?.map((t) => (t.id === threadId ? { ...t, isStarred } : t)),
      );

      return { previousThreads };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousThreads) {
        queryClient.setQueryData(
          ["threads", user?.id, labelId, search, filter],
          context.previousThreads,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (threadId: string) => archiveThread(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (threadId: string) => deleteThread(threadId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  const addLabelMutation = useMutation({
    mutationFn: ({
      threadId,
      labelId,
      currentLabels,
    }: {
      threadId: string;
      labelId: string;
      currentLabels: string[];
    }) => addLabelToThread(threadId, labelId, currentLabels),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      queryClient.invalidateQueries({ queryKey: ["labels"] });
    },
  });

  const removeLabelMutation = useMutation({
    mutationFn: ({
      threadId,
      labelId,
      currentLabels,
    }: {
      threadId: string;
      labelId: string;
      currentLabels: string[];
    }) => removeLabelFromThread(threadId, labelId, currentLabels),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      queryClient.invalidateQueries({ queryKey: ["labels"] });
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
    deleteThread: (threadId: string) => deleteMutation.mutate(threadId),
    addLabel: (threadId: string, labelId: string, currentLabels: string[]) =>
      addLabelMutation.mutate({ threadId, labelId, currentLabels }),
    removeLabel: (threadId: string, labelId: string, currentLabels: string[]) =>
      removeLabelMutation.mutate({ threadId, labelId, currentLabels }),
    isStarring: starMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
