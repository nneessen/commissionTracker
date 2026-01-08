// supabase/functions/linkedin-webhook/index.ts
// Handles Unipile webhooks for real-time LinkedIn events

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface UnipileWebhookEvent {
  event: "message" | "message_read" | "account_status" | "message_sent";
  account_id: string;
  data: UnipileMessage | UnipileAccountStatus | UnipileMessageRead;
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
  }>;
  timestamp: string;
  is_sender_self: boolean;
}

interface UnipileMessageRead {
  message_id: string;
  chat_id: string;
  read_at: string;
}

interface UnipileAccountStatus {
  account_id: string;
  status: "CONNECTED" | "CREDENTIALS" | "ERROR";
  error_message?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  // Always return 200 to prevent Unipile retries
  const successResponse = () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    console.log("[linkedin-webhook] Webhook received");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[linkedin-webhook] Missing Supabase credentials");
      return successResponse(); // Still return 200 to prevent retries
    }

    const webhook: UnipileWebhookEvent = await req.json();
    console.log(
      "[linkedin-webhook] Event:",
      webhook.event,
      "Account:",
      webhook.account_id,
    );

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the integration for this Unipile account
    const { data: integration, error: integrationError } = await supabase
      .from("linkedin_integrations")
      .select("id, user_id, imo_id")
      .eq("unipile_account_id", webhook.account_id)
      .eq("is_active", true)
      .single();

    if (integrationError || !integration) {
      console.warn(
        "[linkedin-webhook] No active integration found for account:",
        webhook.account_id,
      );
      return successResponse();
    }

    switch (webhook.event) {
      case "message": {
        await handleNewMessage(
          supabase,
          integration,
          webhook.data as UnipileMessage,
        );
        break;
      }

      case "message_read": {
        await handleMessageRead(supabase, webhook.data as UnipileMessageRead);
        break;
      }

      case "account_status": {
        await handleAccountStatus(
          supabase,
          integration,
          webhook.data as UnipileAccountStatus,
        );
        break;
      }

      case "message_sent": {
        // Confirmation that our message was sent - usually handled by send-message
        console.log("[linkedin-webhook] Message sent confirmation received");
        break;
      }

      default:
        console.log("[linkedin-webhook] Unhandled event type:", webhook.event);
    }

    return successResponse();
  } catch (err) {
    console.error("[linkedin-webhook] Unexpected error:", err);
    // Still return 200 to prevent retries
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleNewMessage(
  supabase: ReturnType<typeof createClient>,
  integration: { id: string; user_id: string; imo_id: string },
  message: UnipileMessage,
) {
  console.log("[linkedin-webhook] Processing new message:", message.id);

  // Find or create conversation
  const { data: conversation, error: convError } = await supabase
    .from("linkedin_conversations")
    .select("id")
    .eq("integration_id", integration.id)
    .eq("unipile_chat_id", message.chat_id)
    .single();

  if (convError || !conversation) {
    // Create new conversation
    console.log(
      "[linkedin-webhook] Creating new conversation for chat:",
      message.chat_id,
    );

    const { data: newConv, error: createError } = await supabase
      .from("linkedin_conversations")
      .insert({
        integration_id: integration.id,
        unipile_chat_id: message.chat_id,
        participant_linkedin_id: message.sender?.id || message.sender_id,
        participant_username: message.sender?.identifier || null,
        participant_name: message.sender?.display_name || null,
        participant_profile_picture_url: message.sender?.picture_url || null,
        last_message_at: message.timestamp,
        last_message_preview: message.text?.substring(0, 100) || "[Media]",
        last_message_direction: message.is_sender_self ? "outbound" : "inbound",
        unread_count: message.is_sender_self ? 0 : 1,
      })
      .select("id")
      .single();

    if (createError) {
      console.error(
        "[linkedin-webhook] Error creating conversation:",
        createError,
      );
      return;
    }
    conversation = newConv;
  }

  // Determine message type
  let messageType: "text" | "media" | "inmail" | "invitation_message" = "text";
  if (message.attachments && message.attachments.length > 0) {
    messageType = "media";
  }

  // Insert the message
  const { error: msgError } = await supabase.from("linkedin_messages").upsert(
    {
      conversation_id: conversation.id,
      unipile_message_id: message.id,
      message_text: message.text || null,
      message_type: messageType,
      media_url: message.attachments?.[0]?.url || null,
      media_type: message.attachments?.[0]?.type || null,
      direction: message.is_sender_self ? "outbound" : "inbound",
      status: "delivered",
      sender_linkedin_id: message.sender?.id || message.sender_id,
      sender_name: message.sender?.display_name || null,
      sent_at: message.timestamp,
    },
    {
      onConflict: "unipile_message_id",
      ignoreDuplicates: true,
    },
  );

  if (msgError) {
    console.error("[linkedin-webhook] Error inserting message:", msgError);
    return;
  }

  console.log("[linkedin-webhook] Message stored successfully");

  // Note: Conversation update (last_message, unread_count) is handled by DB trigger
}

async function handleMessageRead(
  supabase: ReturnType<typeof createClient>,
  readEvent: UnipileMessageRead,
) {
  console.log(
    "[linkedin-webhook] Processing read receipt for message:",
    readEvent.message_id,
  );

  const { error } = await supabase
    .from("linkedin_messages")
    .update({
      status: "read",
      read_at: readEvent.read_at,
    })
    .eq("unipile_message_id", readEvent.message_id);

  if (error) {
    console.error("[linkedin-webhook] Error updating read status:", error);
  }
}

async function handleAccountStatus(
  supabase: ReturnType<typeof createClient>,
  integration: { id: string; user_id: string; imo_id: string },
  status: UnipileAccountStatus,
) {
  console.log("[linkedin-webhook] Processing account status:", status.status);

  const connectionStatus =
    status.status === "CONNECTED"
      ? "connected"
      : status.status === "CREDENTIALS"
        ? "credentials"
        : "error";

  const { error } = await supabase
    .from("linkedin_integrations")
    .update({
      connection_status: connectionStatus,
      is_active: status.status === "CONNECTED",
      last_error: status.error_message || null,
      last_error_at:
        status.status !== "CONNECTED" ? new Date().toISOString() : null,
    })
    .eq("id", integration.id);

  if (error) {
    console.error("[linkedin-webhook] Error updating account status:", error);
  }
}
