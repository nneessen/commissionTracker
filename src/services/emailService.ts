// Unified Email Service
// Single service for all email operations in the application

import { supabase } from "./base/supabase";
import type { UserEmail } from "@/types/recruiting.types";

export interface SendEmailRequest {
  to: string[]; // Recipient email addresses
  cc?: string[]; // CC recipients
  subject: string;
  html: string; // HTML body
  text?: string; // Plain text body
  replyTo?: string; // Sender's email for replies
  // Metadata for database tracking
  recruitId?: string; // Link to recruit (user_id in user_emails)
  senderId?: string; // Who sent it (sender_id in user_emails)
  metadata?: Record<string, unknown>;
}

export interface SendEmailResponse {
  success: boolean;
  emailId?: string;
  resendMessageId?: string;
  error?: string;
}

export const emailService = {
  /**
   * Send an email via the unified send-email Edge Function
   * Uses Resend as the email provider
   */
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: request,
    });

    if (error) {
      console.error("Email service error:", error);
      throw new Error(error.message || "Failed to send email");
    }

    return data as SendEmailResponse;
  },

  /**
   * Get emails for a specific user (recruit)
   * Returns emails where user is the recipient (user_id) or sender (sender_id)
   */
  async getEmailsForUser(userId: string): Promise<UserEmail[]> {
    const { data, error } = await supabase
      .from("user_emails")
      .select(
        `
        *,
        attachments:user_email_attachments(*)
      `,
      )
      .or(`user_id.eq.${userId},sender_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch emails:", error);
      throw error;
    }

    return data as UserEmail[];
  },

  /**
   * Get emails where user is the recipient (linked via user_id)
   */
  async getEmailsForRecruit(recruitId: string): Promise<UserEmail[]> {
    const { data, error } = await supabase
      .from("user_emails")
      .select(
        `
        *,
        attachments:user_email_attachments(*)
      `,
      )
      .eq("user_id", recruitId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch recruit emails:", error);
      throw error;
    }

    return data as UserEmail[];
  },

  /**
   * Get a single email by ID
   */
  async getEmailById(emailId: string): Promise<UserEmail | null> {
    const { data, error } = await supabase
      .from("user_emails")
      .select(
        `
        *,
        attachments:user_email_attachments(*)
      `,
      )
      .eq("id", emailId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      console.error("Failed to fetch email:", error);
      throw error;
    }

    return data as UserEmail;
  },

  /**
   * Helper to convert HTML to plain text
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
  },
};

export default emailService;
