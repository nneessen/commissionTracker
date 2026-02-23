// supabase/functions/send-email-change/index.ts
// Sends email change confirmation emails via Mailgun.
// With double_confirm_changes disabled, only the new address confirms.
// Compensating control: old email gets a notification about the change attempt.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailChangeRequest {
  newEmail: string;
}

const ALLOWED_KEYS = new Set(["newEmail"]);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[send-email-change] Function invoked");

    // Get credentials
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
    const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");
    const SITE_URL =
      Deno.env.get("SITE_URL") || "https://www.thestandardhq.com";

    // Normalize to canonical URL
    const normalizedSiteUrl = SITE_URL.replace(
      "://thestandardhq.com",
      "://www.thestandardhq.com",
    );

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[send-email-change] Missing Supabase credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      console.error("[send-email-change] Missing Mailgun credentials");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email service not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const jwt = authHeader.slice(7);

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Resolve caller identity from JWT
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.getUser(jwt);
    if (userError || !userData?.user) {
      console.error("[send-email-change] JWT validation failed");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid session" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const currentEmail = userData.user.email;
    if (!currentEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Current user has no email address",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body: EmailChangeRequest = await req.json();

    // Reject unknown keys
    const unknownKeys = Object.keys(body).filter((k) => !ALLOWED_KEYS.has(k));
    if (unknownKeys.length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Unknown fields in request" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { newEmail } = body;

    // Validate new email
    if (!newEmail || typeof newEmail !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "newEmail is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const trimmedNew = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedNew)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email address" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (trimmedNew === currentEmail.toLowerCase()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "New email must be different from your current email",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check new email isn't already in use
    const { data: existing } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("email", trimmedNew)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "That email address is already in use",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const redirectTo = `${normalizedSiteUrl}/auth/callback`;
    console.log(
      "[send-email-change] Generating link for user:",
      userData.user.id,
    );

    // Generate confirmation link for the new address only.
    const { data: newLinkData, error: newLinkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "email_change_new",
        email: currentEmail,
        newEmail: trimmedNew,
        options: {
          redirectTo,
          expiresIn: 86400, // 24 hours
        },
      });

    if (newLinkError || !newLinkData?.properties?.action_link) {
      console.error(
        "[send-email-change] Failed to generate link:",
        newLinkError?.message,
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Something went wrong",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const confirmLink = newLinkData.properties.action_link;

    const credentials = `api:${MAILGUN_API_KEY}`;
    const encoder = new TextEncoder();
    const credentialsBytes = encoder.encode(credentials);
    const base64Credentials = btoa(String.fromCharCode(...credentialsBytes));
    const mailgunUrl = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;

    // --- Email to NEW address: confirmation link ---
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your New Email Address</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">Confirm Your New Email</h1>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
                Click the button below to confirm this as the new email address for your The Standard HQ account. The change takes effect immediately.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 8px 0 24px;">
                    <a href="${confirmLink}" style="display: inline-block; padding: 12px 32px; font-size: 14px; font-weight: 600; color: #ffffff; background-color: #18181b; text-decoration: none; border-radius: 6px;">
                      Confirm New Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.5; color: #71717a;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px; font-size: 12px; line-height: 1.5; color: #a1a1aa; word-break: break-all;">
                ${confirmLink}
              </p>
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                This link expires in 24 hours. If you did not request this change, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px 24px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #a1a1aa;">
                &copy; ${new Date().getFullYear()} The Standard HQ. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    const emailText = `
Confirm Your New Email Address

Click this link to confirm your new email address for The Standard HQ:
${confirmLink}

This link expires in 24 hours. If you did not request this change, you can safely ignore this email.

© ${new Date().getFullYear()} The Standard HQ`.trim();

    const form = new FormData();
    form.append("from", `The Standard HQ <noreply@${MAILGUN_DOMAIN}>`);
    form.append("to", trimmedNew);
    form.append("subject", "Confirm your new email address — The Standard HQ");
    form.append("html", emailHtml);
    form.append("text", emailText);
    form.append("o:tracking", "no");

    const mailgunResponse = await fetch(mailgunUrl, {
      method: "POST",
      headers: { Authorization: `Basic ${base64Credentials}` },
      body: form,
    });

    await mailgunResponse.text();
    console.log("[send-email-change] Mailgun response:", {
      status: mailgunResponse.status,
    });

    if (!mailgunResponse.ok) {
      console.error(
        "[send-email-change] Mailgun error, status:",
        mailgunResponse.status,
      );
      return new Response(
        JSON.stringify({ success: false, error: "Something went wrong" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      "[send-email-change] Confirmation email sent for user:",
      userData.user.id,
    );

    // --- Notification to OLD email (fire-and-forget) ---
    try {
      const notifyHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Change Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">Email Change Request</h1>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
                A request was made to change the email address on your The Standard HQ account. If this was you, no action is needed.
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #dc2626; font-weight: 600;">
                If you did not make this request, please contact support immediately.
              </p>
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                This is an automated security notification. You do not need to click any links.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px 24px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #a1a1aa;">
                &copy; ${new Date().getFullYear()} The Standard HQ. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

      const notifyText = `Email Change Request\n\nA request was made to change the email address on your The Standard HQ account. If this was you, no action is needed.\n\nIf you did not make this request, please contact support immediately.\n\n© ${new Date().getFullYear()} The Standard HQ`;

      const notifyForm = new FormData();
      notifyForm.append("from", `The Standard HQ <noreply@${MAILGUN_DOMAIN}>`);
      notifyForm.append("to", currentEmail);
      notifyForm.append(
        "subject",
        "Security Alert: Email change requested — The Standard HQ",
      );
      notifyForm.append("html", notifyHtml);
      notifyForm.append("text", notifyText);
      notifyForm.append("o:tracking", "no");

      // Await the notification to ensure it's sent before the edge runtime shuts down.
      // Use a short timeout so it doesn't block the response for too long on Mailgun issues.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
      try {
        const notifyResp = await fetch(mailgunUrl, {
          method: "POST",
          headers: { Authorization: `Basic ${base64Credentials}` },
          body: notifyForm,
          signal: controller.signal,
        });
        console.log(
          "[send-email-change] Old email notification sent, status:",
          notifyResp.status,
        );
      } catch (fetchErr) {
        console.error(
          "[send-email-change] Old email notification failed:",
          fetchErr instanceof Error ? fetchErr.message : "unknown",
        );
      } finally {
        clearTimeout(timeout);
      }
    } catch (notifyError) {
      // Don't fail the main request if notification fails
      console.error(
        "[send-email-change] Old email notification error:",
        notifyError instanceof Error ? notifyError.message : "unknown",
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Confirmation email sent",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error(
      "[send-email-change] Error:",
      err instanceof Error ? err.message : "Unknown",
    );

    return new Response(
      JSON.stringify({ success: false, error: "Something went wrong" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
