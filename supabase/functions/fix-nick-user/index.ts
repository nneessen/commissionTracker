// /home/nneessen/projects/commissionTracker/supabase/functions/fix-nick-user/index.ts
// Edge function to fix nick.neessen@gmail.com user

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 1. Fix the user profile
    const { data: _updateData, error: updateError } = await supabase
      .from("user_profiles")
      .update({
        roles: ["active_agent"],
        agent_status: "licensed",
        approval_status: "approved",
        contract_level: 100,
        onboarding_status: null,
        current_onboarding_phase: null,
        onboarding_started_at: null,
        is_admin: false,
      })
      .eq("email", "nick.neessen@gmail.com")
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    // 2. Check if auth user exists
    const { data: authUser, error: authError } =
      await supabase.auth.admin.getUserByEmail("nick.neessen@gmail.com");

    let authStatus = "existing";
    if (!authUser || authError) {
      // Create auth user if doesn't exist
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: "nick.neessen@gmail.com",
          password: "N123j234n345!$!$",
          email_confirm: true,
        });

      if (createError) {
        authStatus = `creation_failed: ${createError.message}`;
      } else {
        authStatus = "created";

        // Link auth user to profile
        await supabase
          .from("user_profiles")
          .update({ user_id: newUser.user.id })
          .eq("email", "nick.neessen@gmail.com");
      }
    }

    // 3. Verify user doesn't show in recruiting
    const { data: recruitCheck } = await supabase
      .from("user_profiles")
      .select("email, roles, onboarding_status")
      .eq("email", "nick.neessen@gmail.com")
      .or("roles.cs.{recruit},onboarding_status.not.is.null")
      .single();

    const showsInRecruiting = !!recruitCheck;

    // 4. Get final state
    const { data: finalProfile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("email", "nick.neessen@gmail.com")
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        profile_fixed: true,
        auth_status: authStatus,
        shows_in_recruiting: showsInRecruiting,
        final_profile: {
          id: finalProfile?.id,
          email: finalProfile?.email,
          roles: finalProfile?.roles,
          agent_status: finalProfile?.agent_status,
          approval_status: finalProfile?.approval_status,
          contract_level: finalProfile?.contract_level,
          onboarding_status: finalProfile?.onboarding_status,
          user_id: finalProfile?.user_id,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- error object type
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
