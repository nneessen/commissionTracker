// supabase/functions/instagram-oauth-init/index.ts
// Generates a Meta OAuth URL for Instagram Business account authentication
// Required scopes: instagram_basic, instagram_manage_messages, pages_manage_metadata

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
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
    console.log("[instagram-oauth-init] Function invoked");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const INSTAGRAM_APP_ID = Deno.env.get("INSTAGRAM_APP_ID");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[instagram-oauth-init] Missing Supabase credentials");
      return new Response(
        JSON.stringify({ ok: false, error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!INSTAGRAM_APP_ID) {
      console.error("[instagram-oauth-init] INSTAGRAM_APP_ID not configured");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Instagram integration not configured. Contact administrator.",
          needsCredentials: true,
        }),
        {
          status: 400,
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

    // Verify user has Team tier subscription (instagram_messaging feature)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user's subscription with plan features
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select(
        `
        id,
        status,
        plan:subscription_plans(
          id,
          name,
          features
        )
      `,
      )
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error(
        "[instagram-oauth-init] Error checking subscription:",
        subError,
      );
    }

    // Check if instagram_messaging feature is enabled in the plan
    const planFeatures = subscription?.plan?.features as
      | Record<string, boolean>
      | undefined;
    const hasInstagramFeature = planFeatures?.instagram_messaging === true;

    if (!hasInstagramFeature) {
      console.warn(
        `[instagram-oauth-init] User ${userId} does not have instagram_messaging feature. Plan: ${subscription?.plan?.name || "none"}`,
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Instagram DM integration requires Team tier subscription",
          upgradeRequired: true,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `[instagram-oauth-init] User ${userId} has instagram_messaging feature via ${subscription?.plan?.name} plan`,
    );

    // Create signed state (includes userId, imoId, timestamp for callback verification)
    const state = {
      imoId,
      userId,
      timestamp: Date.now(),
      returnUrl,
    };

    const signedState = await createSignedState(state);

    // Build Meta OAuth URL for Instagram Business API
    // Using Facebook OAuth endpoint since Instagram Business API requires FB Pages
    const redirectUri = `${SUPABASE_URL}/functions/v1/instagram-oauth-callback`;

    // Required scopes for Instagram Messaging API:
    // - instagram_basic: Access profile info
    // - instagram_manage_messages: Send/receive DMs
    // - pages_manage_metadata: Required for accessing Instagram connected to FB Page
    // - pages_read_engagement: Read page engagement data
    const scope = [
      "instagram_basic",
      "instagram_manage_messages",
      "pages_manage_metadata",
      "pages_read_engagement",
    ].join(",");

    // Meta uses Facebook's OAuth endpoint for Instagram Business API
    const authUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
    authUrl.searchParams.set("client_id", INSTAGRAM_APP_ID);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("state", signedState);
    authUrl.searchParams.set("response_type", "code");

    console.log(
      `[instagram-oauth-init] Generated OAuth URL for IMO ${imoId}, user ${userId}`,
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
    console.error("[instagram-oauth-init] Unexpected error:", err);
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
