// supabase/functions/slack-add-reaction/index.ts
// Adds a reaction (emoji) to a Slack message

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { decrypt } from "../_shared/encryption.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface AddReactionPayload {
  imoId?: string; // Legacy support
  integrationId?: string; // New multi-workspace support
  channelId: string;
  messageTs: string;
  emojiName: string; // e.g., "thumbsup", "heart", "rocket"
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    console.log("[slack-add-reaction] Function invoked");

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

    const body: AddReactionPayload = await req.json();
    const { imoId, integrationId, channelId, messageTs, emojiName } = body;

    if ((!imoId && !integrationId) || !channelId || !messageTs || !emojiName) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Missing required fields: integrationId/imoId, channelId, messageTs, emojiName",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get Slack integration (prioritize integrationId for multi-workspace support)
    let query = supabase
      .from("slack_integrations")
      .select("*")
      .eq("is_active", true)
      .eq("connection_status", "connected");

    if (integrationId) {
      query = query.eq("id", integrationId);
    } else {
      query = query.eq("imo_id", imoId);
    }

    const { data: integration, error: integrationError } =
      await query.maybeSingle();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "No active Slack integration",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Decrypt bot token
    const botToken = await decrypt(integration.bot_token_encrypted);

    // Add reaction via Slack API
    const response = await fetch("https://slack.com/api/reactions.add", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        timestamp: messageTs,
        name: emojiName,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      // Handle common error - already_reacted
      if (data.error === "already_reacted") {
        return new Response(
          JSON.stringify({ ok: true, alreadyReacted: true }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.error("[slack-add-reaction] Slack API error:", data.error);
      return new Response(JSON.stringify({ ok: false, error: data.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(
      `[slack-add-reaction] Added :${emojiName}: to message ${messageTs}`,
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[slack-add-reaction] Unexpected error:", err);
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
