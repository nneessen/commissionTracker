/**
 * Real-Time Notification Service
 *
 * Handles real-time subscriptions for notifications using Supabase Realtime.
 */

import {supabase} from '../base/supabase';
import type {Notification} from '@/types/notification.types';

/**
 * Subscribe to notifications for current user
 */
export const subscribeToNotifications = (
  profileId: string,
  onNewNotification: (notification: Notification) => void
): (() => void) => {
  const channel = supabase
    .channel('user-notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profileId}`
      },
      (payload) => {
        onNewNotification(payload.new as Notification);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profileId}`
      },
      (payload) => {
        // Notify on updates (e.g., marking as read)
        onNewNotification(payload.new as Notification);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};
