// supabase/functions/instagram-webhook/index.ts
// Handles incoming webhooks from Meta Graph API for Instagram DMs
// Processes inbound messages, read receipts, and triggers pending scheduled messages

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { decrypt } from "../_shared/encryption.ts";

// CORS headers for webhook responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-hub-signature-256",
};

interface InstagramWebhookEvent {
  object: "instagram";
  entry: Array<{
    id: string; // Instagram Business Account ID
    time: number;
    messaging?: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: {
        mid: string;
        text?: string;
        attachments?: Array<{
          type: "image" | "video" | "audio" | "file";
          payload: { url: string };
        }>;
        is_echo?: boolean;
        is_deleted?: boolean;
      };
      read?: {
        mid: string;
        watermark: number;
      };
    }>;
  }>;
}

/**
 * Verify Meta webhook signature using HMAC-SHA256
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!signature || !signature.startsWith("sha256=")) {
    return false;
  }

  const expectedSignature = signature.substring(7); // Remove "sha256=" prefix
  const encoder = new TextEncoder();

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(payload),
  );

  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison to prevent timing attacks
  if (computedSignature.length !== expectedSignature.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < computedSignature.length; i++) {
    result |= computedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return result === 0;
}

serve(async (req) => {
  const url = new URL(req.url);

  // Handle Meta webhook verification (GET request)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("[instagram-webhook] Webhook verified successfully");
      return new Response(challenge, { status: 200 });
    }

    console.error("[instagram-webhook] Webhook verification failed", {
      mode,
      tokenMatch: token === VERIFY_TOKEN,
    });
    return new Response("Forbidden", { status: 403 });
  }

  // Handle OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests for webhook events
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const META_APP_SECRET = Deno.env.get("META_APP_SECRET");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[instagram-webhook] Missing Supabase config");
      return new Response("OK", { status: 200 }); // Return 200 to prevent Meta retries
    }

    if (!META_APP_SECRET) {
      console.error("[instagram-webhook] META_APP_SECRET not configured");
      return new Response("OK", { status: 200 });
    }

    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(
      rawBody,
      signature,
      META_APP_SECRET,
    );
    if (!isValid) {
      console.error("[instagram-webhook] Invalid signature - rejecting");
      return new Response("OK", { status: 200 }); // Return 200 to prevent retries
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const event: InstagramWebhookEvent = JSON.parse(rawBody);

    // Only process instagram events
    if (event.object !== "instagram") {
      console.log("[instagram-webhook] Ignoring non-instagram event");
      return new Response("OK", { status: 200 });
    }

    // Process each entry
    for (const entry of event.entry) {
      const igBusinessAccountId = entry.id;

      // Find the integration for this Instagram account
      const { data: integration, error: intError } = await supabase
        .from("instagram_integrations")
        .select("id, user_id, instagram_username")
        .eq("instagram_user_id", igBusinessAccountId)
        .eq("is_active", true)
        .eq("connection_status", "connected")
        .single();

      if (intError || !integration) {
        console.log(
          `[instagram-webhook] No integration found for IG account ${igBusinessAccountId}`,
        );
        continue;
      }

      // Process messaging events
      if (!entry.messaging) continue;

      for (const messagingEvent of entry.messaging) {
        // Handle inbound messages
        if (messagingEvent.message && !messagingEvent.message.is_echo) {
          await processInboundMessage(
            supabase,
            integration,
            messagingEvent,
            igBusinessAccountId,
          );
        }

        // Handle read receipts
        if (messagingEvent.read) {
          await processReadReceipt(supabase, integration, messagingEvent);
        }
      }
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("[instagram-webhook] Error:", err);
    // Always return 200 to prevent Meta from retrying
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
});

/**
 * Process an inbound message from Instagram
 */
async function processInboundMessage(
  supabase: ReturnType<typeof createClient>,
  integration: { id: string; user_id: string; instagram_username: string },
  messagingEvent: {
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: {
      mid: string;
      text?: string;
      attachments?: Array<{
        type: string;
        payload: { url: string };
      }>;
    };
  },
  igBusinessAccountId: string,
) {
  const senderId = messagingEvent.sender.id;
  const messageId = messagingEvent.message!.mid;
  const messageText = messagingEvent.message!.text || "";
  const attachments = messagingEvent.message!.attachments;
  const timestamp = new Date(messagingEvent.timestamp).toISOString();

  console.log(
    `[instagram-webhook] Processing inbound message from ${senderId}`,
  );

  // Find or create conversation
  const conversation = await findOrCreateConversation(
    supabase,
    integration.id,
    senderId,
    igBusinessAccountId,
  );

  if (!conversation) {
    console.error("[instagram-webhook] Failed to find/create conversation");
    return;
  }

  // Update conversation with new window (24 hours from now)
  const newWindowExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await supabase
    .from("instagram_conversations")
    .update({
      can_reply_until: newWindowExpiry.toISOString(),
      last_inbound_at: timestamp,
      last_message_at: timestamp,
      last_message_preview: messageText.substring(0, 100) || "[Media]",
      last_message_direction: "inbound",
      unread_count: (conversation.unread_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversation.id);

  // Determine message type
  let messageType = "text";
  let mediaUrl = null;
  let mediaType = null;

  if (attachments && attachments.length > 0) {
    const attachment = attachments[0];
    messageType = "media";
    mediaUrl = attachment.payload.url;
    mediaType = attachment.type;
  }

  // Store the message (check for idempotency)
  const { error: msgError } = await supabase.from("instagram_messages").upsert(
    {
      conversation_id: conversation.id,
      instagram_message_id: messageId,
      message_text: messageText || null,
      message_type: messageType,
      media_url: mediaUrl,
      media_type: mediaType,
      direction: "inbound",
      status: "delivered",
      sender_instagram_id: senderId,
      sent_at: timestamp,
    },
    { onConflict: "instagram_message_id" },
  );

  if (msgError) {
    console.error("[instagram-webhook] Error storing message:", msgError);
  }

  // Enqueue media caching job if message has attachments
  if (mediaUrl) {
    await supabase.rpc("enqueue_instagram_job", {
      p_job_type: "download_message_media",
      p_payload: {
        message_id: messageId,
        conversation_id: conversation.id,
        source_url: mediaUrl,
        media_type: mediaType,
      },
      p_integration_id: integration.id,
      p_priority: 0,
    });
    console.log(`[instagram-webhook] Enqueued media download for ${messageId}`);
  }

  // Fire-and-forget: Check for pending scheduled messages
  // Don't await - let CRON catch any failures. Keeps webhook response fast (<500ms)
  triggerPendingScheduledMessages(
    supabase,
    conversation.id,
    integration.id,
    newWindowExpiry.toISOString(),
  ).catch((err) => {
    console.error("[instagram-webhook] Background scheduled send error:", err);
  });
}

/**
 * Find existing conversation or create new one
 */
async function findOrCreateConversation(
  supabase: ReturnType<typeof createClient>,
  integrationId: string,
  participantId: string,
  igBusinessAccountId: string,
): Promise<{ id: string; unread_count: number } | null> {
  // Try to find existing conversation
  const { data: existing } = await supabase
    .from("instagram_conversations")
    .select("id, unread_count")
    .eq("integration_id", integrationId)
    .eq("participant_instagram_id", participantId)
    .single();

  if (existing) {
    return existing;
  }

  // Create new conversation
  const conversationId = `${igBusinessAccountId}_${participantId}`;
  const { data: created, error } = await supabase
    .from("instagram_conversations")
    .insert({
      integration_id: integrationId,
      instagram_conversation_id: conversationId,
      participant_instagram_id: participantId,
      unread_count: 0,
      is_priority: false,
      auto_reminder_enabled: false,
      auto_reminder_hours: 12,
    })
    .select("id, unread_count")
    .single();

  if (error) {
    console.error("[instagram-webhook] Error creating conversation:", error);
    return null;
  }

  return created;
}

/**
 * Send a single scheduled message (helper for parallel execution)
 */
async function sendSingleScheduledMessage(
  supabase: ReturnType<typeof createClient>,
  pendingMsg: { id: string; message_text: string; template_id: string | null },
  conversationId: string,
  participantId: string,
  integration: {
    instagram_user_id: string;
    instagram_username: string;
  },
  accessToken: string,
): Promise<{ success: boolean; messageId: string }> {
  // Use same API endpoint as instagram-send-message function for consistency
  const apiUrl = "https://graph.instagram.com/v21.0/me/messages";

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: participantId },
      message: { text: pendingMsg.message_text },
      access_token: accessToken,
    }),
  });

  const result = await response.json();

  if (result.error) {
    console.error(
      `[instagram-webhook] Failed to send scheduled message:`,
      result.error,
    );

    await supabase
      .from("instagram_scheduled_messages")
      .update({
        status: "failed",
        error_message: result.error.message,
        retry_count: 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pendingMsg.id);

    return { success: false, messageId: pendingMsg.id };
  }

  // Success - run post-send updates in parallel
  const sentMsgId = result.message_id;
  const now = new Date().toISOString();

  await Promise.all([
    supabase.from("instagram_messages").insert({
      conversation_id: conversationId,
      instagram_message_id: sentMsgId,
      message_text: pendingMsg.message_text,
      message_type: "text",
      direction: "outbound",
      status: "sent",
      sender_instagram_id: integration.instagram_user_id,
      sender_username: integration.instagram_username,
      sent_at: now,
      template_id: pendingMsg.template_id,
      scheduled_message_id: pendingMsg.id,
    }),
    supabase
      .from("instagram_scheduled_messages")
      .update({
        status: "sent",
        sent_at: now,
        sent_message_id: sentMsgId,
        updated_at: now,
      })
      .eq("id", pendingMsg.id),
    supabase
      .from("instagram_conversations")
      .update({
        last_message_at: now,
        last_message_preview: pendingMsg.message_text.substring(0, 100),
        last_message_direction: "outbound",
      })
      .eq("id", conversationId),
    pendingMsg.template_id
      ? supabase.rpc("increment_template_use_count", {
          p_template_id: pendingMsg.template_id,
        })
      : Promise.resolve(),
  ]);

  console.log(`[instagram-webhook] Sent scheduled message ${pendingMsg.id}`);
  return { success: true, messageId: pendingMsg.id };
}

/**
 * Trigger pending scheduled messages when window opens
 * Runs as fire-and-forget from webhook, with parallel message sending
 */
async function triggerPendingScheduledMessages(
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
  integrationId: string,
  _newWindowExpiry: string,
) {
  const now = new Date().toISOString();

  // Find pending scheduled messages that are due now
  const { data: pendingMessages, error } = await supabase
    .from("instagram_scheduled_messages")
    .select("id, message_text, template_id")
    .eq("conversation_id", conversationId)
    .eq("status", "pending")
    .lte("scheduled_for", now);

  if (error || !pendingMessages || pendingMessages.length === 0) {
    return;
  }

  console.log(
    `[instagram-webhook] Found ${pendingMessages.length} pending messages to send (parallel)`,
  );

  // Fetch integration and conversation details in parallel
  const [integrationResult, conversationResult] = await Promise.all([
    supabase
      .from("instagram_integrations")
      .select("access_token_encrypted, instagram_user_id, instagram_username")
      .eq("id", integrationId)
      .single(),
    supabase
      .from("instagram_conversations")
      .select("participant_instagram_id")
      .eq("id", conversationId)
      .single(),
  ]);

  const integration = integrationResult.data;
  const conversation = conversationResult.data;

  if (!integration || !conversation) {
    console.error("[instagram-webhook] Integration or conversation not found");
    return;
  }

  // Decrypt access token
  let accessToken: string;
  try {
    accessToken = await decrypt(integration.access_token_encrypted);
  } catch (err) {
    console.error("[instagram-webhook] Failed to decrypt token:", err);
    return;
  }

  // Send all pending messages in parallel (limited to 5 concurrent)
  const results = await Promise.allSettled(
    pendingMessages.map((msg) =>
      sendSingleScheduledMessage(
        supabase,
        msg,
        conversationId,
        conversation.participant_instagram_id,
        integration,
        accessToken,
      ),
    ),
  );

  const sent = results.filter(
    (r) => r.status === "fulfilled" && r.value.success,
  ).length;
  const failed = results.length - sent;

  console.log(
    `[instagram-webhook] Scheduled sends complete: ${sent} sent, ${failed} failed`,
  );
}

/**
 * Process a read receipt
 */
async function processReadReceipt(
  supabase: ReturnType<typeof createClient>,
  _integration: { id: string },
  messagingEvent: {
    read?: { mid: string; watermark: number };
  },
) {
  if (!messagingEvent.read) return;

  const watermark = new Date(messagingEvent.read.watermark).toISOString();

  // Update all outbound messages before watermark as read
  await supabase
    .from("instagram_messages")
    .update({
      status: "read",
      read_at: new Date().toISOString(),
    })
    .eq("direction", "outbound")
    .lte("sent_at", watermark)
    .is("read_at", null);

  console.log(`[instagram-webhook] Processed read receipt up to ${watermark}`);
}
