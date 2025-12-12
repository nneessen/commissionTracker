/**
 * Notification Service
 *
 * Handles creation, retrieval, and management of notifications.
 */

import {supabase} from '../base/supabase';
import type {Notification, CreateNotificationRequest} from '@/types/notification.types';

export const notificationService = {
  /**
   * Get all notifications for current user
   */
  async getNotifications(): Promise<Notification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) throw new Error('Profile not found');

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false})
      .limit(50);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) throw new Error('Profile not found');

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  },

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) throw new Error('Profile not found');

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', profile.id)
      .eq('read', false);

    if (error) throw error;
  },

  /**
   * Create notification (typically called by backend triggers or admin actions)
   */
  async createNotification(request: CreateNotificationRequest): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .insert(request);

    if (error) throw error;
  },

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  },

  /**
   * Delete all read notifications for current user
   */
  async deleteAllRead(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) throw new Error('Profile not found');

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', profile.id)
      .eq('read', true);

    if (error) throw error;
  }
};
