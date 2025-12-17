// Send Email Edge Function
// Unified email sending via Resend API
// Handles all email types: recruiter->recruit, recruit->recruiter, automated

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createSupabaseClient,
  createSupabaseAdminClient,
} from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to: string[]; // Recipient email addresses
  cc?: string[]; // CC recipients
  subject: string;
  // Support both naming conventions
  html?: string; // HTML body (new convention)
  text?: string; // Text body (new convention)
  bodyHtml?: string; // HTML body (legacy convention)
  bodyText?: string; // Text body (legacy convention)
  replyTo?: string; // Sender's email for replies
  from?: string; // Custom from address (optional)
  // Metadata for database tracking
  recruitId?: string; // Link to recruit (user_id in user_emails)
  senderId?: string; // Who sent it (sender_id in user_emails)
  metadata?: Record<string, unknown>;
}

interface SendEmailResponse {
  success: boolean;
  emailId?: string; // Our database ID
  resendMessageId?: string; // Resend's message ID
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminSupabase = createSupabaseAdminClient();

  try {
    // Get the user's JWT from the Authorization header (optional - for authenticated requests)
    const authHeader = req.headers.get("Authorization");
    let authenticatedUserId: string | null = null;

    if (authHeader) {
      const supabase = createSupabaseClient(authHeader);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      authenticatedUserId = user?.id || null;
    }

    // Parse request body
    const body: SendEmailRequest = await req.json();

    // Normalize field names (support both conventions)
    const htmlContent = body.html || body.bodyHtml;
    const textContent = body.text || body.bodyText;

    // Validate required fields
    if (!body.to || body.to.length === 0 || !body.subject || !htmlContent) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: to, subject, html/bodyHtml",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Filter out empty strings from recipients
    const toAddresses = body.to.filter((email) => email && email.trim());
    const ccAddresses = body.cc?.filter((email) => email && email.trim()) || [];

    if (toAddresses.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid recipient email addresses" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Sending email:", {
      to: toAddresses,
      cc: ccAddresses,
      subject: body.subject,
      senderId: body.senderId || authenticatedUserId,
      recruitId: body.recruitId,
      hasReplyTo: !!body.replyTo,
    });

    // Get Resend API key from environment
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    let resendMessageId: string | null = null;
    let emailStatus: "sent" | "simulated" = "sent";

    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured, simulating email send");
      console.log("=== SIMULATED EMAIL ===");
      console.log("To:", toAddresses.join(", "));
      console.log("CC:", ccAddresses.join(", ") || "(none)");
      console.log("Subject:", body.subject);
      console.log("Reply-To:", body.replyTo || "(none)");
      console.log("=======================");

      resendMessageId = `simulated-${Date.now()}`;
      emailStatus = "simulated";
    } else {
      // Send via Resend API
      const resendPayload: Record<string, unknown> = {
        from: body.from || "Commission Tracker <noreply@thestandardhq.com>",
        to: toAddresses,
        subject: body.subject,
        html: htmlContent,
      };

      if (textContent) {
        resendPayload.text = textContent;
      }

      if (ccAddresses.length > 0) {
        resendPayload.cc = ccAddresses;
      }

      if (body.replyTo) {
        resendPayload.reply_to = body.replyTo;
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resendPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Resend API error:", data);
        throw new Error(data.message || "Failed to send email via Resend");
      }

      resendMessageId = data.id;
      console.log("Email sent via Resend:", resendMessageId);
    }

    // Store email record in database
    // Determine user_id: if recruitId provided, use it; otherwise use first recipient's profile
    let emailUserId = body.recruitId;

    if (!emailUserId && toAddresses.length > 0) {
      // Try to find recipient's profile ID
      const { data: recipientProfile } = await adminSupabase
        .from("user_profiles")
        .select("id")
        .eq("email", toAddresses[0])
        .single();

      emailUserId = recipientProfile?.id;
    }

    // Determine sender_id
    const senderProfileId = body.senderId || authenticatedUserId;

    const emailRecord: Record<string, unknown> = {
      subject: body.subject,
      body_html: htmlContent,
      body_text: textContent,
      status: emailStatus === "simulated" ? "draft" : "sent",
      sent_at: new Date().toISOString(),
      provider: "resend",
      provider_message_id: resendMessageId,
      is_incoming: false,
      to_addresses: toAddresses,
      cc_addresses: ccAddresses.length > 0 ? ccAddresses : null,
      metadata: body.metadata || null,
    };

    // Only set user_id if we have one
    if (emailUserId) {
      emailRecord.user_id = emailUserId;
    }

    // Only set sender_id if we have one
    if (senderProfileId) {
      emailRecord.sender_id = senderProfileId;
    }

    // Set from_address based on replyTo or default
    emailRecord.from_address =
      body.replyTo || body.from || "noreply@commissiontracker.com";

    const { data: savedEmail, error: dbError } = await adminSupabase
      .from("user_emails")
      .insert(emailRecord)
      .select()
      .single();

    if (dbError) {
      console.error("Failed to save email record:", dbError);
      // Email was sent but not recorded - still return success
    } else {
      console.log("Email record saved:", savedEmail?.id);
    }

    const response: SendEmailResponse = {
      success: true,
      emailId: savedEmail?.id,
      resendMessageId: resendMessageId || undefined,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Send email error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
