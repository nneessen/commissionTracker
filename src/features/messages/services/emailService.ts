// src/features/messages/services/emailService.ts
// Service for sending and managing emails

import { supabase } from "@/services/base/supabase";

export interface SendEmailParams {
  userId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  replyToMessageId?: string;
  threadId?: string;
  attachments?: File[];
  scheduledFor?: Date;
  signatureId?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export interface EmailQuota {
  dailyLimit: number;
  dailyUsed: number;
  monthlyLimit: number;
  monthlyUsed: number;
  resetAt: string;
}

export interface EmailDraft {
  id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml: string;
  updatedAt: string;
}

const EMAIL_DOMAIN = "updates.thestandardhq.com";

export async function sendEmail(
  params: SendEmailParams,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const {
    userId,
    to,
    cc,
    bcc,
    subject,
    bodyHtml,
    bodyText,
    replyToMessageId,
    threadId,
    scheduledFor,
    signatureId,
    trackOpens = true,
    trackClicks = true,
  } = params;

  try {
    // Check quota first
    const quota = await getEmailQuota(userId);
    if (quota.dailyUsed >= quota.dailyLimit) {
      return { success: false, error: "Daily email limit reached" };
    }

    // Get user's email address for from field
    const { data: userData } = await supabase
      .from("user_profiles")
      .select("email, first_name, last_name")
      .eq("id", userId)
      .single();

    if (!userData?.email) {
      return { success: false, error: "User email not found" };
    }

    // Get signature if specified
    let finalBodyHtml = bodyHtml;
    if (signatureId) {
      const { data: signature } = await supabase
        .from("email_signatures")
        .select("html_content")
        .eq("id", signatureId)
        .eq("user_id", userId)
        .single();

      if (signature?.html_content) {
        finalBodyHtml = `${bodyHtml}<br/><br/>${signature.html_content}`;
      }
    }

    // Generate tracking ID
    const trackingId = crypto.randomUUID();

    // Add tracking pixel if enabled
    if (trackOpens) {
      const trackingPixel = `<img src="${process.env.VITE_SUPABASE_URL}/functions/v1/track-email-open?id=${trackingId}" width="1" height="1" style="display:none" />`;
      finalBodyHtml = `${finalBodyHtml}${trackingPixel}`;
    }

    // Rewrite links for click tracking if enabled
    if (trackClicks) {
      finalBodyHtml = rewriteLinksForTracking(finalBodyHtml, trackingId);
    }

    const fromName =
      `${userData.first_name || ""} ${userData.last_name || ""}`.trim() ||
      "The Standard HQ";
    const fromAddress = `noreply@${EMAIL_DOMAIN}`;
    const replyTo = userData.email;

    // If scheduled, save to scheduled queue
    if (scheduledFor && scheduledFor > new Date()) {
      const { data: scheduled, error: scheduleError } = await supabase
        .from("email_scheduled")
        .insert({
          user_id: userId,
          to_addresses: to,
          cc_addresses: cc || [],
          bcc_addresses: bcc || [],
          subject,
          body_html: finalBodyHtml,
          body_text: bodyText || stripHtml(bodyHtml),
          from_address: fromAddress,
          from_name: fromName,
          reply_to: replyTo,
          scheduled_for: scheduledFor.toISOString(),
          thread_id: threadId,
          reply_to_message_id: replyToMessageId,
          tracking_id: trackingId,
        })
        .select()
        .single();

      if (scheduleError) {
        console.error("Error scheduling email:", scheduleError);
        return { success: false, error: "Failed to schedule email" };
      }

      return { success: true, messageId: scheduled?.id };
    }

    // Send immediately via edge function
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to,
        cc,
        bcc,
        subject,
        html: finalBodyHtml,
        text: bodyText || stripHtml(bodyHtml),
        from: `${fromName} <${fromAddress}>`,
        replyTo,
        trackingId,
        userId,
        threadId,
        replyToMessageId,
      },
    });

    if (error) {
      console.error("Error sending email:", error);
      return { success: false, error: error.message };
    }

    // Update quota
    await incrementQuota(userId);

    return { success: true, messageId: data?.messageId };
  } catch (err) {
    console.error("Error in sendEmail:", err);
    return { success: false, error: "Failed to send email" };
  }
}

export async function getEmailQuota(userId: string): Promise<EmailQuota> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("email_quota_tracking")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching quota:", error);
  }

  // Default limits (conservative for single-user app)
  const defaultDailyLimit = 50;
  const defaultMonthlyLimit = 500;

  if (!data) {
    return {
      dailyLimit: defaultDailyLimit,
      dailyUsed: 0,
      monthlyLimit: defaultMonthlyLimit,
      monthlyUsed: 0,
      resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
    };
  }

  return {
    dailyLimit: defaultDailyLimit,
    dailyUsed: data.emails_sent || 0,
    monthlyLimit: defaultMonthlyLimit,
    monthlyUsed: data.emails_sent || 0, // Would need to aggregate for monthly
    resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
  };
}

async function incrementQuota(userId: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const provider = "resend"; // Default email provider

  // Check if record exists for today
  const { data: existing } = await supabase
    .from("email_quota_tracking")
    .select("id, emails_sent")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  if (existing) {
    // Increment existing record
    await supabase
      .from("email_quota_tracking")
      .update({ emails_sent: (existing.emails_sent || 0) + 1 })
      .eq("id", existing.id);
  } else {
    // Insert new record
    await supabase.from("email_quota_tracking").insert({
      user_id: userId,
      date: today,
      emails_sent: 1,
      provider,
    });
  }
}

export async function saveDraft(params: {
  userId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml: string;
  draftId?: string;
}): Promise<{ success: boolean; draftId?: string }> {
  const { userId, to, cc, bcc, subject, bodyHtml, draftId } = params;

  if (draftId) {
    // Update existing draft
    const { error } = await supabase
      .from("user_emails")
      .update({
        to_addresses: to,
        cc_addresses: cc,
        bcc_addresses: bcc,
        subject,
        body_html: bodyHtml,
        body_text: stripHtml(bodyHtml),
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId)
      .eq("user_id", userId)
      .eq("status", "draft");

    if (error) {
      console.error("Error updating draft:", error);
      return { success: false };
    }

    return { success: true, draftId };
  }

  // Create new draft
  const { data, error } = await supabase
    .from("user_emails")
    .insert({
      user_id: userId,
      to_addresses: to,
      cc_addresses: cc,
      bcc_addresses: bcc,
      subject,
      body_html: bodyHtml,
      body_text: stripHtml(bodyHtml),
      status: "draft",
      is_incoming: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating draft:", error);
    return { success: false };
  }

  return { success: true, draftId: data?.id };
}

export async function deleteDraft(
  draftId: string,
  userId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("user_emails")
    .delete()
    .eq("id", draftId)
    .eq("user_id", userId)
    .eq("status", "draft");

  if (error) {
    console.error("Error deleting draft:", error);
    return false;
  }

  return true;
}

export async function getDrafts(userId: string): Promise<EmailDraft[]> {
  const { data, error } = await supabase
    .from("user_emails")
    .select(
      "id, to_addresses, cc_addresses, bcc_addresses, subject, body_html, updated_at",
    )
    .eq("user_id", userId)
    .eq("status", "draft")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching drafts:", error);
    return [];
  }

  return (data || []).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    to: (d.to_addresses as string[]) || [],
    cc: d.cc_addresses as string[] | undefined,
    bcc: d.bcc_addresses as string[] | undefined,
    subject: (d.subject as string) || "",
    bodyHtml: (d.body_html as string) || "",
    updatedAt: d.updated_at as string,
  }));
}

// Helper functions
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function rewriteLinksForTracking(html: string, trackingId: string): string {
  // Simple link rewriting - in production would use proper HTML parsing
  const baseUrl = process.env.VITE_SUPABASE_URL || "";
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (_match, url) => {
    const trackingUrl = `${baseUrl}/functions/v1/track-email-click?id=${trackingId}&url=${encodeURIComponent(url)}`;
    return `href="${trackingUrl}"`;
  });
}
