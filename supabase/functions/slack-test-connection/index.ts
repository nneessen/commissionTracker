// supabase/functions/slack-test-connection/index.ts
// Tests Slack connection by calling auth.test API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { decrypt } from "../_shared/encryption.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface SlackAuthTestResponse {
  ok: boolean;
  url?: string;
  team?: string;
  user?: string;
  team_id?: string;
  user_id?: string;
  bot_id?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    console.log("[slack-test-connection] Function invoked");

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

    const body = await req.json();
    const { imoId } = body;

    if (!imoId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing imoId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get Slack integration
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: integration, error: fetchError } = await supabase
      .from("slack_integrations")
      .select("*")
      .eq("imo_id", imoId)
      .maybeSingle();

    if (fetchError || !integration) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "No Slack integration found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Decrypt bot token
    const botToken = await decrypt(integration.bot_token_encrypted);

    // Call Slack auth.test to verify connection
    const response = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
    });

    const data: SlackAuthTestResponse = await response.json();

    // Update integration status based on result
    if (data.ok) {
      await supabase
        .from("slack_integrations")
        .update({
          connection_status: "connected",
          last_error: null,
          last_connected_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      console.log(
        `[slack-test-connection] Connection verified for IMO ${imoId}`,
      );

      return new Response(
        JSON.stringify({
          ok: true,
          team: data.team,
          user: data.user,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } else {
      // Token is invalid or revoked
      await supabase
        .from("slack_integrations")
        .update({
          connection_status: "error",
          last_error: data.error || "auth_test_failed",
        })
        .eq("id", integration.id);

      console.error(`[slack-test-connection] Auth test failed: ${data.error}`);

      return new Response(
        JSON.stringify({
          ok: false,
          error: data.error || "Connection test failed",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (err) {
    console.error("[slack-test-connection] Unexpected error:", err);
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
