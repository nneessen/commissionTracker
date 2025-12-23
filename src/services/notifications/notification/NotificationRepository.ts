// src/services/notifications/notification/NotificationRepository.ts

import { BaseRepository, BaseEntity } from "../../base/BaseRepository";
import { supabase } from "../../base/supabase";
import type { Database } from "@/types/database.types";
import type { Notification } from "@/types/notification.types";

type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];
type NotificationUpdate =
  Database["public"]["Tables"]["notifications"]["Update"];

export type NotificationBaseEntity = Notification & BaseEntity;

export class NotificationRepository extends BaseRepository<
  NotificationBaseEntity,
  NotificationInsert,
  NotificationUpdate
> {
  constructor() {
    super("notifications");
  }

  protected transformToEntity(
    row: Record<string, unknown>,
  ): NotificationBaseEntity {
    return row as unknown as NotificationBaseEntity;
  }

  protected transformToInsert(data: NotificationInsert): NotificationInsert {
    return data;
  }

  protected transformToUpdate(data: NotificationUpdate): NotificationUpdate {
    return data;
  }

  /**
   * Override create to use SECURITY DEFINER function
   * This bypasses RLS issues with FK constraint checking on user_profiles
   * The function returns the full notification row directly to avoid RLS SELECT issues
   */
  async create(data: NotificationInsert): Promise<NotificationBaseEntity> {
    const { data: notifications, error } = await supabase.rpc(
      "create_notification",
      {
        p_user_id: data.user_id,
        p_type: data.type,
        p_title: data.title,
        p_message: data.message ?? null,
        p_metadata: data.metadata ?? null,
        p_expires_at: data.expires_at ?? null,
      },
    );

    if (error) {
      throw new Error(`Failed to create notification: ${error.message}`);
    }

    // Function returns SETOF, so we get an array with one row
    const notification = Array.isArray(notifications)
      ? notifications[0]
      : notifications;

    if (!notification) {
      throw new Error("Failed to create notification: No row returned");
    }

    return this.transformToEntity(notification);
  }

  /**
   * Find notifications for a specific user
   */
  async findByUserId(
    userId: string,
    limit = 50,
  ): Promise<NotificationBaseEntity[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Count unread notifications for a user
   */
  async countUnreadByUserId(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from(this.tableName)
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) {
      throw new Error(`Failed to count unread notifications: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .update({ read: true })
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsReadByUserId(userId: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) {
      throw new Error(
        `Failed to mark all notifications as read: ${error.message}`,
      );
    }
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteAllReadByUserId(userId: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq("user_id", userId)
      .eq("read", true);

    if (error) {
      throw new Error(`Failed to delete read notifications: ${error.message}`);
    }
  }
}
