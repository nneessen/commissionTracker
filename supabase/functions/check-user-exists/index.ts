// supabase/functions/check-user-exists/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    const { email, action } = await req.json();
    const normalizedEmail = email.toLowerCase().trim();

    console.log(
      "[check-user-exists] Checking email:",
      normalizedEmail,
      "action:",
      action,
    );

    // Method 1: List all users and search
    const { data: listData, error: listError } =
      await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

    const foundInList = listData?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail,
    );

    // Method 2: Check user_profiles table
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, email")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    // Method 3: Check auth.identities table directly via SQL
    const { data: identityData, error: identityError } =
      await supabaseAdmin.rpc("check_auth_identity", {
        check_email: normalizedEmail,
      });

    // Method 4: Try to create and see exact error
    let createError = null;
    try {
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: "temp-check-" + crypto.randomUUID(),
        email_confirm: false,
      });
      if (error) {
        createError = error.message;
      }
    } catch (e) {
      createError = e.message;
    }

    // Action: Delete orphaned identity if requested
    let deleteResult = null;
    if (action === "delete_orphan" && !foundInList) {
      // Try to delete via SQL function
      const { data: delData, error: delError } = await supabaseAdmin.rpc(
        "delete_orphan_identity",
        { del_email: normalizedEmail },
      );
      deleteResult = {
        success: !delError,
        data: delData,
        error: delError?.message,
      };
    }

    const result = {
      email: normalizedEmail,
      foundInAuthList: !!foundInList,
      authListUser: foundInList
        ? {
            id: foundInList.id,
            email: foundInList.email,
            created_at: foundInList.created_at,
          }
        : null,
      foundInProfiles: !!profileData,
      profileUser: profileData,
      identityCheck: identityData,
      identityError: identityError?.message,
      createError: createError,
      listError: listError?.message,
      profileError: profileError?.message,
      totalUsersInAuth: listData?.users?.length || 0,
      deleteResult: deleteResult,
    };

    console.log("[check-user-exists] Result:", JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[check-user-exists] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
