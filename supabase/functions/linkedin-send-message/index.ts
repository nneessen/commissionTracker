// supabase/functions/linkedin-send-message/index.ts
// Sends a LinkedIn DM via Unipile

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface SendMessageRequest {
  conversationId: string;
  messageText: string;
  templateId?: string;
}

interface UnipileSendMessageResponse {
  id: string;
  chat_id: string;
  text: string;
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    console.log("[linkedin-send-message] Function invoked");

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
      console.error("[linkedin-send-message] Missing credentials");
      return new Response(
        JSON.stringify({ ok: false, error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body: SendMessageRequest = await req.json();
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

    // Validate message length (LinkedIn allows up to ~8000 chars)
    if (messageText.length > 8000) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Message exceeds 8000 character limit",
        }),
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
        participant_linkedin_id,
        integration:linkedin_integrations!inner(
          id,
          unipile_account_id,
          user_id,
          linkedin_profile_id,
          api_calls_this_hour,
          api_calls_reset_at
        )
      `,
      )
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      console.error(
        "[linkedin-send-message] Conversation not found:",
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

    const integration = Array.isArray(conversation.integration)
      ? conversation.integration[0]
      : conversation.integration;

    // Check rate limiting (simple hourly limit check)
    const now = new Date();
    const resetAt = integration.api_calls_reset_at
      ? new Date(integration.api_calls_reset_at)
      : now;

    if (now < resetAt && integration.api_calls_this_hour >= 200) {
      console.warn("[linkedin-send-message] Rate limit exceeded");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMITED",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      "[linkedin-send-message] Sending message to chat:",
      conversation.unipile_chat_id,
    );

    // Send message via Unipile
    const unipileResponse = await fetch(
      `https://${UNIPILE_DSN}/api/v1/chats/${conversation.unipile_chat_id}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": UNIPILE_API_KEY,
        },
        body: JSON.stringify({
          text: messageText,
        }),
      },
    );

    if (!unipileResponse.ok) {
      const errorText = await unipileResponse.text();
      console.error("[linkedin-send-message] Unipile API error:", errorText);

      // Parse error for specific codes
      let errorCode = "SEND_FAILED";
      let errorMessage = "Failed to send message";

      try {
        const errorJson = JSON.parse(errorText);
        if (
          errorJson.code === "CREDENTIALS" ||
          errorJson.status === "CREDENTIALS"
        ) {
          errorCode = "TOKEN_EXPIRED";
          errorMessage = "LinkedIn connection expired. Please reconnect.";

          // Update integration status
          await supabase
            .from("linkedin_integrations")
            .update({
              connection_status: "credentials",
              last_error: "Session expired",
              last_error_at: new Date().toISOString(),
            })
            .eq("id", integration.id);
        }
      } catch {
        // Ignore JSON parse errors
      }

      return new Response(
        JSON.stringify({
          ok: false,
          error: errorMessage,
          code: errorCode,
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const sentMessage: UnipileSendMessageResponse =
      await unipileResponse.json();
    console.log("[linkedin-send-message] Message sent:", sentMessage.id);

    // Store the sent message in database
    const { data: storedMessage, error: insertError } = await supabase
      .from("linkedin_messages")
      .insert({
        conversation_id: conversationId,
        unipile_message_id: sentMessage.id,
        message_text: messageText,
        message_type: "text",
        direction: "outbound",
        status: "sent",
        sender_linkedin_id: integration.linkedin_profile_id || "self",
        sent_at: sentMessage.timestamp || new Date().toISOString(),
        template_id: templateId || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error(
        "[linkedin-send-message] Error storing message:",
        insertError,
      );
      // Don't fail - message was sent successfully
    }

    // Update API call counter
    const newCallCount =
      now >= resetAt ? 1 : (integration.api_calls_this_hour || 0) + 1;
    const newResetAt =
      now >= resetAt
        ? new Date(now.getTime() + 60 * 60 * 1000).toISOString()
        : integration.api_calls_reset_at;

    await supabase
      .from("linkedin_integrations")
      .update({
        api_calls_this_hour: newCallCount,
        api_calls_reset_at: newResetAt,
      })
      .eq("id", integration.id);

    // Update template usage if template was used
    if (templateId) {
      await supabase
        .rpc("increment_template_usage", { p_template_id: templateId })
        .catch((err) => {
          console.warn(
            "[linkedin-send-message] Failed to increment template usage:",
            err,
          );
        });
    }

    // Update usage tracking
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    await supabase
      .from("linkedin_usage_tracking")
      .upsert(
        {
          imo_id: (
            await supabase
              .from("linkedin_integrations")
              .select("imo_id")
              .eq("id", integration.id)
              .single()
          ).data?.imo_id,
          user_id: integration.user_id,
          period_start: periodStart.toISOString().split("T")[0],
          period_end: new Date(
            periodStart.getFullYear(),
            periodStart.getMonth() + 1,
            0,
          )
            .toISOString()
            .split("T")[0],
          messages_sent: 1,
        },
        {
          onConflict: "imo_id,user_id,period_start",
        },
      )
      .catch((err) => {
        console.warn(
          "[linkedin-send-message] Failed to update usage tracking:",
          err,
        );
      });

    return new Response(
      JSON.stringify({
        ok: true,
        message: storedMessage || {
          id: sentMessage.id,
          conversation_id: conversationId,
          message_text: messageText,
          sent_at: sentMessage.timestamp,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[linkedin-send-message] Unexpected error:", err);
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
