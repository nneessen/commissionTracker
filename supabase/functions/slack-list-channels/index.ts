// supabase/functions/slack-list-channels/index.ts
// Lists Slack channels the bot can access

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { decrypt } from "../_shared/encryption.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  is_archived: boolean;
  num_members?: number;
  purpose?: {
    value: string;
  };
  topic?: {
    value: string;
  };
}

interface SlackChannelsResponse {
  ok: boolean;
  channels?: SlackChannel[];
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    console.log("[slack-list-channels] Function invoked");

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
    const { imoId, integrationId } = body;

    if (!imoId && !integrationId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing imoId or integrationId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get Slack integration - prefer integrationId for multi-workspace support
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    const { data: integration, error: fetchError } = await query.maybeSingle();

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

    // Fetch channels from Slack API
    const allChannels: SlackChannel[] = [];
    let cursor: string | undefined;

    do {
      const params = new URLSearchParams({
        types: "public_channel,private_channel",
        exclude_archived: "true",
        limit: "200",
      });

      if (cursor) {
        params.set("cursor", cursor);
      }

      const response = await fetch(
        `https://slack.com/api/conversations.list?${params}`,
        {
          headers: {
            Authorization: `Bearer ${botToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data: SlackChannelsResponse = await response.json();

      if (!data.ok) {
        console.error("[slack-list-channels] Slack API error:", data.error);

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

        // Map common Slack errors to user-friendly messages
        let userMessage = data.error || "Failed to list channels";
        if (data.error === "missing_scope") {
          userMessage =
            "The Slack app is missing required permissions. Please reinstall the app with 'channels:read' and 'groups:read' scopes.";
        } else if (
          data.error === "token_revoked" ||
          data.error === "invalid_auth"
        ) {
          userMessage =
            "Slack connection expired. Please reconnect in Settings.";
        } else if (data.error === "not_authed") {
          userMessage =
            "Slack authentication failed. Please reconnect in Settings.";
        }

        // Return 200 with ok:false so client can handle gracefully
        return new Response(
          JSON.stringify({
            ok: false,
            error: userMessage,
            slackError: data.error,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (data.channels) {
        allChannels.push(...data.channels);
      }

      cursor = data.response_metadata?.next_cursor;
    } while (cursor);

    console.log(
      `[slack-list-channels] Found ${allChannels.length} channels for integration ${integrationId || imoId}`,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        channels: allChannels.map((ch) => ({
          id: ch.id,
          name: ch.name,
          is_private: ch.is_private,
          is_member: ch.is_member,
          is_archived: ch.is_archived,
          num_members: ch.num_members,
          purpose: ch.purpose?.value,
          topic: ch.topic?.value,
        })),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[slack-list-channels] Unexpected error:", err);
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
