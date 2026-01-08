// supabase/functions/linkedin-get-conversations/index.ts
// Fetches and syncs LinkedIn conversations from Unipile

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface GetConversationsRequest {
  integrationId: string;
  limit?: number;
  cursor?: string;
  syncToDb?: boolean;
}

interface UnipileChat {
  id: string;
  account_id: string;
  type: "ONE_TO_ONE" | "GROUP";
  attendees: Array<{
    id: string;
    provider_id: string;
    display_name?: string;
    identifier?: string;
    picture_url?: string;
    is_self: boolean;
    headline?: string;
    profile_url?: string;
  }>;
  unread_count: number;
  last_message?: {
    id: string;
    text?: string;
    timestamp: string;
    is_sender_self: boolean;
  };
  created_at: string;
  updated_at: string;
}

interface UnipileChatsResponse {
  items: UnipileChat[];
  cursor?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    console.log("[linkedin-get-conversations] Function invoked");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const UNIPILE_API_KEY = Deno.env.get("UNIPILE_API_KEY");
    const UNIPILE_DSN = Deno.env.get("UNIPILE_DSN");

    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !UNIPILE_API_KEY ||
      !UNIPILE_DSN
    ) {
      console.error("[linkedin-get-conversations] Missing credentials");
      return new Response(
        JSON.stringify({ ok: false, error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body: GetConversationsRequest = await req.json();
    const { integrationId, limit = 50, cursor, syncToDb = true } = body;

    if (!integrationId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing integrationId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get integration details
    const { data: integration, error: intError } = await supabase
      .from("linkedin_integrations")
      .select("id, unipile_account_id, user_id")
      .eq("id", integrationId)
      .eq("is_active", true)
      .single();

    if (intError || !integration) {
      console.error(
        "[linkedin-get-conversations] Integration not found:",
        intError,
      );
      return new Response(
        JSON.stringify({ ok: false, error: "Integration not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build Unipile API URL
    const params = new URLSearchParams({
      account_id: integration.unipile_account_id,
      limit: limit.toString(),
    });
    if (cursor) {
      params.set("cursor", cursor);
    }

    console.log(
      "[linkedin-get-conversations] Fetching from Unipile for account:",
      integration.unipile_account_id,
    );

    // Fetch conversations from Unipile
    const unipileResponse = await fetch(
      `https://${UNIPILE_DSN}/api/v1/chats?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "X-API-KEY": UNIPILE_API_KEY,
        },
      },
    );

    if (!unipileResponse.ok) {
      const errorText = await unipileResponse.text();
      console.error(
        "[linkedin-get-conversations] Unipile API error:",
        errorText,
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to fetch conversations",
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const chatsData: UnipileChatsResponse = await unipileResponse.json();
    console.log(
      `[linkedin-get-conversations] Fetched ${chatsData.items?.length || 0} conversations`,
    );

    // Transform and optionally sync to database
    const conversations = [];

    for (const chat of chatsData.items || []) {
      // Find the other participant (not self)
      const otherParticipant = chat.attendees?.find((a) => !a.is_self);

      if (!otherParticipant) {
        console.warn(
          "[linkedin-get-conversations] No other participant found for chat:",
          chat.id,
        );
        continue;
      }

      const conversationData = {
        integration_id: integrationId,
        unipile_chat_id: chat.id,
        participant_linkedin_id:
          otherParticipant.provider_id || otherParticipant.id,
        participant_username: otherParticipant.identifier || null,
        participant_name: otherParticipant.display_name || null,
        participant_headline: otherParticipant.headline || null,
        participant_profile_picture_url: otherParticipant.picture_url || null,
        participant_profile_url: otherParticipant.profile_url || null,
        last_message_at: chat.last_message?.timestamp || chat.updated_at,
        last_message_preview:
          chat.last_message?.text?.substring(0, 100) || null,
        last_message_direction: chat.last_message?.is_sender_self
          ? "outbound"
          : "inbound",
        unread_count: chat.unread_count || 0,
      };

      conversations.push(conversationData);

      if (syncToDb) {
        const { error: upsertError } = await supabase
          .from("linkedin_conversations")
          .upsert(conversationData, {
            onConflict: "integration_id,unipile_chat_id",
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error(
            "[linkedin-get-conversations] Error upserting conversation:",
            upsertError,
          );
        }
      }
    }

    // Update last sync timestamp
    await supabase
      .from("linkedin_integrations")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", integrationId);

    console.log(
      `[linkedin-get-conversations] Synced ${conversations.length} conversations`,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        conversations,
        cursor: chatsData.cursor,
        count: conversations.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[linkedin-get-conversations] Unexpected error:", err);
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
