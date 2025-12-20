// src/services/messaging/message/MessagingService.ts

import { ServiceResponse } from "../../base/BaseService";
import { MessagingRepository } from "./MessagingRepository";
import { supabase } from "../../base/supabase";
import type {
  MessageThread,
  Message,
  CreateThreadRequest,
  SendMessageRequest,
} from "@/types/messaging.types";

export class MessagingServiceClass {
  private repository: MessagingRepository;

  constructor() {
    this.repository = new MessagingRepository();
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
   * Get all threads for current user
   */
  async getThreads(): Promise<ServiceResponse<MessageThread[]>> {
    try {
      const profileId = await this.getCurrentUserProfileId();
      const threads = await this.repository.findThreadsByParticipant(profileId);
      return { success: true, data: threads };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get messages in a thread
   */
  async getThreadMessages(
    threadId: string,
  ): Promise<ServiceResponse<Message[]>> {
    try {
      const messages = await this.repository.findMessagesByThreadId(threadId);
      return { success: true, data: messages };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Create new thread
   */
  async createThread(
    request: CreateThreadRequest,
  ): Promise<ServiceResponse<MessageThread>> {
    try {
      const profileId = await this.getCurrentUserProfileId();

      // Create thread with current user + recipients
      const thread = await this.repository.createThread({
        subject: request.subject,
        participant_ids: [profileId, ...request.recipient_ids],
        created_by: profileId,
      });

      // If initial message provided, send it
      if (request.initial_message) {
        await this.sendMessage({
          threadId: thread.id,
          content: request.initial_message,
        });
      }

      return { success: true, data: thread };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Send message in thread
   */
  async sendMessage(
    request: SendMessageRequest,
  ): Promise<ServiceResponse<Message>> {
    try {
      const profileId = await this.getCurrentUserProfileId();

      const message = await this.repository.createMessage({
        thread_id: request.threadId,
        sender_id: profileId,
        content: request.content,
      });

      // Update thread's last_message_at
      await this.repository.updateThreadLastMessage(request.threadId);

      return { success: true, data: message };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(messageIds: string[]): Promise<ServiceResponse<void>> {
    try {
      const profileId = await this.getCurrentUserProfileId();

      for (const messageId of messageIds) {
        await this.repository.markMessageAsRead(messageId, profileId);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get unread message count for current user
   */
  async getUnreadCount(): Promise<ServiceResponse<number>> {
    try {
      const profileId = await this.getCurrentUserProfileId();

      // Get all threads user participates in
      const threads = await this.repository.findThreadsByParticipant(profileId);
      const threadIds = threads.map((t) => t.id);

      const count = await this.repository.countUnreadMessages(
        profileId,
        threadIds,
      );
      return { success: true, data: count };
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

  /** @deprecated Use getThreads instead - returns MessageThread[] directly */
  async _legacyGetThreads(): Promise<MessageThread[]> {
    const result = await this.getThreads();
    if (!result.success) {
      throw result.error;
    }
    return result.data || [];
  }

  /** @deprecated Use getThreadMessages instead - returns Message[] directly */
  async _legacyGetThreadMessages(threadId: string): Promise<Message[]> {
    const result = await this.getThreadMessages(threadId);
    if (!result.success) {
      throw result.error;
    }
    return result.data || [];
  }

  /** @deprecated Use createThread instead - returns MessageThread directly */
  async _legacyCreateThread(
    request: CreateThreadRequest,
  ): Promise<MessageThread> {
    const result = await this.createThread(request);
    if (!result.success) {
      throw result.error;
    }
    return result.data!;
  }

  /** @deprecated Use sendMessage instead - returns Message directly */
  async _legacySendMessage(request: SendMessageRequest): Promise<Message> {
    const result = await this.sendMessage(request);
    if (!result.success) {
      throw result.error;
    }
    return result.data!;
  }

  /** @deprecated Use markAsRead instead */
  async _legacyMarkAsRead(messageIds: string[]): Promise<void> {
    const result = await this.markAsRead(messageIds);
    if (!result.success) {
      throw result.error;
    }
  }

  /** @deprecated Use getUnreadCount instead - returns number directly */
  async _legacyGetUnreadCount(): Promise<number> {
    const result = await this.getUnreadCount();
    if (!result.success) {
      throw result.error;
    }
    return result.data || 0;
  }
}

export const messagingService = new MessagingServiceClass();
