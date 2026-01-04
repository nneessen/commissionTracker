// supabase/functions/instagram-send-message/index.ts
// Sends a DM to an Instagram user via the Meta Graph API
// Validates 24hr messaging window before sending

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { decrypt } from "../_shared/encryption.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface MetaSendMessageResponse {
  recipient_id?: string;
  message_id?: string;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "Authorization required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();
    const { conversationId, messageText, templateId } = body;

    if (!conversationId || !messageText) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing conversationId or messageText",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate message length (Instagram limit is 1000 characters)
    if (messageText.length > 1000) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Message exceeds 1000 character limit",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get the conversation with its integration - verify user ownership via integration
    const { data: conversation, error: convError } = await supabase
      .from("instagram_conversations")
      .select(
        `
        id,
        instagram_conversation_id,
        participant_instagram_id,
        participant_username,
        can_reply_until,
        integration:instagram_integrations!inner(
          id,
          instagram_user_id,
          instagram_username,
          access_token_encrypted,
          connection_status,
          is_active,
          api_calls_this_hour,
          api_calls_reset_at,
          user_id
        )
      `,
      )
      .eq("id", conversationId)
      .maybeSingle();

    // Verify ownership through the integration
    const integration = conversation?.integration as {
      id: string;
      instagram_user_id: string;
      instagram_username: string;
      access_token_encrypted: string;
      connection_status: string;
      is_active: boolean;
      api_calls_this_hour: number;
      api_calls_reset_at: string | null;
      user_id: string;
    } | null;

    if (
      convError ||
      !conversation ||
      !integration ||
      integration.user_id !== user.id
    ) {
      console.error(
        "[instagram-send-message] Conversation not found or access denied:",
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

    if (
      !integration.is_active ||
      integration.connection_status !== "connected"
    ) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Instagram integration is not active or connected",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check 24hr messaging window
    const canReplyUntil = conversation.can_reply_until;
    const now = new Date();

    if (!canReplyUntil || new Date(canReplyUntil) < now) {
      console.log(
        `[instagram-send-message] Messaging window closed for conversation ${conversationId}`,
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Messaging window closed. You can only reply within 24 hours of the last message from this user.",
          code: "WINDOW_CLOSED",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check API rate limits (200 calls per hour)
    const rateLimitResetAt = integration.api_calls_reset_at
      ? new Date(integration.api_calls_reset_at)
      : null;
    let apiCallsThisHour = integration.api_calls_this_hour || 0;

    // Reset counter if hour has passed
    if (!rateLimitResetAt || rateLimitResetAt < now) {
      apiCallsThisHour = 0;
    }

    if (apiCallsThisHour >= 200) {
      console.log(
        `[instagram-send-message] Rate limit reached for integration ${integration.id}`,
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Instagram API rate limit reached. Please try again later.",
          code: "RATE_LIMITED",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Decrypt the access token
    const accessToken = await decrypt(integration.access_token_encrypted);
    const igUserId = integration.instagram_user_id;
    const recipientId = conversation.participant_instagram_id;

    // Send message via Instagram Graph API
    const apiUrl = `https://graph.facebook.com/v18.0/${igUserId}/messages`;

    console.log(
      `[instagram-send-message] Sending message to ${conversation.participant_username || recipientId}`,
    );

    const apiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: messageText },
        access_token: accessToken,
      }),
    });

    const apiData: MetaSendMessageResponse = await apiResponse.json();

    // Update API call counter
    const resetAt =
      !rateLimitResetAt || rateLimitResetAt < now
        ? new Date(now.getTime() + 60 * 60 * 1000).toISOString()
        : integration.api_calls_reset_at;

    await supabase
      .from("instagram_integrations")
      .update({
        api_calls_this_hour: apiCallsThisHour + 1,
        api_calls_reset_at: resetAt,
      })
      .eq("id", integration.id);

    if (apiData.error) {
      console.error("[instagram-send-message] Meta API error:", apiData.error);

      // Handle specific error codes
      if (
        apiData.error.code === 190 ||
        apiData.error.type === "OAuthException"
      ) {
        await supabase
          .from("instagram_integrations")
          .update({
            connection_status: "expired",
            last_error: apiData.error.message,
            last_error_at: new Date().toISOString(),
          })
          .eq("id", integration.id);

        return new Response(
          JSON.stringify({
            ok: false,
            error: "Instagram token expired. Please reconnect.",
            code: "TOKEN_EXPIRED",
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Handle messaging window error (error code 10)
      if (
        apiData.error.code === 10 ||
        apiData.error.error_subcode === 2018278
      ) {
        return new Response(
          JSON.stringify({
            ok: false,
            error:
              "Cannot send message: 24-hour messaging window has closed. Wait for the user to message you first.",
            code: "WINDOW_CLOSED",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          ok: false,
          error: apiData.error.message || "Failed to send message",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!apiData.message_id) {
      console.error("[instagram-send-message] No message_id in response");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to send message: no message ID returned",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `[instagram-send-message] Message sent successfully: ${apiData.message_id}`,
    );

    // Store the sent message in our database
    const { data: savedMessage, error: saveError } = await supabase
      .from("instagram_messages")
      .insert({
        conversation_id: conversationId,
        instagram_message_id: apiData.message_id,
        message_text: messageText,
        message_type: "text",
        direction: "outbound",
        status: "sent",
        sender_instagram_id: igUserId,
        sender_username: integration.instagram_username,
        sent_at: new Date().toISOString(),
        template_id: templateId || null,
      })
      .select()
      .single();

    if (saveError) {
      console.error(
        "[instagram-send-message] Failed to save message to DB:",
        saveError,
      );
      // Don't fail the request - message was sent successfully
    }

    // Update conversation's last message info
    await supabase
      .from("instagram_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: messageText.substring(0, 100),
        last_message_direction: "outbound",
      })
      .eq("id", conversationId);

    // If a template was used, increment its use count
    if (templateId) {
      await supabase.rpc("increment_template_use_count", {
        p_template_id: templateId,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        messageId: apiData.message_id,
        message: savedMessage || {
          id: apiData.message_id,
          message_text: messageText,
          direction: "outbound",
          status: "sent",
          sent_at: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[instagram-send-message] Error:", err);
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
