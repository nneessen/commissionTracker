// supabase/functions/gmail-oauth-callback/index.ts
// Handles Google OAuth callback for Gmail API connection
// 1. Exchanges code for access token and refresh token
// 2. Gets user profile (email address)
// 3. Stores encrypted tokens in gmail_integrations table

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { encrypt } from "../_shared/encryption.ts";
import { parseSignedState } from "../_shared/hmac.ts";
import { corsResponse } from "../_shared/cors.ts";

interface OAuthState {
  userId: string;
  timestamp: number;
  returnUrl?: string | null;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  verified_email?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  // APP_URL must be set for redirects
  const APP_URL = Deno.env.get("APP_URL");
  if (!APP_URL) {
    console.error(
      "[gmail-oauth-callback] APP_URL environment variable not set",
    );
    return new Response(
      JSON.stringify({ error: "Server configuration error: APP_URL not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    console.log("[gmail-oauth-callback] Function invoked");

    // Get environment variables
    // Use custom domain if set, otherwise fall back to default Supabase URL
    const SUPABASE_URL = Deno.env.get("CUSTOM_DOMAIN_URL") || Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[gmail-oauth-callback] Missing Supabase credentials");
      return Response.redirect(
        `${APP_URL}/settings/integrations?gmail=error&reason=config`,
      );
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error("[gmail-oauth-callback] Missing Google OAuth credentials");
      return Response.redirect(
        `${APP_URL}/settings/integrations?gmail=error&reason=config`,
      );
    }

    // Parse URL parameters
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    // Handle OAuth errors from Google
    if (error) {
      console.error("[gmail-oauth-callback] Google OAuth error:", {
        error,
        errorDescription,
      });
      return Response.redirect(
        `${APP_URL}/settings/integrations?gmail=error&reason=${encodeURIComponent(error)}`,
      );
    }

    if (!code || !stateParam) {
      console.error("[gmail-oauth-callback] Missing code or state");
      return Response.redirect(
        `${APP_URL}/settings/integrations?gmail=error&reason=missing_params`,
      );
    }

    // Parse and verify signed state (HMAC protected)
    const state = await parseSignedState<OAuthState>(stateParam);

    if (!state) {
      console.error(
        "[gmail-oauth-callback] Invalid or tampered state parameter",
      );
      return Response.redirect(
        `${APP_URL}/settings/integrations?gmail=error&reason=invalid_state`,
      );
    }

    // Check state timestamp (expire after 10 minutes)
    if (Date.now() - state.timestamp > 10 * 60 * 1000) {
      console.error("[gmail-oauth-callback] State expired");
      return Response.redirect(
        `${APP_URL}/settings/integrations?gmail=error&reason=expired`,
      );
    }

    const { userId, returnUrl } = state;
    // Ensure redirect URL is absolute
    let redirectUrl = returnUrl || `${APP_URL}/settings/integrations`;
    if (redirectUrl.startsWith("/")) {
      redirectUrl = `${APP_URL}${redirectUrl}`;
    }

    console.log(`[gmail-oauth-callback] Processing OAuth for user: ${userId}`);

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // =========================================================================
    // Step 1: Exchange code for access token and refresh token
    // =========================================================================
    const tokenUrl = "https://oauth2.googleapis.com/token";
    const tokenRedirectUri = `${SUPABASE_URL}/functions/v1/gmail-oauth-callback`;

    console.log("[gmail-oauth-callback] Exchanging code for tokens...");

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: tokenRedirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData: GoogleTokenResponse = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error(
        "[gmail-oauth-callback] Token exchange failed:",
        tokenData.error_description || tokenData.error,
      );
      return Response.redirect(
        `${redirectUrl}?gmail=error&reason=token_exchange`,
      );
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600; // Default 1 hour
    const scopes = tokenData.scope.split(" ");

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    console.log(
      `[gmail-oauth-callback] Tokens obtained, expires in ${expiresIn}s`,
    );

    // CRITICAL: We need a refresh token for long-term access
    if (!refreshToken) {
      console.error(
        "[gmail-oauth-callback] No refresh token received - user may have previously authorized without revoke",
      );
      // This can happen if the user has already authorized but didn't revoke access
      // The refresh token is only sent on the first authorization or after revocation
      return Response.redirect(
        `${redirectUrl}?gmail=error&reason=no_refresh_token`,
      );
    }

    // =========================================================================
    // Step 2: Get user profile (email address)
    // =========================================================================
    console.log("[gmail-oauth-callback] Fetching user profile...");

    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    const userInfo: GoogleUserInfo = await userInfoResponse.json();

    if (!userInfo.email) {
      console.error(
        "[gmail-oauth-callback] Failed to get user email:",
        userInfo,
      );
      return Response.redirect(
        `${redirectUrl}?gmail=error&reason=profile_fetch`,
      );
    }

    console.log(
      `[gmail-oauth-callback] User profile: ${userInfo.email} (${userInfo.name || "No name"})`,
    );

    // =========================================================================
    // Step 3: Encrypt tokens and store in database
    // =========================================================================
    const encryptedAccessToken = await encrypt(accessToken);
    const encryptedRefreshToken = await encrypt(refreshToken);

    // Check if integration already exists for this user or email
    const { data: existingByUser } = await supabase
      .from("gmail_integrations")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: existingByEmail } = await supabase
      .from("gmail_integrations")
      .select("id, user_id")
      .eq("gmail_address", userInfo.email)
      .maybeSingle();

    // If this Gmail is connected to a different user, reject
    if (existingByEmail && existingByEmail.user_id !== userId) {
      console.error(
        `[gmail-oauth-callback] Gmail ${userInfo.email} already connected to another user`,
      );
      return Response.redirect(
        `${redirectUrl}?gmail=error&reason=email_in_use`,
      );
    }

    const integrationData = {
      user_id: userId,
      gmail_address: userInfo.email,
      gmail_user_id: userInfo.id,
      gmail_name: userInfo.name || null,
      gmail_picture_url: userInfo.picture || null,
      access_token_encrypted: encryptedAccessToken,
      refresh_token_encrypted: encryptedRefreshToken,
      token_expires_at: tokenExpiresAt.toISOString(),
      last_refresh_at: new Date().toISOString(),
      scopes,
      connection_status: "connected",
      is_active: true,
      last_connected_at: new Date().toISOString(),
      last_error: null,
      last_error_at: null,
    };

    let upsertError;
    const existingIntegration = existingByUser || existingByEmail;

    if (existingIntegration) {
      // Update existing integration
      console.log(
        `[gmail-oauth-callback] Updating existing integration: ${existingIntegration.id}`,
      );
      const { error } = await supabase
        .from("gmail_integrations")
        .update(integrationData)
        .eq("id", existingIntegration.id);
      upsertError = error;
    } else {
      // Insert new integration
      console.log("[gmail-oauth-callback] Creating new integration");
      const { error } = await supabase
        .from("gmail_integrations")
        .insert(integrationData);
      upsertError = error;
    }

    if (upsertError) {
      console.error(
        "[gmail-oauth-callback] Failed to save integration:",
        upsertError,
      );
      return Response.redirect(`${redirectUrl}?gmail=error&reason=save_failed`);
    }

    console.log(
      `[gmail-oauth-callback] Integration saved successfully for ${userInfo.email}`,
    );

    // Redirect back to app with success
    return Response.redirect(
      `${redirectUrl}?gmail=success&account=${encodeURIComponent(userInfo.email)}`,
    );
  } catch (err) {
    console.error("[gmail-oauth-callback] Unexpected error:", err);
    const errorMsg =
      err instanceof Error ? encodeURIComponent(err.message) : "unknown";
    return Response.redirect(
      `${APP_URL}/settings/integrations?gmail=error&reason=unexpected&details=${errorMsg}`,
    );
  }
});
