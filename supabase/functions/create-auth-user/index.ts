// supabase/functions/create-auth-user/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper function to send password reset email via Mailgun
async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
  mailgunApiKey: string,
  mailgunDomain: string
): Promise<{ success: boolean; error?: string }> {
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome - Set Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">Welcome to The Standard HQ!</h1>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #52525b;">
                Your account has been created. Click the button below to set your password and get started.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 8px 0 24px;">
                    <a href="${resetLink}" style="display: inline-block; padding: 12px 32px; font-size: 14px; font-weight: 600; color: #ffffff; background-color: #18181b; text-decoration: none; border-radius: 6px;">
                      Set Your Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.5; color: #71717a;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px; font-size: 12px; line-height: 1.5; color: #a1a1aa; word-break: break-all;">
                ${resetLink}
              </p>
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px 24px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #a1a1aa;">
                © ${new Date().getFullYear()} The Standard HQ. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const plainText = `
Welcome to The Standard HQ!

Your account has been created. Click this link to set your password:
${resetLink}

If you didn't expect this email, you can safely ignore it.

© ${new Date().getFullYear()} The Standard HQ
  `.trim();

  try {
    const form = new FormData();
    form.append("from", `The Standard HQ <noreply@${mailgunDomain}>`);
    form.append("to", email);
    form.append("subject", "Welcome - Set Your Password | The Standard HQ");
    form.append("html", emailHtml);
    form.append("text", plainText);
    form.append("o:tracking", "no");

    const mailgunUrl = `https://api.mailgun.net/v3/${mailgunDomain}/messages`;
    const credentials = `api:${mailgunApiKey}`;
    const encoder = new TextEncoder();
    const credentialsBytes = encoder.encode(credentials);
    const base64Credentials = btoa(String.fromCharCode(...credentialsBytes));

    const response = await fetch(mailgunUrl, {
      method: "POST",
      headers: { Authorization: `Basic ${base64Credentials}` },
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[create-auth-user] Mailgun error:", errorText);
      return { success: false, error: `Mailgun API error: ${response.status}` };
    }

    return { success: true };
  } catch (err) {
    console.error("[create-auth-user] Email send error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const {
      email,
      fullName,
      roles,
      isAdmin,
      skipPipeline,
      profileId: _profileId,
    } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some((u) => u.email === email);

    if (userExists) {
      throw new Error("User with this email already exists");
    }

    // Generate a secure random password (user will set their own via reset email)
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();

    // Create user with email_confirm=true (pre-confirmed) and a temp password
    // Then send password reset email so user can set their own password
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Pre-confirm email to avoid magic link issues
        user_metadata: {
          full_name: fullName,
          roles: roles || [],
          is_admin: isAdmin || false,
          skip_pipeline: skipPipeline || false,
        },
      });

    if (authError) {
      throw authError;
    }

    // Note: user_profiles.id IS auth.users.id (same UUID)
    // The handle_new_user trigger creates the profile automatically
    // No need to manually link - the profile id = auth user id

    // Send password reset email via Mailgun (not Supabase's built-in email)
    let emailSent = false;
    if (authUser.user) {
      const siteUrl = Deno.env.get("SITE_URL") || "https://www.thestandardhq.com";
      const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
      const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");

      if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
        console.error("[create-auth-user] Missing Mailgun credentials for email");
      } else {
        // Generate a password reset link using Supabase Admin SDK
        const { data: linkData, error: linkError } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: email,
            options: {
              redirectTo: `${siteUrl}/auth/reset-password`,
            },
          });

        if (linkError) {
          console.error("[create-auth-user] Failed to generate reset link:", linkError);
        } else if (linkData?.properties?.action_link) {
          const result = await sendPasswordResetEmail(
            email,
            linkData.properties.action_link,
            MAILGUN_API_KEY,
            MAILGUN_DOMAIN
          );
          emailSent = result.success;
          if (!result.success) {
            console.error("[create-auth-user] Email send failed:", result.error);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        user: authUser.user,
        message: emailSent
          ? "User created successfully. Password reset email sent."
          : "User created but email could not be sent. User may need manual password reset.",
        emailSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in create-auth-user function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create user",
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
