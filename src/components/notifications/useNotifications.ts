// src/components/notifications/useNotifications.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// eslint-disable-next-line no-restricted-imports
import { notificationService } from "@/services";
import { useAuth } from "@/contexts/AuthContext";
import type { Notification } from "@/types/notification.types";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

/**
 * Hook to get all notifications for current user
 */
export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: async () => {
      const result = await notificationService.getAll();
      if (!result.success) {
        throw result.error;
      }
      return result.data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Fallback polling every 60 seconds
  });
}

/**
 * Hook to get unread notification count
 */
export function useUnreadCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const result = await notificationService.getUnreadCount();
      if (!result.success) {
        throw result.error;
      }
      return result.data || 0;
    },
    enabled: !!user,
    staleTime: 1000 * 10, // 10 seconds
    refetchInterval: 1000 * 30, // Poll every 30 seconds as fallback
  });
}

/**
 * Hook to mark a notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const result = await notificationService.markAsRead(notificationId);
      if (!result.success) {
        throw result.error;
      }
    },
    onMutate: async (notificationId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() });

      const previousNotifications = queryClient.getQueryData<Notification[]>(
        notificationKeys.list(),
      );

      if (previousNotifications) {
        queryClient.setQueryData<Notification[]>(
          notificationKeys.list(),
          (old) =>
            old?.map((n) =>
              n.id === notificationId ? { ...n, read: true } : n,
            ) ?? [],
        );
      }

      // Optimistically decrement unread count
      const previousCount = queryClient.getQueryData<number>(
        notificationKeys.unreadCount(),
      );
      if (previousCount !== undefined && previousCount > 0) {
        queryClient.setQueryData<number>(
          notificationKeys.unreadCount(),
          previousCount - 1,
        );
      }

      return { previousNotifications, previousCount };
    },
    onError: (_err, _notificationId, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          notificationKeys.list(),
          context.previousNotifications,
        );
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(
          notificationKeys.unreadCount(),
          context.previousCount,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await notificationService.markAllAsRead();
      if (!result.success) {
        throw result.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
      queryClient.setQueryData<number>(notificationKeys.unreadCount(), 0);
    },
  });
}

/**
 * Hook to delete a notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const result = await notificationService.delete(notificationId);
      if (!result.success) {
        throw result.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });
    },
  });
}
