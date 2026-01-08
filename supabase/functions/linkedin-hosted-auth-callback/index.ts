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
    const state = await parseSignedState<StatePayload>(signedState);

    if (!state) {
      console.error(
        "[linkedin-hosted-auth-callback] Invalid or missing state signature",
      );
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid state signature" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify timestamp (60 minute expiry for callback - OAuth flow may take time)
    const stateAge = Date.now() - state.timestamp;
    if (stateAge > 60 * 60 * 1000) {
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Idempotency check: see if this account was already processed
    const { data: existingIntegration } = await supabase
      .from("linkedin_integrations")
      .select("id, connection_status, unipile_account_id")
      .eq("unipile_account_id", account_id)
      .maybeSingle();

    if (
      existingIntegration &&
      existingIntegration.connection_status === "connected"
    ) {
      console.log(
        `[linkedin-hosted-auth-callback] Integration already exists and connected: ${existingIntegration.id}, skipping duplicate`,
      );
      return new Response(
        JSON.stringify({
          ok: true,
          integrationId: existingIntegration.id,
          status: existingIntegration.connection_status,
          message: "Already processed",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

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
      // Treat both CONNECTED and CREDENTIALS as connected (CREDENTIALS means auth succeeded, sync in progress)
      connection_status:
        status === "CONNECTED" || status === "CREDENTIALS"
          ? "connected"
          : "error",
      is_active: status === "CONNECTED" || status === "CREDENTIALS",
      last_connected_at: new Date().toISOString(),
      last_error: null,
      last_error_at: null,
    };

    console.log(
      "[linkedin-hosted-auth-callback] Saving integration:",
      JSON.stringify(integrationData),
    );

    // Check if integration already exists for this user/IMO
    const { data: existingByUserImo } = await supabase
      .from("linkedin_integrations")
      .select("id")
      .eq("user_id", userId)
      .eq("imo_id", imoId)
      .maybeSingle();

    let integration;
    let saveError;

    if (existingByUserImo) {
      // Update existing integration
      console.log(
        `[linkedin-hosted-auth-callback] Updating existing integration: ${existingByUserImo.id}`,
      );
      const { data, error } = await supabase
        .from("linkedin_integrations")
        .update({
          ...integrationData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingByUserImo.id)
        .select()
        .single();
      integration = data;
      saveError = error;
    } else {
      // Insert new integration
      console.log("[linkedin-hosted-auth-callback] Inserting new integration");
      const { data, error } = await supabase
        .from("linkedin_integrations")
        .insert(integrationData)
        .select()
        .single();
      integration = data;
      saveError = error;
    }

    if (saveError) {
      console.error(
        "[linkedin-hosted-auth-callback] Error saving integration:",
        JSON.stringify(saveError),
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to save integration",
          details: saveError.message,
          code: saveError.code,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!integration) {
      console.error(
        "[linkedin-hosted-auth-callback] No integration returned after save",
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to save integration - no data returned",
        }),
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
