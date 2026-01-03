// supabase/functions/instagram-refresh-token/index.ts
// CRON function to refresh Instagram access tokens before they expire
// Runs daily, refreshes tokens expiring within 7 days
// Meta long-lived tokens last ~60 days and can be refreshed before expiry

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { encrypt, decrypt } from "../_shared/encryption.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface InstagramIntegration {
  id: string;
  imo_id: string;
  instagram_user_id: string;
  instagram_username: string;
  access_token_encrypted: string;
  token_expires_at: string | null;
}

interface RefreshResult {
  integrationId: string;
  username: string;
  success: boolean;
  error?: string;
  newExpiresAt?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    console.log("[instagram-refresh-token] CRON function invoked");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const INSTAGRAM_APP_ID = Deno.env.get("INSTAGRAM_APP_ID");
    const INSTAGRAM_APP_SECRET = Deno.env.get("INSTAGRAM_APP_SECRET");

    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !INSTAGRAM_APP_ID ||
      !INSTAGRAM_APP_SECRET
    ) {
      console.error("[instagram-refresh-token] Missing required env vars");
      return new Response(
        JSON.stringify({ ok: false, error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find integrations with tokens expiring within 7 days
    const sevenDaysFromNow = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: integrations, error: fetchError } = await supabase
      .from("instagram_integrations")
      .select(
        "id, imo_id, instagram_user_id, instagram_username, access_token_encrypted, token_expires_at",
      )
      .eq("is_active", true)
      .eq("connection_status", "connected")
      .not("token_expires_at", "is", null)
      .lt("token_expires_at", sevenDaysFromNow)
      .order("token_expires_at", { ascending: true });

    if (fetchError) {
      console.error(
        "[instagram-refresh-token] Error fetching integrations:",
        fetchError,
      );
      return new Response(
        JSON.stringify({ ok: false, error: "Database error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!integrations || integrations.length === 0) {
      console.log(
        "[instagram-refresh-token] No tokens need refreshing at this time",
      );
      return new Response(
        JSON.stringify({
          ok: true,
          message: "No tokens need refreshing",
          refreshed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `[instagram-refresh-token] Found ${integrations.length} tokens to refresh`,
    );

    const results: RefreshResult[] = [];

    // Process each integration
    for (const integration of integrations as InstagramIntegration[]) {
      const result = await refreshToken(
        integration,
        INSTAGRAM_APP_ID,
        INSTAGRAM_APP_SECRET,
        supabase,
      );
      results.push(result);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(
      `[instagram-refresh-token] Completed: ${successCount} success, ${failCount} failed`,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        refreshed: successCount,
        failed: failCount,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[instagram-refresh-token] Unexpected error:", err);
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

/**
 * Refresh a single integration's access token
 */
async function refreshToken(
  integration: InstagramIntegration,
  appId: string,
  appSecret: string,
  supabase: ReturnType<typeof createClient>,
): Promise<RefreshResult> {
  const { id, instagram_username, access_token_encrypted } = integration;

  try {
    // Decrypt current token
    const currentToken = await decrypt(access_token_encrypted);

    // Call Meta's token refresh endpoint
    // For long-lived Page Access Tokens, we use the same endpoint as initial exchange
    const refreshUrl = new URL(
      "https://graph.facebook.com/v18.0/oauth/access_token",
    );
    refreshUrl.searchParams.set("grant_type", "fb_exchange_token");
    refreshUrl.searchParams.set("client_id", appId);
    refreshUrl.searchParams.set("client_secret", appSecret);
    refreshUrl.searchParams.set("fb_exchange_token", currentToken);

    const response = await fetch(refreshUrl.toString());
    const data = await response.json();

    if (data.error || !data.access_token) {
      const errorMsg = data.error?.message || "Token refresh failed";
      console.error(
        `[instagram-refresh-token] Failed for @${instagram_username}:`,
        errorMsg,
      );

      // Update integration with error status
      await supabase
        .from("instagram_integrations")
        .update({
          connection_status: "expired",
          last_error: errorMsg,
          last_error_at: new Date().toISOString(),
        })
        .eq("id", id);

      return {
        integrationId: id,
        username: instagram_username,
        success: false,
        error: errorMsg,
      };
    }

    // Calculate new expiration time
    const expiresInSeconds = data.expires_in || 5184000; // Default 60 days
    const newExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    // Encrypt new token
    const encryptedNewToken = await encrypt(data.access_token);

    // Update database
    const { error: updateError } = await supabase
      .from("instagram_integrations")
      .update({
        access_token_encrypted: encryptedNewToken,
        token_expires_at: newExpiresAt.toISOString(),
        last_refresh_at: new Date().toISOString(),
        connection_status: "connected",
        last_error: null,
        last_error_at: null,
      })
      .eq("id", id);

    if (updateError) {
      console.error(
        `[instagram-refresh-token] DB update failed for @${instagram_username}:`,
        updateError,
      );
      return {
        integrationId: id,
        username: instagram_username,
        success: false,
        error: "Database update failed",
      };
    }

    console.log(
      `[instagram-refresh-token] Refreshed token for @${instagram_username}, new expiry: ${newExpiresAt.toISOString()}`,
    );

    return {
      integrationId: id,
      username: instagram_username,
      success: true,
      newExpiresAt: newExpiresAt.toISOString(),
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[instagram-refresh-token] Exception for @${instagram_username}:`,
      errorMsg,
    );

    return {
      integrationId: id,
      username: instagram_username,
      success: false,
      error: errorMsg,
    };
  }
}
