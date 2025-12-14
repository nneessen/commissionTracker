// supabase/functions/create-auth-user/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const { email, fullName, roles, isAdmin, skipPipeline, profileId } =
      await req.json();

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

    // Send password reset email so user can set their own password
    let emailSent = false;
    if (authUser.user) {
      const siteUrl = Deno.env.get("SITE_URL") || "https://www.thestandardhq.com";
      const { error: resetError } =
        await supabaseAdmin.auth.resetPasswordForEmail(email, {
          redirectTo: `${siteUrl}/auth/reset-password`,
        });

      if (resetError) {
        console.error("Password reset email error:", resetError);
        // Don't fail the entire operation - user was created successfully
      } else {
        emailSent = true;
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
