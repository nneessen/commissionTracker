// supabase/functions/linkedin-hosted-auth-callback/index.ts
// Handles Unipile webhook callback when a LinkedIn account is connected

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { parseSignedState } from "../_shared/hmac.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface UnipileAccountCallback {
  account_id: string;
  type: string;
  status: "CONNECTED" | "CREDENTIALS" | "ERROR";
  name?: string; // Contains our signed state
  provider_account_id?: string;
  provider_account_name?: string;
}

interface StatePayload {
  imoId: string;
  userId: string;
  timestamp: number;
  returnUrl?: string;
  accountType?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    console.log("[linkedin-hosted-auth-callback] Webhook received");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const UNIPILE_API_KEY = Deno.env.get("UNIPILE_API_KEY");
    const UNIPILE_DSN = Deno.env.get("UNIPILE_DSN");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error(
        "[linkedin-hosted-auth-callback] Missing Supabase credentials",
      );
      return new Response(
        JSON.stringify({ ok: false, error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const callback: UnipileAccountCallback = await req.json();
    console.log(
      "[linkedin-hosted-auth-callback] Callback data:",
      JSON.stringify(callback),
    );

    const { account_id, type, status, name: signedState } = callback;

    if (!account_id || !signedState) {
      console.error("[linkedin-hosted-auth-callback] Missing required fields");
      return new Response(
        JSON.stringify({ ok: false, error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify signed state
    let state: StatePayload;
    try {
      state = await parseSignedState<StatePayload>(signedState);
    } catch (err) {
      console.error(
        "[linkedin-hosted-auth-callback] Invalid state signature:",
        err,
      );
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid state signature" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify timestamp (10 minute expiry for callback)
    const stateAge = Date.now() - state.timestamp;
    if (stateAge > 10 * 60 * 1000) {
      console.error("[linkedin-hosted-auth-callback] State expired");
      return new Response(
        JSON.stringify({ ok: false, error: "State expired" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { imoId, userId, accountType } = state;

    console.log(
      `[linkedin-hosted-auth-callback] Processing callback for user ${userId}, status: ${status}`,
    );

    // Handle error status
    if (status === "ERROR") {
      console.error(
        "[linkedin-hosted-auth-callback] Unipile reported error connecting account",
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to connect LinkedIn account",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch account details from Unipile
    console.log(
      "[linkedin-hosted-auth-callback] Fetching account details from Unipile",
    );

    const accountResponse = await fetch(
      `https://${UNIPILE_DSN}/api/v1/accounts/${account_id}`,
      {
        method: "GET",
        headers: {
          "X-API-KEY": UNIPILE_API_KEY!,
        },
      },
    );

    let accountDetails: {
      id: string;
      type: string;
      status: string;
      name?: string;
      sources?: Array<{
        id: string;
        identifier?: string;
        display_name?: string;
        picture_url?: string;
        username?: string;
        profile_url?: string;
        headline?: string;
      }>;
    } | null = null;

    if (accountResponse.ok) {
      accountDetails = await accountResponse.json();
      console.log(
        "[linkedin-hosted-auth-callback] Account details:",
        JSON.stringify(accountDetails),
      );
    } else {
      console.warn(
        "[linkedin-hosted-auth-callback] Could not fetch account details:",
        await accountResponse.text(),
      );
    }

    // Extract LinkedIn profile info from sources
    const linkedinSource = accountDetails?.sources?.find(
      (s) => s.id?.includes("linkedin") || s.profile_url?.includes("linkedin"),
    );

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Upsert integration record
    const integrationData = {
      imo_id: imoId,
      user_id: userId,
      unipile_account_id: account_id,
      account_type: accountType || type || "LINKEDIN",
      linkedin_profile_id:
        linkedinSource?.id || callback.provider_account_id || null,
      linkedin_username:
        linkedinSource?.username || linkedinSource?.identifier || null,
      linkedin_display_name:
        linkedinSource?.display_name || callback.provider_account_name || null,
      linkedin_headline: linkedinSource?.headline || null,
      linkedin_profile_url: linkedinSource?.profile_url || null,
      linkedin_profile_picture_url: linkedinSource?.picture_url || null,
      connection_status: status === "CONNECTED" ? "connected" : "credentials",
      is_active: status === "CONNECTED",
      last_connected_at: new Date().toISOString(),
      last_error: null,
      last_error_at: null,
    };

    console.log(
      "[linkedin-hosted-auth-callback] Upserting integration:",
      JSON.stringify(integrationData),
    );

    const { data: integration, error: upsertError } = await supabase
      .from("linkedin_integrations")
      .upsert(integrationData, {
        onConflict: "user_id,imo_id",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (upsertError) {
      console.error(
        "[linkedin-hosted-auth-callback] Error upserting integration:",
        upsertError,
      );
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to save integration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `[linkedin-hosted-auth-callback] Integration saved: ${integration.id}`,
    );

    // Trigger initial conversation sync (fire and forget)
    try {
      const syncUrl = `${SUPABASE_URL}/functions/v1/linkedin-get-conversations`;
      fetch(syncUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          integrationId: integration.id,
          syncToDb: true,
          limit: 50,
        }),
      }).catch((err) => {
        console.warn(
          "[linkedin-hosted-auth-callback] Initial sync trigger failed:",
          err,
        );
      });
    } catch (err) {
      console.warn(
        "[linkedin-hosted-auth-callback] Error triggering initial sync:",
        err,
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        integrationId: integration.id,
        status: integration.connection_status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[linkedin-hosted-auth-callback] Unexpected error:", err);
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
