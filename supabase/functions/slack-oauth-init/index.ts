// supabase/functions/slack-oauth-init/index.ts
// Generates a signed OAuth URL for Slack authentication

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSignedState } from "../_shared/hmac.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface OAuthInitRequest {
  imoId: string;
  userId: string;
  returnUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    console.log("[slack-oauth-init] Function invoked");

    const SLACK_CLIENT_ID = Deno.env.get("SLACK_CLIENT_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    if (!SLACK_CLIENT_ID) {
      return new Response(
        JSON.stringify({ ok: false, error: "SLACK_CLIENT_ID not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!SUPABASE_URL) {
      return new Response(
        JSON.stringify({ ok: false, error: "SUPABASE_URL not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body: OAuthInitRequest = await req.json();
    const { imoId, userId, returnUrl } = body;

    if (!imoId || !userId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing imoId or userId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create signed state
    const state = {
      imoId,
      userId,
      timestamp: Date.now(),
      returnUrl,
    };

    const signedState = await createSignedState(state);

    // Build OAuth URL
    const redirectUri = `${SUPABASE_URL}/functions/v1/slack-oauth-callback`;
    const scope = "chat:write,channels:read,channels:join,users:read";

    const authUrl = new URL("https://slack.com/oauth/v2/authorize");
    authUrl.searchParams.set("client_id", SLACK_CLIENT_ID);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", signedState);

    console.log(`[slack-oauth-init] Generated OAuth URL for IMO ${imoId}`);

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
