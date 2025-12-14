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

    // Generate a secure random password
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();

    // Create user with a password and email_confirm=false
    // This triggers the "Confirm signup" email template
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: false, // This triggers signup confirmation email
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

    return new Response(
      JSON.stringify({
        user: authUser.user,
        message: "User created successfully. Signup confirmation email sent.",
        emailSent: true,
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
