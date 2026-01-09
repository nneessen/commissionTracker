// supabase/functions/instagram-get-messages/index.ts
// Fetches messages for a specific Instagram DM conversation
// Uses Meta Graph API and syncs messages to local DB

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { decrypt } from "../_shared/encryption.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";
import {
  isTokenRecentlyExpired,
  attemptTokenRefresh,
  updateIntegrationToken,
  markIntegrationExpired,
} from "../_shared/instagram-token-refresh.ts";

interface MetaMessage {
  id: string;
  message?: string;
  created_time: string;
  from: {
    id: string;
    username?: string;
    name?: string;
  };
  to?: {
    data: Array<{
      id: string;
      username?: string;
    }>;
  };
  attachments?: {
    data: Array<{
      id: string;
      mime_type: string;
      file_url?: string;
      image_data?: {
        url: string;
      };
      video_data?: {
        url: string;
      };
    }>;
  };
  story?: {
    id: string;
    mention?: {
      link: string;
    };
  };
}

interface MetaMessagesResponse {
  data: MetaMessage[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
  error?: {
    message: string;
    type: string;
    code: number;
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

    // Get the conversation with its integration - verify user ownership via integration
    const { data: conversation, error: _convError } = await supabase
      .from("instagram_conversations")
      .select(
        `
        id,
        instagram_conversation_id,
        participant_instagram_id,
        integration:instagram_integrations!inner(
          id,
          instagram_user_id,
          instagram_username,
          access_token_encrypted,
          connection_status,
          is_active,
          user_id,
          token_expires_at
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
      user_id: string;
      token_expires_at: string | null;
    } | null;

    if (!conversation || !integration || integration.user_id !== user.id) {
      console.error(
        "[instagram-get-messages] Conversation not found or access denied",
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

    // Decrypt the access token
    const accessToken = await decrypt(integration.access_token_encrypted);
    const igUserId = integration.instagram_user_id;
    const igUsername = integration.instagram_username;
    const igConversationId = conversation.instagram_conversation_id;

    // Fetch messages from Instagram Graph API
    // Note: Instagram API for Business uses graph.instagram.com endpoints
    const apiUrl = new URL(
      `https://graph.instagram.com/v21.0/${igConversationId}/messages`,
    );
    apiUrl.searchParams.set("access_token", accessToken);
    apiUrl.searchParams.set(
      "fields",
      "id,message,created_time,from,to,attachments,story",
    );
    apiUrl.searchParams.set("limit", String(limit));

    if (cursor) {
      apiUrl.searchParams.set("after", cursor);
    }

    console.log(
      `[instagram-get-messages] Fetching messages for conversation: ${conversationId}, ig_conv: ${igConversationId}`,
    );
    console.log(
      `[instagram-get-messages] API URL (without token): ${apiUrl.toString().replace(accessToken, "REDACTED")}`,
    );

    // Add timeout to prevent hanging requests (25s to stay within edge function limits)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let apiResponse: Response;
    let rawResponse: string;
    try {
      apiResponse = await fetch(apiUrl.toString(), {
        signal: controller.signal,
      });
      rawResponse = await apiResponse.text();
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.error("[instagram-get-messages] Request timed out after 25s");
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Request to Instagram API timed out. Please try again.",
            code: "TIMEOUT",
          }),
          {
            status: 504,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      throw fetchError;
    }
    clearTimeout(timeoutId);

    console.log(
      `[instagram-get-messages] API response status: ${apiResponse.status}`,
    );
    console.log(
      `[instagram-get-messages] API raw response: ${rawResponse.substring(0, 500)}`,
    );

    let apiData: MetaMessagesResponse;
    try {
      apiData = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error(
        "[instagram-get-messages] Failed to parse API response:",
        parseError,
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Invalid API response: ${rawResponse.substring(0, 200)}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (apiData.error) {
      console.error(
        "[instagram-get-messages] Meta API error:",
        JSON.stringify(apiData.error),
      );

      // Handle token expiration - only mark expired for code 190 (Invalid Access Token)
      // Do NOT mark expired for rate limits (codes 4, 17, 32, 613) or server errors (1, 2)
      const isTokenInvalid = apiData.error.code === 190;
      const isRateLimit = [4, 17, 32, 613].includes(apiData.error.code);
      const isServerError = [1, 2].includes(apiData.error.code);

      if (isTokenInvalid) {
        // Check if token was recently expired - worth attempting refresh
        if (isTokenRecentlyExpired(integration.token_expires_at)) {
          console.log(
            "[instagram-get-messages] Token recently expired, attempting refresh",
          );

          const refreshResult = await attemptTokenRefresh(
            integration.access_token_encrypted,
          );

          if (
            refreshResult.success &&
            refreshResult.newToken &&
            refreshResult.newExpiresAt
          ) {
            // Update the token in the database
            const updated = await updateIntegrationToken(
              supabase,
              integration.id,
              refreshResult.newToken,
              refreshResult.newExpiresAt,
            );

            if (updated) {
              console.log(
                "[instagram-get-messages] Token refreshed, client should retry",
              );
              // Tell client to retry - token was refreshed
              return new Response(
                JSON.stringify({
                  ok: false,
                  error: "Token was refreshed. Please retry your request.",
                  code: "TOKEN_REFRESHED",
                  retry: true,
                }),
                {
                  status: 409, // Conflict - indicating state changed, retry
                  headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                  },
                },
              );
            }
          }
        }

        // Token refresh failed or not attempted - mark as expired
        await markIntegrationExpired(
          supabase,
          integration.id,
          apiData.error.message,
        );

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

      if (isRateLimit) {
        console.warn(
          `[instagram-get-messages] Rate limited: ${apiData.error.message}`,
        );
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Rate limited by Instagram. Please try again later.",
            code: "RATE_LIMITED",
            retryAfter: 60,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (isServerError) {
        console.warn(
          `[instagram-get-messages] Meta server error: ${apiData.error.message}`,
        );
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Instagram is temporarily unavailable. Please try again.",
            code: "SERVER_ERROR",
          }),
          {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          ok: false,
          error: apiData.error.message || "Failed to fetch messages",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const messages = apiData.data || [];
    console.log(
      `[instagram-get-messages] Fetched ${messages.length} messages from API`,
    );

    // Sync messages to database using batch upsert for performance
    // Previously: 50 messages = 50 DB calls. Now: 50 messages = 1 DB call
    if (syncToDb && messages.length > 0) {
      // Helper: determine if message is inbound (from someone other than us)
      // Compare by username first (more reliable), fallback to ID
      const isMessageInbound = (msg: MetaMessage): boolean => {
        if (msg.from.username && igUsername) {
          return msg.from.username !== igUsername;
        }
        return msg.from.id !== igUserId;
      };

      // Find the latest inbound message for window calculation
      const latestInboundAt =
        messages
          .filter((msg) => isMessageInbound(msg)) // inbound only
          .map((msg) => msg.created_time)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ||
        null;

      // Transform all messages into DB rows
      const messageRows = messages.map((msg) => {
        const isInbound = isMessageInbound(msg);
        const messageType = msg.story
          ? msg.story.mention
            ? "story_mention"
            : "story_reply"
          : msg.attachments?.data?.length
            ? "media"
            : "text";

        // Get media URL if present
        let mediaUrl: string | null = null;
        let mediaType: string | null = null;
        if (msg.attachments?.data?.[0]) {
          const attachment = msg.attachments.data[0];
          mediaUrl =
            attachment.file_url ||
            attachment.image_data?.url ||
            attachment.video_data?.url ||
            null;
          mediaType = attachment.mime_type || null;
        }

        return {
          conversation_id: conversationId,
          instagram_message_id: msg.id,
          message_text: msg.message || null,
          message_type: messageType,
          media_url: mediaUrl,
          media_type: mediaType,
          story_id: msg.story?.id || null,
          story_url: msg.story?.mention?.link || null,
          direction: isInbound ? "inbound" : "outbound",
          status: "delivered", // Messages from API are already delivered
          sender_instagram_id: msg.from.id,
          sender_username: msg.from.username || null,
          sent_at: msg.created_time,
          delivered_at: msg.created_time,
        };
      });

      // Batch upsert all messages in a single DB call
      // Uses instagram_message_id as the unique constraint for deduplication
      const { error: upsertError } = await supabase
        .from("instagram_messages")
        .upsert(messageRows, {
          onConflict: "instagram_message_id",
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error(
          `[instagram-get-messages] Failed to batch upsert ${messageRows.length} messages:`,
          upsertError,
        );
      } else {
        console.log(
          `[instagram-get-messages] Batch upserted ${messageRows.length} messages`,
        );
      }

      // Update conversation's last_inbound_at and can_reply_until if we have new inbound messages
      if (latestInboundAt) {
        const canReplyUntil = new Date(
          new Date(latestInboundAt).getTime() + 24 * 60 * 60 * 1000,
        ).toISOString();

        await supabase
          .from("instagram_conversations")
          .update({
            last_inbound_at: latestInboundAt,
            can_reply_until: canReplyUntil,
          })
          .eq("id", conversationId);
      }

      // Reset unread count after fetching messages
      await supabase
        .from("instagram_conversations")
        .update({ unread_count: 0 })
        .eq("id", conversationId);
    }

    // Fetch from local DB for consistent response format
    const { data: dbMessages, error: dbError } = await supabase
      .from("instagram_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: false })
      .limit(limit);

    if (dbError) {
      console.error("[instagram-get-messages] DB fetch error:", dbError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to fetch messages from database",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Also get the conversation details for window status
    const { data: convDetails } = await supabase
      .from("instagram_conversations")
      .select("can_reply_until, last_inbound_at")
      .eq("id", conversationId)
      .single();

    return new Response(
      JSON.stringify({
        ok: true,
        messages: dbMessages || [],
        hasMore: !!apiData.paging?.next,
        nextCursor: apiData.paging?.cursors?.after,
        syncedCount: messages.length,
        conversation: {
          canReplyUntil: convDetails?.can_reply_until,
          lastInboundAt: convDetails?.last_inbound_at,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[instagram-get-messages] Error:", err);
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
