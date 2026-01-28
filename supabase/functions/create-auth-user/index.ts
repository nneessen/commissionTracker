// supabase/functions/create-auth-user/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

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
  mailgunDomain: string,
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
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #52525b;">
                Your account has been created. Click the button below to set your password and get started.
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.5; color: #dc2626; font-weight: 500;">
                ⚠️ This link expires in 72 hours. Please set your password soon.
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

IMPORTANT: This link expires in 72 hours. Please set your password soon.

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
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// Helper function to send SMS notification via Twilio
// Uses same env vars as send-sms edge function
async function sendSmsNotification(
  phoneNumber: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  // Match the existing send-sms edge function pattern
  const fromNumber =
    Deno.env.get("MY_TWILIO_NUMBER") || Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    console.log("[create-auth-user] SMS skipped - Twilio not configured");
    return { success: false, error: "Twilio not configured" };
  }

  // Validate phone number format (basic check)
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  if (cleanPhone.length < 10) {
    console.log(
      "[create-auth-user] SMS skipped - Invalid phone number:",
      phoneNumber,
    );
    return { success: false, error: "Invalid phone number" };
  }

  // Format phone number with country code if needed
  const formattedPhone =
    cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = btoa(`${accountSid}:${authToken}`);

    const body = new URLSearchParams({
      To: formattedPhone,
      From: fromNumber,
      Body: message,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[create-auth-user] Twilio error:", errorText);
      return { success: false, error: `Twilio API error: ${response.status}` };
    }

    console.log("[create-auth-user] SMS sent successfully to:", formattedPhone);
    return { success: true };
  } catch (err) {
    console.error("[create-auth-user] SMS send error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
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
      phone,
      profileData,
    } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    // Normalize email to lowercase for consistent checking
    const normalizedEmail = email.toLowerCase().trim();

    // First, check if user already exists
    const { data: existingUsers, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error("[create-auth-user] Failed to list users:", listError);
    } else {
      const existingUser = existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === normalizedEmail,
      );
      if (existingUser) {
        console.log(
          "[create-auth-user] User already exists, updating profile:",
          { email: normalizedEmail, userId: existingUser.id },
        );

        // User exists - still update their profile with any new data (like upline_id)
        let existingProfile = null;
        if (profileData) {
          const { data: updatedProfile, error: profileError } =
            await supabaseAdmin
              .from("user_profiles")
              .update(profileData)
              .eq("id", existingUser.id)
              .select()
              .single();

          if (profileError) {
            console.error(
              "[create-auth-user] Profile update failed for existing user:",
              profileError,
            );
          } else {
            existingProfile = updatedProfile;
            console.log(
              "[create-auth-user] Profile updated for existing user:",
              {
                userId: existingUser.id,
                upline_id: existingProfile?.upline_id,
              },
            );
          }
        }

        return new Response(
          JSON.stringify({
            user: existingUser,
            profile: existingProfile,
            message: "User already exists - profile updated",
            emailSent: false,
            alreadyExists: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }
    }

    // Generate a secure random password (user will set their own via reset email)
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();

    // Create user with email_confirm=true (pre-confirmed) and a temp password
    // Then send password reset email so user can set their own password
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
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
      // Provide clearer error message for common cases
      const errorMsg = authError.message?.toLowerCase() || "";
      if (
        errorMsg.includes("already registered") ||
        errorMsg.includes("already exists") ||
        errorMsg.includes("duplicate")
      ) {
        // User already exists - handle as success (race condition)
        console.log(
          "[create-auth-user] Duplicate detected during create, treating as success:",
          { email: normalizedEmail },
        );
        return new Response(
          JSON.stringify({
            user: null,
            message: "User already exists (detected during create)",
            emailSent: false,
            alreadyExists: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }
      throw authError;
    }

    // Note: user_profiles.id IS auth.users.id (same UUID)
    // The handle_new_user trigger creates the profile automatically
    // No need to manually link - the profile id = auth user id

    // Update the profile with additional data if provided (using service role to bypass RLS)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let profile: any = null;
    if (authUser.user && profileData) {
      // Small delay to ensure trigger has completed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Debug: Log what we're about to update
      console.log("[create-auth-user] Updating profile with data:", {
        userId: authUser.user.id,
        upline_id: profileData.upline_id,
        imo_id: profileData.imo_id,
        keys: Object.keys(profileData),
      });

      const { data: updatedProfile, error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .update(profileData)
        .eq("id", authUser.user.id)
        .select()
        .single();

      if (profileError) {
        console.error(
          "[create-auth-user] Profile update failed:",
          JSON.stringify(profileError),
        );
        console.error(
          "[create-auth-user] ProfileData that failed:",
          JSON.stringify(profileData),
        );
        // Don't throw - auth user was created, profile will have minimal data
      } else {
        profile = updatedProfile;
        console.log("[create-auth-user] Profile updated successfully:", {
          userId: authUser.user.id,
          upline_id: profile?.upline_id,
          imo_id: profile?.imo_id,
        });
      }
    }

    // Send password reset email via Mailgun (not Supabase's built-in email)
    let emailSent = false;
    if (authUser.user) {
      const siteUrl =
        Deno.env.get("SITE_URL") || "https://www.thestandardhq.com";
      const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
      const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");

      // Log env var presence for diagnostics (not values)
      console.log("[create-auth-user] Env check:", {
        hasMailgunKey: !!MAILGUN_API_KEY,
        hasMailgunDomain: !!MAILGUN_DOMAIN,
        hasSiteUrl: !!Deno.env.get("SITE_URL"),
        hasServiceRoleKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      });

      if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
        console.error(
          "[create-auth-user] Missing Mailgun credentials for email",
        );
      } else {
        // Generate a password reset link using Supabase Admin SDK
        // Use /auth/callback which is whitelisted and handles recovery type
        const { data: linkData, error: linkError } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: normalizedEmail,
            options: {
              redirectTo: `${siteUrl}/auth/callback`,
            },
          });

        // Log link generation result for diagnostics
        console.log("[create-auth-user] Link generation:", {
          success: !linkError,
          hasLink: !!linkData?.properties?.action_link,
          error: linkError?.message || null,
        });

        if (linkError) {
          console.error(
            "[create-auth-user] Failed to generate reset link:",
            linkError,
          );
        } else if (linkData?.properties?.action_link) {
          const result = await sendPasswordResetEmail(
            normalizedEmail,
            linkData.properties.action_link,
            MAILGUN_API_KEY,
            MAILGUN_DOMAIN,
          );
          emailSent = result.success;

          // Log email send result for diagnostics
          console.log("[create-auth-user] Email send result:", {
            success: result.success,
            error: result.error || null,
          });

          if (!result.success) {
            console.error(
              "[create-auth-user] Email send failed:",
              result.error,
            );
          }
        }
      }
    }

    // Send SMS notification if phone provided and email was sent
    let smsSent = false;
    if (phone && emailSent) {
      const smsResult = await sendSmsNotification(
        phone,
        "Welcome to The Standard HQ! Check your email to set your password. The link expires in 72 hours.",
      );
      smsSent = smsResult.success;
      console.log("[create-auth-user] SMS result:", {
        success: smsSent,
        error: smsResult.error || null,
      });
    } else if (phone && !emailSent) {
      console.log("[create-auth-user] SMS skipped - email was not sent");
    }

    // Log final status
    console.log("[create-auth-user] Complete:", {
      userId: authUser.user?.id,
      email: normalizedEmail,
      emailSent,
      smsSent,
    });

    return new Response(
      JSON.stringify({
        user: authUser.user,
        profile, // Include the updated profile (or null if profileData wasn't provided)
        profileUpdateError: profile
          ? null
          : "Profile update may have failed - check logs",
        message: emailSent
          ? "User created successfully. Password reset email sent."
          : "User created but email could not be sent. Check edge function logs.",
        emailSent,
        smsSent,
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
