// supabase/functions/gmail-refresh-token/index.ts
// Proactively refresh Gmail OAuth tokens that are about to expire
// Called by cron every 30 minutes

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { decrypt, encrypt } from "../_shared/encryption.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface GmailIntegration {
  id: string;
  user_id: string;
  gmail_address: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  connection_status: string;
}

// Refresh tokens that expire within this window (10 minutes)
const REFRESH_WINDOW_MS = 10 * 60 * 1000;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    console.log("[gmail-refresh-token] Function invoked");

    // Get environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[gmail-refresh-token] Missing Supabase credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error("[gmail-refresh-token] Missing Google OAuth credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Gmail OAuth not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate the expiry threshold
    const expiryThreshold = new Date(Date.now() + REFRESH_WINDOW_MS);

    // Find all integrations with tokens expiring soon
    const { data: expiringIntegrations, error: queryError } = await supabase
      .from("gmail_integrations")
      .select("*")
      .eq("is_active", true)
      .eq("connection_status", "connected")
      .lt("token_expires_at", expiryThreshold.toISOString());

    if (queryError) {
      console.error(
        "[gmail-refresh-token] Error querying integrations:",
        queryError,
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to query integrations",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const integrations = (expiringIntegrations || []) as GmailIntegration[];

    if (integrations.length === 0) {
      console.log("[gmail-refresh-token] No tokens need refreshing");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No tokens need refreshing",
          refreshed: 0,
          failed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `[gmail-refresh-token] Found ${integrations.length} tokens to refresh`,
    );

    // Process each integration
    const results: Array<{
      integrationId: string;
      gmail: string;
      status: "refreshed" | "failed";
      error?: string;
    }> = [];

    for (const integration of integrations) {
      const result = await refreshToken(
        supabase,
        integration,
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
      );

      results.push({
        integrationId: integration.id,
        gmail: integration.gmail_address,
        status: result.success ? "refreshed" : "failed",
        error: result.error,
      });
    }

    const refreshed = results.filter((r) => r.status === "refreshed").length;
    const failed = results.filter((r) => r.status === "failed").length;

    console.log(
      `[gmail-refresh-token] Complete: ${refreshed} refreshed, ${failed} failed`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        refreshed,
        failed,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[gmail-refresh-token] Unexpected error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

// =========================================================================
// Refresh a single token
// =========================================================================
async function refreshToken(
  supabase: ReturnType<typeof createClient>,
  integration: GmailIntegration,
  clientId: string,
  clientSecret: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(
      `[gmail-refresh-token] Refreshing token for ${integration.gmail_address}`,
    );

    // Decrypt refresh token
    const refreshToken = await decrypt(integration.refresh_token_encrypted);

    // Exchange refresh token for new access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      const errorMsg =
        tokenData.error_description || tokenData.error || "Unknown error";
      console.error(
        `[gmail-refresh-token] Refresh failed for ${integration.gmail_address}:`,
        errorMsg,
      );

      // Check if this is a revoked/invalid token
      if (tokenData.error === "invalid_grant") {
        // User revoked access or token is permanently invalid
        await supabase
          .from("gmail_integrations")
          .update({
            connection_status: "expired",
            last_error:
              "Gmail access was revoked. Please reconnect your account.",
            last_error_at: new Date().toISOString(),
          })
          .eq("id", integration.id);

        return { success: false, error: "Access revoked" };
      }

      // Temporary error - mark for retry
      await supabase
        .from("gmail_integrations")
        .update({
          last_error: `Token refresh failed: ${errorMsg}`,
          last_error_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      return { success: false, error: errorMsg };
    }

    // Encrypt new access token
    const encryptedAccessToken = await encrypt(tokenData.access_token);

    // Calculate new expiry
    const expiresIn = tokenData.expires_in || 3600; // Default 1 hour
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Update in database
    const { error: updateError } = await supabase
      .from("gmail_integrations")
      .update({
        access_token_encrypted: encryptedAccessToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        last_refresh_at: new Date().toISOString(),
        last_error: null,
        last_error_at: null,
      })
      .eq("id", integration.id);

    if (updateError) {
      console.error(
        `[gmail-refresh-token] Failed to update token for ${integration.gmail_address}:`,
        updateError,
      );
      return { success: false, error: "Database update failed" };
    }

    console.log(
      `[gmail-refresh-token] Successfully refreshed token for ${integration.gmail_address}, expires in ${expiresIn}s`,
    );
    return { success: true };
  } catch (err) {
    console.error(
      `[gmail-refresh-token] Error refreshing ${integration.gmail_address}:`,
      err,
    );

    // Update last error
    await supabase
      .from("gmail_integrations")
      .update({
        last_error: err instanceof Error ? err.message : "Unknown error",
        last_error_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
