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

    // Create user with email_confirm: false to trigger signup confirmation email
    // This will send the "Confirm signup" template, not the "Invite user" template
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: false, // User must confirm email - triggers signup confirmation
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

    // The createUser with email_confirm: false automatically sends the confirmation email
    // using the "Confirm signup" template configured in Supabase dashboard

    return new Response(
      JSON.stringify({
        user: authUser.user,
        message:
          "User created successfully. Confirmation email sent using your custom template.",
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
