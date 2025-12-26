// supabase/functions/slack-oauth-init/index.ts
// Generates a signed OAuth URL for Slack authentication
// Supports per-agency Slack app credentials for multi-workspace OAuth

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { createSignedState } from "../_shared/hmac.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface OAuthInitRequest {
  imoId: string;
  userId: string;
  agencyId?: string; // Optional: connect workspace for specific agency
  returnUrl?: string;
}

interface SlackCredentials {
  credential_id: string;
  client_id: string;
  client_secret_encrypted: string;
  signing_secret_encrypted: string | null;
  app_name: string | null;
  source_agency_id: string | null;
  is_fallback: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    console.log("[slack-oauth-init] Function invoked");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body: OAuthInitRequest = await req.json();
    const { imoId, userId, agencyId, returnUrl } = body;

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

    // =========================================================================
    // Look up Slack credentials for this agency (or fall back to IMO-level/env)
    // =========================================================================
    let clientId: string | null = null;

    // Try database credentials first
    const { data: credentials, error: credError } = await supabase.rpc(
      "get_agency_slack_credentials",
      {
        p_imo_id: imoId,
        p_agency_id: agencyId || null,
      },
    );

    if (credError) {
      console.error(
        "[slack-oauth-init] Error looking up credentials:",
        credError,
      );
    }

    const creds = (credentials as SlackCredentials[] | null)?.[0];

    if (creds?.client_id) {
      clientId = creds.client_id;
      console.log(
        `[slack-oauth-init] Using database credentials${creds.is_fallback ? " (fallback)" : ""} from agency ${creds.source_agency_id || "IMO-level"}`,
      );
    } else {
      // Fall back to environment variable (legacy support)
      clientId = Deno.env.get("SLACK_CLIENT_ID") || null;
      if (clientId) {
        console.log("[slack-oauth-init] Using env SLACK_CLIENT_ID (legacy)");
      }
    }

    if (!clientId) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "No Slack app credentials configured for this agency",
          needsCredentials: true,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create signed state (includes agencyId for agency-level workspace connection)
    const state = {
      imoId,
      userId,
      agencyId: agencyId || null, // null = IMO-level integration
      timestamp: Date.now(),
      returnUrl,
    };

    const signedState = await createSignedState(state);

    // Build OAuth URL
    const redirectUri = `${SUPABASE_URL}/functions/v1/slack-oauth-callback`;
    const scope =
      "chat:write,channels:read,channels:join,users:read,users:read.email";

    const authUrl = new URL("https://slack.com/oauth/v2/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", signedState);

    console.log(
      `[slack-oauth-init] Generated OAuth URL for IMO ${imoId}${agencyId ? `, Agency ${agencyId}` : " (IMO-level)"}`,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        url: authUrl.toString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[slack-oauth-init] Unexpected error:", err);
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
