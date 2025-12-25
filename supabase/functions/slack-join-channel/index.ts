// supabase/functions/slack-join-channel/index.ts
// Joins the bot to a Slack channel

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { decrypt } from "../_shared/encryption.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface SlackJoinResponse {
  ok: boolean;
  channel?: {
    id: string;
    name: string;
    is_member: boolean;
  };
  error?: string;
  warning?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    console.log("[slack-join-channel] Function invoked");

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
    const { imoId, channelId } = body;

    if (!imoId || !channelId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing imoId or channelId" }),
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
      .eq("is_active", true)
      .eq("connection_status", "connected")
      .maybeSingle();

    if (fetchError || !integration) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "No active Slack integration found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Decrypt bot token
    const botToken = await decrypt(integration.bot_token_encrypted);

    // Join channel using Slack API
    const response = await fetch("https://slack.com/api/conversations.join", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel: channelId }),
    });

    const data: SlackJoinResponse = await response.json();

    if (!data.ok) {
      console.error(
        `[slack-join-channel] Failed to join channel: ${data.error}`,
      );

      // Handle specific error cases
      if (data.error === "channel_not_found") {
        return new Response(
          JSON.stringify({ ok: false, error: "Channel not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (data.error === "is_private") {
        return new Response(
          JSON.stringify({
            ok: false,
            error:
              "Cannot join private channel. Please invite the bot manually.",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Update integration status if token is invalid
      if (data.error === "token_revoked" || data.error === "invalid_auth") {
        await supabase
          .from("slack_integrations")
          .update({
            connection_status: "error",
            last_error: data.error,
          })
          .eq("id", integration.id);
      }

      return new Response(JSON.stringify({ ok: false, error: data.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(
      `[slack-join-channel] Bot joined channel ${data.channel?.name || channelId}`,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        channel: {
          id: data.channel?.id || channelId,
          name: data.channel?.name,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[slack-join-channel] Unexpected error:", err);
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
