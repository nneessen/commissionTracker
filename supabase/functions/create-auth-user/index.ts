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

    const { email, fullName, roles, isAdmin, skipPipeline } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some((u) => u.email === email);

    if (userExists) {
      throw new Error("User with this email already exists");
    }

    // First try to send invite email (this creates the user and sends confirmation in one step)
    try {
      const { data: inviteData, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: {
            full_name: fullName,
            roles: roles || [],
            is_admin: isAdmin || false,
            skip_pipeline: skipPipeline || false,
          },
          redirectTo: `${req.headers.get("origin")}/auth/callback?type=signup`,
        });

      if (inviteError) {
        console.error("Invite error:", inviteError);
        throw inviteError;
      }

      // Get the created user details
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const newUser = userList?.users?.find((u) => u.email === email);

      return new Response(
        JSON.stringify({
          user: newUser || inviteData,
          message: "User created and confirmation email sent successfully.",
          emailSent: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    } catch (inviteError) {
      console.error("Failed to invite user:", inviteError);

      // Fallback: Create user manually and send password reset
      const { data: authUser, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: false,
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

      // Send password reset email as confirmation
      try {
        const { error: resetError } =
          await supabaseAdmin.auth.resetPasswordForEmail(email, {
            redirectTo: `${req.headers.get("origin")}/auth/callback?type=recovery`,
          });

        if (resetError) {
          console.error("Password reset error:", resetError);
          return new Response(
            JSON.stringify({
              user: authUser.user,
              message:
                "User created but confirmation email failed. User should request password reset.",
              emailSent: false,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            },
          );
        }

        return new Response(
          JSON.stringify({
            user: authUser.user,
            message:
              "User created. Password reset email sent (as confirmation).",
            emailSent: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      } catch (emailError) {
        console.error("Email error:", emailError);
        return new Response(
          JSON.stringify({
            user: authUser.user,
            message:
              "User created but email failed. User should request password reset.",
            emailSent: false,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }
    }
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
