// supabase/functions/linkedin-get-messages/index.ts
// Fetches and syncs messages for a LinkedIn conversation from Unipile

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface GetMessagesRequest {
  conversationId: string;
  limit?: number;
  cursor?: string;
  syncToDb?: boolean;
}

interface UnipileMessage {
  id: string;
  chat_id: string;
  account_id: string;
  sender_id: string;
  sender?: {
    id: string;
    display_name?: string;
    identifier?: string;
    picture_url?: string;
  };
  text?: string;
  attachments?: Array<{
    id: string;
    type: string;
    url?: string;
    name?: string;
    mime_type?: string;
  }>;
  timestamp: string;
  is_sender_self: boolean;
  is_read?: boolean;
}

interface UnipileMessagesResponse {
  items: UnipileMessage[];
  cursor?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    console.log("[linkedin-get-messages] Function invoked");

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
      console.error("[linkedin-get-messages] Missing credentials");
      return new Response(
        JSON.stringify({ ok: false, error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body: GetMessagesRequest = await req.json();
    const { conversationId, limit = 50, cursor, syncToDb = true } = body;

    if (!conversationId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing conversationId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get conversation and integration details
    const { data: conversation, error: convError } = await supabase
      .from("linkedin_conversations")
      .select(
        `
        id,
        unipile_chat_id,
        integration:linkedin_integrations!inner(
          id,
          unipile_account_id,
          user_id
        )
      `,
      )
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      console.error(
        "[linkedin-get-messages] Conversation not found:",
        convError,
      );
      return new Response(
        JSON.stringify({ ok: false, error: "Conversation not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const _integration = Array.isArray(conversation.integration)
      ? conversation.integration[0]
      : conversation.integration;

    // Build Unipile API URL
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    if (cursor) {
      params.set("cursor", cursor);
    }

    console.log(
      "[linkedin-get-messages] Fetching messages for chat:",
      conversation.unipile_chat_id,
    );

    // Fetch messages from Unipile
    const unipileResponse = await fetch(
      `https://${UNIPILE_DSN}/api/v1/chats/${conversation.unipile_chat_id}/messages?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "X-API-KEY": UNIPILE_API_KEY,
        },
      },
    );

    if (!unipileResponse.ok) {
      const errorText = await unipileResponse.text();
      console.error("[linkedin-get-messages] Unipile API error:", errorText);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to fetch messages",
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const messagesData: UnipileMessagesResponse = await unipileResponse.json();
    console.log(
      `[linkedin-get-messages] Fetched ${messagesData.items?.length || 0} messages`,
    );

    // Transform and optionally sync to database
    const messages = [];

    for (const msg of messagesData.items || []) {
      // Determine message type
      let messageType: "text" | "media" | "inmail" | "invitation_message" =
        "text";
      if (msg.attachments && msg.attachments.length > 0) {
        messageType = "media";
      }

      const messageData = {
        conversation_id: conversationId,
        unipile_message_id: msg.id,
        message_text: msg.text || null,
        message_type: messageType,
        media_url: msg.attachments?.[0]?.url || null,
        media_type:
          msg.attachments?.[0]?.type || msg.attachments?.[0]?.mime_type || null,
        direction: msg.is_sender_self ? "outbound" : "inbound",
        status: msg.is_read ? "read" : "delivered",
        sender_linkedin_id: msg.sender?.id || msg.sender_id,
        sender_name: msg.sender?.display_name || null,
        sent_at: msg.timestamp,
      };

      messages.push(messageData);

      if (syncToDb) {
        const { error: upsertError } = await supabase
          .from("linkedin_messages")
          .upsert(messageData, {
            onConflict: "unipile_message_id",
            ignoreDuplicates: true,
          });

        if (upsertError) {
          console.error(
            "[linkedin-get-messages] Error upserting message:",
            upsertError,
          );
        }
      }
    }

    // Mark conversation as read (clear unread count) if we fetched messages
    if (syncToDb && messages.length > 0) {
      await supabase
        .from("linkedin_conversations")
        .update({ unread_count: 0 })
        .eq("id", conversationId);
    }

    console.log(`[linkedin-get-messages] Synced ${messages.length} messages`);

    return new Response(
      JSON.stringify({
        ok: true,
        messages,
        cursor: messagesData.cursor,
        count: messages.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[linkedin-get-messages] Unexpected error:", err);
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
