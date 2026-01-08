// supabase/functions/linkedin-hosted-auth-init/index.ts
// Generates a Unipile Hosted Auth URL for LinkedIn account connection

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { createSignedState } from "../_shared/hmac.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface HostedAuthInitRequest {
  imoId: string;
  userId: string;
  returnUrl?: string;
  accountType?: "LINKEDIN" | "LINKEDIN_RECRUITER" | "LINKEDIN_SALES_NAV";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    console.log("[linkedin-hosted-auth-init] Function invoked");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const UNIPILE_API_KEY = Deno.env.get("UNIPILE_API_KEY");
    const UNIPILE_DSN = Deno.env.get("UNIPILE_DSN");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[linkedin-hosted-auth-init] Missing Supabase credentials");
      return new Response(
        JSON.stringify({ ok: false, error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!UNIPILE_API_KEY || !UNIPILE_DSN) {
      console.error(
        "[linkedin-hosted-auth-init] Unipile credentials not configured",
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: "LinkedIn integration not configured. Contact administrator.",
          needsCredentials: true,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body: HostedAuthInitRequest = await req.json();
    const { imoId, userId, returnUrl, accountType = "LINKEDIN" } = body;

    if (!imoId || !userId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing imoId or userId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if user has LinkedIn access (IMO must have Unipile configured)
    const { data: hasAccess, error: accessError } = await supabase.rpc(
      "user_has_linkedin_access",
      { p_user_id: userId },
    );

    if (accessError) {
      console.error(
        "[linkedin-hosted-auth-init] Error checking access:",
        accessError,
      );
    }

    if (!hasAccess) {
      console.warn(
        `[linkedin-hosted-auth-init] User ${userId} does not have LinkedIn access`,
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: "LinkedIn integration not enabled for your organization",
          setupRequired: true,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check if IMO can add more accounts
    const { data: canAdd, error: canAddError } = await supabase.rpc(
      "can_add_linkedin_account",
      { p_imo_id: imoId },
    );

    if (canAddError) {
      console.error(
        "[linkedin-hosted-auth-init] Error checking account limit:",
        canAddError,
      );
    }

    if (!canAdd) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "LinkedIn account limit reached for your organization",
          limitReached: true,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `[linkedin-hosted-auth-init] User ${userId} has access, generating hosted auth URL`,
    );

    // Create signed state for callback verification
    const state = {
      imoId,
      userId,
      timestamp: Date.now(),
      returnUrl,
      accountType,
    };

    const signedState = await createSignedState(state);

    // Build Unipile Hosted Auth request
    const APP_URL = Deno.env.get("APP_URL") || "https://www.thestandardhq.com";
    const notifyUrl = `${SUPABASE_URL}/functions/v1/linkedin-hosted-auth-callback`;

    const unipileRequest = {
      type: "create",
      providers: [accountType],
      api_url: `https://${UNIPILE_DSN}`,
      expiresOn: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
      notify_url: notifyUrl,
      name: signedState, // Store signed state in name field for callback verification
      success_redirect_url:
        returnUrl || `${APP_URL}/messages?linkedin=connected`,
      failure_redirect_url: returnUrl || `${APP_URL}/messages?linkedin=failed`,
    };

    console.log("[linkedin-hosted-auth-init] Calling Unipile hosted auth API");

    // Call Unipile API to generate hosted auth link
    const unipileResponse = await fetch(
      `https://${UNIPILE_DSN}/api/v1/hosted/accounts/link`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": UNIPILE_API_KEY,
        },
        body: JSON.stringify(unipileRequest),
      },
    );

    if (!unipileResponse.ok) {
      const errorText = await unipileResponse.text();
      console.error(
        "[linkedin-hosted-auth-init] Unipile API error:",
        errorText,
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to generate LinkedIn connection URL",
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const unipileData = await unipileResponse.json();

    console.log(
      `[linkedin-hosted-auth-init] Generated hosted auth URL for user ${userId}`,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        url: unipileData.url,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[linkedin-hosted-auth-init] Unexpected error:", err);
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
