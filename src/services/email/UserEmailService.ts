// src/services/email/UserEmailService.ts
// Service layer for email operations - uses UserEmailRepository

import { supabase } from "../base/supabase";
import type { FilterOptions } from "../base/BaseRepository";
import { UserEmailRepository } from "./UserEmailRepository";
import type {
  UserEmailEntity,
  SendEmailRequest,
  SendEmailResponse,
  CreateUserEmailData,
  UpdateUserEmailData,
} from "./types";

class UserEmailService {
  private repository: UserEmailRepository;

  constructor() {
    this.repository = new UserEmailRepository();
  }

  // ========================================
  // CRUD operations (delegated to repository)
  // ========================================

  /**
   * Get email by ID
   */
  async getEmailById(emailId: string): Promise<UserEmailEntity | null> {
    return this.repository.findById(emailId);
  }

  /**
   * Get all emails for a user (as sender or recipient)
   */
  async getEmailsForUser(userId: string): Promise<UserEmailEntity[]> {
    return this.repository.findByUser(userId);
  }

  /**
   * Get emails for a recruit
   */
  async getEmailsForRecruit(recruitId: string): Promise<UserEmailEntity[]> {
    return this.repository.findByRecruit(recruitId);
  }

  /**
   * Get emails by sender
   */
  async getEmailsBySender(senderId: string): Promise<UserEmailEntity[]> {
    return this.repository.findBySender(senderId);
  }

  /**
   * Create a new email record
   */
  async create(data: CreateUserEmailData): Promise<UserEmailEntity> {
    return this.repository.create(data);
  }

  /**
   * Update an email record
   */
  async update(id: string, data: UpdateUserEmailData): Promise<UserEmailEntity> {
    return this.repository.update(id, data);
  }

  /**
   * Delete an email record
   */
  async delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  // ========================================
  // Email sending (via edge function)
  // ========================================

  /**
   * Send an email via the unified send-email Edge Function
   * Uses Mailgun as the email provider
   */
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: request,
    });

    // Check for Supabase invocation errors
    if (error) {
      console.error("Email service invocation error:", error);
      throw new Error(error.message || "Failed to invoke email service");
    }

    // Check for application-level errors in response
    if (data && !data.success) {
      console.error("Email service application error:", data.error);
      throw new Error(data.error || "Failed to send email");
    }

    // Ensure we have a valid response
    if (!data) {
      throw new Error("Email service returned no data");
    }

    return data as SendEmailResponse;
  }

  // ========================================
  // Utility methods
  // ========================================

  /**
   * Convert HTML to plain text
   * Simple implementation - strips HTML tags
   */
  htmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Check if email exists
   */
  async exists(id: string): Promise<boolean> {
    return this.repository.exists(id);
  }

  /**
   * Count emails with optional filters
   */
  async count(filters?: FilterOptions): Promise<number> {
    return this.repository.count(filters);
  }
}

// Singleton instance for backward compatibility
export const emailService = new UserEmailService();
export { UserEmailService };
