/**
 * Notification Hooks
 *
 * TanStack Query hooks for notification functionality.
 */

import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useEffect, useMemo} from 'react';
import {notificationService} from '@/services/notifications/notificationService';
import {subscribeToNotifications} from '@/services/notifications/realtimeNotifications';
import type {CreateNotificationRequest} from '@/types/notification.types';

/**
 * Get all notifications for current user
 */
export const useNotifications = () => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.getNotifications,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000 // Consider data stale after 10 seconds
  });
};

/**
 * Get unread notification count
 */
export const useUnreadNotificationCount = () => {
  const { data: notifications } = useNotifications();

  return useMemo(() => {
    return notifications?.filter(n => !n.read).length ?? 0;
  }, [notifications]);
};

/**
 * Mark notification as read
 */
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};

/**
 * Mark all notifications as read
 */
export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};

/**
 * Create notification
 */
export const useCreateNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateNotificationRequest) => notificationService.createNotification(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};

/**
 * Delete notification
 */
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};

/**
 * Delete all read notifications
 */
export const useDeleteAllReadNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.deleteAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};

/**
 * Real-time subscription to notifications
 */
export const useNotificationsRealtime = (
  profileId: string | undefined,
  onNewNotification?: () => void,
  enabled = true
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profileId || !enabled) return;

    const unsubscribe = subscribeToNotifications(profileId, () => {
      // Invalidate queries to refetch latest data
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Call callback if provided (for showing toast, playing sound, etc.)
      if (onNewNotification) {
        onNewNotification();
      }
    });

    return unsubscribe;
  }, [profileId, enabled, queryClient, onNewNotification]);
};
