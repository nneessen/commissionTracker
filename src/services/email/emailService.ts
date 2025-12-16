// src/services/email/emailService.ts
// Unified Email Service - Uses Resend API via Edge Function
// Replaces fragmented Gmail OAuth implementation with single Resend-based service

import { supabase } from "@/services/base/supabase";

// ============================================
// TYPES
// ============================================

export interface EmailOptions {
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
  metadata?: Record<string, unknown>;
}

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  mimeType: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkEmailResult {
  total: number;
  sent: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}

export interface EmailUsageStats {
  emailsSentToday: number;
  emailsSentThisMonth: number;
  dailyLimit: number;
  monthlyLimit: number;
  canSend: boolean;
}

export interface QueuedEmail {
  to: string;
  subject: string;
  html: string;
  text?: string;
  scheduledFor?: Date;
  templateId?: string;
  variables?: Record<string, string>;
  userId: string;
}

export interface EmailHistoryFilters {
  status?: "sent" | "delivered" | "failed";
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

// ============================================
// EMAIL SERVICE
// ============================================

export const emailService = {
  /**
   * Send an email via Resend API
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    options?: EmailOptions,
  ): Promise<EmailResult> {
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-automated-email",
        {
          body: {
            to,
            subject,
            html,
            text: (options?.metadata?.text as string) || undefined,
            from: options?.from,
          },
        },
      );

      if (error) {
        console.error("Email send error:", error);
        return { success: false, error: error.message };
      }

      // Increment quota tracking
      await this.incrementUsage();

      return {
        success: true,
        messageId: data?.messageId,
      };
    } catch (err) {
      console.error("Email service error:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  },

  /**
   * Send an email using a template
   */
  async sendTemplatedEmail(
    to: string,
    templateId: string,
    variables: Record<string, string>,
    options?: EmailOptions,
  ): Promise<EmailResult> {
    try {
      // Fetch template
      const { data: template, error: templateError } = await supabase
        .from("email_templates")
        .select("subject, body_html, body_text")
        .eq("id", templateId)
        .single();

      if (templateError || !template) {
        return { success: false, error: "Template not found" };
      }

      // Replace variables in subject and body
      let subject = template.subject;
      let html = template.body_html;

      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, "g"), value);
        html = html.replace(new RegExp(placeholder, "g"), value);
      }

      return this.sendEmail(to, subject, html, options);
    } catch (err) {
      console.error("Templated email error:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  },

  /**
   * Send bulk emails (one at a time to respect rate limits)
   */
  async sendBulkEmail(
    recipients: string[],
    subject: string,
    html: string,
    options?: EmailOptions,
  ): Promise<BulkEmailResult> {
    const result: BulkEmailResult = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      errors: [],
    };

    for (const to of recipients) {
      const emailResult = await this.sendEmail(to, subject, html, options);
      if (emailResult.success) {
        result.sent++;
      } else {
        result.failed++;
        result.errors.push({
          email: to,
          error: emailResult.error || "Unknown error",
        });
      }
      // Small delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return result;
  },

  // ============================================
  // QUEUE MANAGEMENT
  // ============================================

  /**
   * Add email to queue for later sending
   */
  async queueEmail(email: QueuedEmail): Promise<{ id: string } | null> {
    const { data, error } = await supabase
      .from("email_queue")
      .insert({
        recipient_email: email.to,
        subject: email.subject,
        body_html: email.html,
        body_text: email.text,
        scheduled_for:
          email.scheduledFor?.toISOString() || new Date().toISOString(),
        template_id: email.templateId,
        variables: email.variables,
        user_id: email.userId,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Queue email error:", error);
      return null;
    }

    return data;
  },

  // ============================================
  // USAGE TRACKING
  // ============================================

  /**
   * Get email usage statistics for current user
   */
  async getUsageStats(userId: string): Promise<EmailUsageStats> {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Get today's usage
    const { data: todayData } = await supabase
      .from("email_quota_tracking")
      .select("emails_sent")
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    // Get this month's usage (sum all days)
    const { data: monthData } = await supabase
      .from("email_quota_tracking")
      .select("emails_sent")
      .eq("user_id", userId)
      .gte("date", monthStart.toISOString().split("T")[0]);

    const emailsSentToday = todayData?.emails_sent || 0;
    const emailsSentThisMonth =
      monthData?.reduce((sum, row) => sum + row.emails_sent, 0) || 0;

    // Default limits (will be overridden by subscription tier)
    const dailyLimit = 50;
    const monthlyLimit = 25;

    return {
      emailsSentToday,
      emailsSentThisMonth,
      dailyLimit,
      monthlyLimit,
      canSend:
        emailsSentThisMonth < monthlyLimit && emailsSentToday < dailyLimit,
    };
  },

  /**
   * Check if user can send email (quota check)
   */
  async canSendEmail(userId: string, count = 1): Promise<boolean> {
    const stats = await this.getUsageStats(userId);
    return stats.emailsSentThisMonth + count <= stats.monthlyLimit;
  },

  /**
   * Increment email usage count
   */
  async incrementUsage(): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];

    // Use upsert to increment or create
    const { data: existing } = await supabase
      .from("email_quota_tracking")
      .select("id, emails_sent")
      .eq("user_id", user.id)
      .eq("date", today)
      .eq("provider", "resend")
      .single();

    if (existing) {
      await supabase
        .from("email_quota_tracking")
        .update({ emails_sent: existing.emails_sent + 1 })
        .eq("id", existing.id);
    } else {
      await supabase.from("email_quota_tracking").insert({
        user_id: user.id,
        date: today,
        provider: "resend",
        emails_sent: 1,
      });
    }
  },

  // ============================================
  // EMAIL HISTORY
  // ============================================

  /**
   * Get email history for user
   */
  async getEmailHistory(userId: string, filters?: EmailHistoryFilters) {
    let query = supabase
      .from("user_emails")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.dateFrom) {
      query = query.gte("created_at", filters.dateFrom.toISOString());
    }
    if (filters?.dateTo) {
      query = query.lte("created_at", filters.dateTo.toISOString());
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 10) - 1,
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Get email history error:", error);
      return [];
    }

    return data;
  },

  /**
   * Record email in history
   */
  async recordEmailHistory(
    userId: string,
    to: string,
    subject: string,
    html: string,
    status: "sent" | "failed",
    messageId?: string,
    errorMessage?: string,
  ): Promise<void> {
    await supabase.from("user_emails").insert({
      user_id: userId,
      to_addresses: [to],
      subject,
      body_html: html,
      status,
      provider: "resend",
      provider_message_id: messageId,
      failed_reason: errorMessage,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    });
  },
};

export default emailService;
