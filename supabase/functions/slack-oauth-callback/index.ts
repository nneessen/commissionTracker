// supabase/functions/slack-oauth-callback/index.ts
// Handles Slack OAuth callback, exchanges code for tokens, stores encrypted

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { encrypt } from "../_shared/encryption.ts";
import { parseSignedState } from "../_shared/hmac.ts";
import { corsResponse } from "../_shared/cors.ts";

interface SlackOAuthResponse {
  ok: boolean;
  access_token?: string;
  token_type?: string;
  scope?: string;
  bot_user_id?: string;
  app_id?: string;
  team?: {
    id: string;
    name: string;
  };
  authed_user?: {
    id: string;
    scope?: string;
    access_token?: string;
    token_type?: string;
  };
  error?: string;
}

interface OAuthState {
  imoId: string;
  userId: string;
  timestamp: number;
  returnUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const APP_URL = Deno.env.get("APP_URL") || "https://www.thestandardhq.com";

  try {
    console.log("[slack-oauth-callback] Function invoked");

    // Get environment variables
    const SLACK_CLIENT_ID = Deno.env.get("SLACK_CLIENT_ID");
    const SLACK_CLIENT_SECRET = Deno.env.get("SLACK_CLIENT_SECRET");
    const SLACK_SIGNING_SECRET = Deno.env.get("SLACK_SIGNING_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
      console.error("[slack-oauth-callback] Missing Slack credentials");
      return Response.redirect(
        `${APP_URL}/settings/integrations?slack=error&reason=config`,
      );
    }

    if (!SLACK_SIGNING_SECRET) {
      console.error("[slack-oauth-callback] Missing SLACK_SIGNING_SECRET");
      return Response.redirect(
        `${APP_URL}/settings/integrations?slack=error&reason=config`,
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[slack-oauth-callback] Missing Supabase credentials");
      return Response.redirect(
        `${APP_URL}/settings/integrations?slack=error&reason=config`,
      );
    }

    // Parse URL parameters
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Handle OAuth errors from Slack
    if (error) {
      console.error("[slack-oauth-callback] Slack OAuth error:", error);
      return Response.redirect(
        `${APP_URL}/settings/integrations?slack=error&reason=${error}`,
      );
    }

    if (!code || !stateParam) {
      console.error("[slack-oauth-callback] Missing code or state");
      return Response.redirect(
        `${APP_URL}/settings/integrations?slack=error&reason=missing_params`,
      );
    }

    // Parse and verify signed state (HMAC protected)
    const state = await parseSignedState<OAuthState>(stateParam);

    if (!state) {
      console.error(
        "[slack-oauth-callback] Invalid or tampered state parameter",
      );
      return Response.redirect(
        `${APP_URL}/settings/integrations?slack=error&reason=invalid_state`,
      );
    }

    // Check state timestamp (expire after 10 minutes)
    if (Date.now() - state.timestamp > 10 * 60 * 1000) {
      console.error("[slack-oauth-callback] State expired");
      return Response.redirect(
        `${APP_URL}/settings/integrations?slack=error&reason=expired`,
      );
    }

    const { imoId, userId, returnUrl } = state;
    const redirectUrl = returnUrl || `${APP_URL}/settings/integrations`;

    console.log("[slack-oauth-callback] Processing OAuth for IMO:", imoId);

    // Exchange code for tokens
    const tokenUrl = "https://slack.com/api/oauth.v2.access";
    const redirectUri = `${SUPABASE_URL}/functions/v1/slack-oauth-callback`;

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData: SlackOAuthResponse = await tokenResponse.json();

    if (!tokenData.ok || !tokenData.access_token) {
      console.error(
        "[slack-oauth-callback] Token exchange failed:",
        tokenData.error,
      );
      return Response.redirect(
        `${redirectUrl}?slack=error&reason=${tokenData.error || "token_exchange"}`,
      );
    }

    console.log("[slack-oauth-callback] Token exchange successful:", {
      teamId: tokenData.team?.id,
      teamName: tokenData.team?.name,
      botUserId: tokenData.bot_user_id,
    });

    // Encrypt tokens
    const encryptedAccessToken = await encrypt(tokenData.access_token);
    const encryptedBotToken = await encrypt(tokenData.access_token); // Bot token is same as access_token in v2
    const encryptedUserToken = tokenData.authed_user?.access_token
      ? await encrypt(tokenData.authed_user.access_token)
      : null;

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Upsert the integration
    const { error: upsertError } = await supabase
      .from("slack_integrations")
      .upsert(
        {
          imo_id: imoId,
          access_token_encrypted: encryptedAccessToken,
          bot_token_encrypted: encryptedBotToken,
          refresh_token_encrypted: encryptedUserToken,
          team_id: tokenData.team?.id || "",
          team_name: tokenData.team?.name || "Unknown Workspace",
          bot_user_id: tokenData.bot_user_id || "",
          bot_name: "Commission Tracker",
          scope: tokenData.scope || "",
          token_type: tokenData.token_type || "bot",
          authed_user_id: tokenData.authed_user?.id,
          authed_user_email: null, // Would need separate API call to get email
          is_active: true,
          connection_status: "connected",
          last_error: null,
          last_connected_at: new Date().toISOString(),
          created_by: userId,
        },
        {
          onConflict: "imo_id",
        },
      );

    if (upsertError) {
      console.error(
        "[slack-oauth-callback] Failed to save integration:",
        upsertError,
      );
      return Response.redirect(`${redirectUrl}?slack=error&reason=save_failed`);
    }

    console.log("[slack-oauth-callback] Integration saved successfully");

    // Redirect back to app with success
    return Response.redirect(
      `${redirectUrl}?slack=success&team=${encodeURIComponent(tokenData.team?.name || "")}`,
    );
  } catch (err) {
    console.error("[slack-oauth-callback] Unexpected error:", err);
    const errorMsg =
      err instanceof Error ? encodeURIComponent(err.message) : "unknown";
    return Response.redirect(
      `${APP_URL}/settings/integrations?slack=error&reason=unexpected&details=${errorMsg}`,
    );
  }
});
