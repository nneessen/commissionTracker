// src/services/notifications/notification/NotificationService.ts

import { ServiceResponse } from "../../base/BaseService";
import { NotificationRepository } from "./NotificationRepository";
import { supabase } from "../../base/supabase";
import type {
  Notification,
  CreateNotificationRequest,
} from "@/types/notification.types";

export class NotificationServiceClass {
  private repository: NotificationRepository;

  constructor() {
    this.repository = new NotificationRepository();
  }

  /**
   * Get current user's profile ID
   */
  private async getCurrentUserProfileId(): Promise<string> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");
    return profile.id;
  }

  /**
   * Get all notifications for current user
   */
  async getAll(limit = 50): Promise<ServiceResponse<Notification[]>> {
    try {
      const profileId = await this.getCurrentUserProfileId();
      const notifications = await this.repository.findByUserId(
        profileId,
        limit,
      );
      return { success: true, data: notifications as Notification[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get notification by ID
   */
  async getById(id: string): Promise<ServiceResponse<Notification>> {
    try {
      const notification = await this.repository.findById(id);
      if (!notification) {
        return { success: false, error: new Error("Notification not found") };
      }
      return { success: true, data: notification as Notification };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get unread notification count for current user
   */
  async getUnreadCount(): Promise<ServiceResponse<number>> {
    try {
      const profileId = await this.getCurrentUserProfileId();
      const count = await this.repository.countUnreadByUserId(profileId);
      return { success: true, data: count };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Create a new notification
   */
  async create(
    data: CreateNotificationRequest,
  ): Promise<ServiceResponse<Notification>> {
    try {
      const notification = await this.repository.create({
        user_id: data.user_id,
        type: data.type,
        title: data.title,
        message: data.message || null,
        metadata: data.metadata || null,
        expires_at: data.expires_at || null,
      });
      return { success: true, data: notification as Notification };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<ServiceResponse<void>> {
    try {
      await this.repository.markAsRead(id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(): Promise<ServiceResponse<void>> {
    try {
      const profileId = await this.getCurrentUserProfileId();
      await this.repository.markAllAsReadByUserId(profileId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Delete a notification
   */
  async delete(id: string): Promise<ServiceResponse<void>> {
    try {
      await this.repository.delete(id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Delete all read notifications for current user
   */
  async deleteAllRead(): Promise<ServiceResponse<void>> {
    try {
      const profileId = await this.getCurrentUserProfileId();
      await this.repository.deleteAllReadByUserId(profileId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  // ============================================
  // Legacy API methods for backward compatibility
  // ============================================

  /** @deprecated Use getAll instead */
  async getNotifications(): Promise<Notification[]> {
    const result = await this.getAll();
    if (!result.success) {
      throw result.error;
    }
    return result.data || [];
  }

  /** @deprecated Use create instead */
  async createNotification(request: CreateNotificationRequest): Promise<void> {
    const result = await this.create(request);
    if (!result.success) {
      throw result.error;
    }
  }

  /** @deprecated Use delete instead */
  async deleteNotification(notificationId: string): Promise<void> {
    const result = await this.delete(notificationId);
    if (!result.success) {
      throw result.error;
    }
  }
}

export const notificationService = new NotificationServiceClass();
