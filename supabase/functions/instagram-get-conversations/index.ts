// supabase/functions/instagram-get-conversations/index.ts
// Fetches Instagram DM conversations for an integration
// Uses Meta Graph API to get conversation list and syncs to local DB

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { decrypt } from "../_shared/encryption.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";
import {
  isTokenAboutToExpire,
  isTokenRecentlyExpired,
  attemptTokenRefresh,
  updateIntegrationToken,
  markIntegrationExpired,
} from "../_shared/instagram-token-refresh.ts";

interface MetaConversation {
  id: string;
  updated_time: string;
  participants: {
    data: Array<{
      id: string;
      username?: string;
      name?: string;
      profile_picture_url?: string;
    }>;
  };
  messages?: {
    data: Array<{
      id: string;
      message?: string;
      created_time: string;
      from: {
        id: string;
        username?: string;
      };
    }>;
  };
}

interface MetaConversationsResponse {
  data: MetaConversation[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
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
    const { integrationId, limit = 20, cursor, syncToDb = true } = body;

    if (!integrationId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing integrationId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get the Instagram integration - verify user ownership
    const { data: integration, error: fetchError } = await supabase
      .from("instagram_integrations")
      .select(
        "id, instagram_user_id, instagram_username, access_token_encrypted, connection_status, is_active, token_expires_at",
      )
      .eq("id", integrationId)
      .eq("user_id", user.id) // Verify ownership
      .maybeSingle();

    if (fetchError || !integration) {
      console.error(
        "[instagram-get-conversations] Integration not found:",
        fetchError,
      );
      return new Response(
        JSON.stringify({ ok: false, error: "Instagram integration not found" }),
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
    let accessToken = await decrypt(integration.access_token_encrypted);

    // PROACTIVE TOKEN REFRESH - refresh BEFORE expiry while token is still valid
    // Instagram tokens can ONLY be refreshed while valid, not after expiry
    if (isTokenAboutToExpire(integration.token_expires_at, 7)) {
      console.log(
        "[instagram-get-conversations] Token expiring within 7 days, refreshing proactively",
      );
      const refreshResult = await attemptTokenRefresh(
        integration.access_token_encrypted,
      );
      if (
        refreshResult.success &&
        refreshResult.newToken &&
        refreshResult.newExpiresAt
      ) {
        await updateIntegrationToken(
          supabase,
          integrationId,
          refreshResult.newToken,
          refreshResult.newExpiresAt,
        );
        // Use the new token for this request
        accessToken = await decrypt(refreshResult.newToken);
        console.log(
          "[instagram-get-conversations] Token refreshed proactively, using new token",
        );
      } else {
        console.warn(
          "[instagram-get-conversations] Proactive refresh failed, continuing with current token",
        );
      }
    }

    // Fetch conversations from Instagram Graph API
    // Note: Instagram API for Business uses graph.instagram.com endpoints
    const igUserId = integration.instagram_user_id;

    // Use the user ID directly instead of /me for better compatibility
    const igUsername = integration.instagram_username;
    const apiUrl = new URL(
      `https://graph.instagram.com/v21.0/${igUserId}/conversations`,
    );
    apiUrl.searchParams.set("access_token", accessToken);
    // Request conversation fields - profile_picture_url must be fetched separately via User API
    // The conversations endpoint doesn't support profile_picture_url in participants subfields
    apiUrl.searchParams.set(
      "fields",
      "id,updated_time,participants{id,username,name},messages{id,message,created_time,from}",
    );
    apiUrl.searchParams.set("limit", String(limit));
    // Required for Instagram conversations
    apiUrl.searchParams.set("platform", "instagram");

    if (cursor) {
      apiUrl.searchParams.set("after", cursor);
    }

    console.log(
      `[instagram-get-conversations] Fetching conversations for integration: ${integrationId}, user: ${igUserId}`,
    );
    console.log(
      `[instagram-get-conversations] API URL (without token): ${apiUrl.toString().replace(accessToken, "REDACTED")}`,
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
        console.error(
          "[instagram-get-conversations] Request timed out after 25s",
        );
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
      `[instagram-get-conversations] API response status: ${apiResponse.status}`,
    );
    console.log(
      `[instagram-get-conversations] API raw response: ${rawResponse.substring(0, 500)}`,
    );

    let apiData: MetaConversationsResponse;
    try {
      apiData = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error(
        "[instagram-get-conversations] Failed to parse API response:",
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
        "[instagram-get-conversations] Meta API error:",
        JSON.stringify(apiData.error),
      );
      console.error(
        "[instagram-get-conversations] Full response:",
        rawResponse.substring(0, 1000),
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
            "[instagram-get-conversations] Token recently expired, attempting refresh",
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
              integrationId,
              refreshResult.newToken,
              refreshResult.newExpiresAt,
            );

            if (updated) {
              console.log(
                "[instagram-get-conversations] Token refreshed, client should retry",
              );
              // Tell client to retry - token was refreshed
              // Use 200 so Supabase invoke doesn't treat as transport error
              return new Response(
                JSON.stringify({
                  ok: false,
                  error: "Token was refreshed. Please retry your request.",
                  code: "TOKEN_REFRESHED",
                  retry: true,
                }),
                {
                  status: 200,
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
          integrationId,
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
        // Don't mark as expired, just return rate limit error
        console.warn(
          `[instagram-get-conversations] Rate limited: ${apiData.error.message}`,
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
        // Don't mark as expired for server errors, just return error
        console.warn(
          `[instagram-get-conversations] Meta server error: ${apiData.error.message}`,
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
          error: apiData.error.message || "Failed to fetch conversations",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const conversations = apiData.data || [];
    console.log(
      `[instagram-get-conversations] Fetched ${conversations.length} conversations from API`,
    );

    // DEBUG: Log participants data to understand what API returns
    if (conversations.length > 0) {
      const firstConv = conversations[0];
      console.log(
        `[instagram-get-conversations] DEBUG - igUserId from DB: "${igUserId}" (type: ${typeof igUserId})`,
      );
      console.log(
        `[instagram-get-conversations] DEBUG - First conversation participants:`,
        JSON.stringify(firstConv.participants?.data, null, 2),
      );
    }

    // Optionally sync conversations to database (batch upsert for performance)
    if (syncToDb && conversations.length > 0) {
      // Build batch of conversations to upsert
      const conversationsToUpsert = conversations
        .map((conv) => {
          // Find the other participant (not our instagram user)
          // Use BOTH username AND ID matching for robustness.
          // A participant is "us" if EITHER:
          // - Their username matches our username (case-insensitive)
          // - Their ID matches our stored ID
          // A participant is "other" if NEITHER condition is true.
          const normalizedIgUsername = igUsername?.toLowerCase() ?? "";
          const normalizedIgUserId = String(igUserId);

          const otherParticipant = conv.participants.data.find((p) => {
            const participantUsername = p.username?.toLowerCase() ?? "";
            const participantId = String(p.id);

            // This participant is "us" if username OR id matches
            const isUs =
              (normalizedIgUsername &&
                participantUsername === normalizedIgUsername) ||
              participantId === normalizedIgUserId;

            // Return true if this is NOT us (i.e., it's the other participant)
            return !isUs;
          });

          if (!otherParticipant) return null;

          // Get last message info
          const lastMessage = conv.messages?.data?.[0];
          const lastMessageAt = lastMessage?.created_time || conv.updated_time;
          const lastMessagePreview =
            lastMessage?.message?.substring(0, 100) || null;
          // Check if message is inbound (from the other participant, not us)
          // Message is inbound if sender is NOT us (neither username nor ID matches)
          const isInbound = lastMessage?.from
            ? (() => {
                const senderUsername =
                  lastMessage.from.username?.toLowerCase() ?? "";
                const senderId = String(lastMessage.from.id);
                const senderIsUs =
                  (normalizedIgUsername &&
                    senderUsername === normalizedIgUsername) ||
                  senderId === normalizedIgUserId;
                return !senderIsUs;
              })()
            : false;

          return {
            integration_id: integrationId,
            instagram_conversation_id: conv.id,
            participant_instagram_id: String(otherParticipant.id),
            participant_username: otherParticipant.username || null,
            participant_name: otherParticipant.name || null,
            participant_profile_picture_url:
              otherParticipant.profile_picture_url || null,
            last_message_at: lastMessageAt,
            last_message_preview: lastMessagePreview,
            last_message_direction: isInbound ? "inbound" : "outbound",
            // Set can_reply_until to 24hrs from last inbound message
            ...(isInbound
              ? {
                  can_reply_until: new Date(
                    new Date(lastMessageAt).getTime() + 24 * 60 * 60 * 1000,
                  ).toISOString(),
                  last_inbound_at: lastMessageAt,
                }
              : {}),
          };
        })
        .filter((conv): conv is NonNullable<typeof conv> => conv !== null);

      if (conversationsToUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from("instagram_conversations")
          .upsert(conversationsToUpsert, {
            onConflict: "integration_id,instagram_conversation_id",
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error(
            `[instagram-get-conversations] Failed to batch upsert conversations:`,
            upsertError,
          );
        } else {
          console.log(
            `[instagram-get-conversations] Batch upserted ${conversationsToUpsert.length} conversations`,
          );

          // Enqueue profile picture downloads for conversations without cached avatars
          // Run in background (fire-and-forget)
          enqueueProfilePictureDownloads(
            supabase,
            integrationId,
            conversationsToUpsert,
          ).catch((err) => {
            console.error(
              "[instagram-get-conversations] Error queueing avatar downloads:",
              err,
            );
          });
        }
      }
    }

    // Fetch from local DB for consistent response format
    const { data: dbConversations, error: dbError } = await supabase
      .from("instagram_conversations")
      .select("*")
      .eq("integration_id", integrationId)
      .order("last_message_at", { ascending: false })
      .limit(limit);

    if (dbError) {
      console.error("[instagram-get-conversations] DB fetch error:", dbError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to fetch conversations from database",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        conversations: dbConversations || [],
        hasMore: !!apiData.paging?.next,
        nextCursor: apiData.paging?.cursors?.after,
        syncedCount: conversations.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[instagram-get-conversations] Error:", err);
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

/**
 * Enqueue metadata refresh jobs for conversations that need profile pictures
 * The metadata refresh job will call Meta's User API to get profile_picture_url
 * then enqueue a download job if successful
 */
async function enqueueProfilePictureDownloads(
  supabase: ReturnType<typeof createClient>,
  integrationId: string,
  conversations: Array<{
    instagram_conversation_id: string;
    participant_instagram_id: string;
    participant_profile_picture_url: string | null;
  }>,
): Promise<void> {
  // Get existing conversations to check for cached avatars
  const { data: existingConvs } = await supabase
    .from("instagram_conversations")
    .select(
      "id, instagram_conversation_id, participant_avatar_cached_url, participant_profile_picture_url",
    )
    .eq("integration_id", integrationId)
    .in(
      "instagram_conversation_id",
      conversations.map((c) => c.instagram_conversation_id),
    );

  const existingMap = new Map(
    existingConvs?.map((c) => [c.instagram_conversation_id, c]) || [],
  );

  // Queue metadata refresh for conversations without cached avatars OR without profile picture URL
  let queued = 0;
  for (const conv of conversations) {
    const existing = existingMap.get(conv.instagram_conversation_id);
    if (!existing?.id) continue;

    // Skip if already cached
    if (existing.participant_avatar_cached_url) continue;

    // If we have a profile picture URL from API, queue direct download
    if (conv.participant_profile_picture_url) {
      await supabase.rpc("enqueue_instagram_job", {
        p_job_type: "download_profile_picture",
        p_payload: {
          conversation_id: existing.id,
          participant_id: conv.participant_instagram_id,
          source_url: conv.participant_profile_picture_url,
        },
        p_integration_id: integrationId,
        p_priority: -1,
      });
      queued++;
    } else {
      // No profile picture URL from conversations API - fetch via User API
      await supabase.rpc("enqueue_instagram_job", {
        p_job_type: "refresh_participant_metadata",
        p_payload: {
          conversation_id: existing.id,
          participant_id: conv.participant_instagram_id,
        },
        p_integration_id: integrationId,
        p_priority: -2, // Even lower priority
      });
      queued++;
    }
  }

  if (queued > 0) {
    console.log(
      `[instagram-get-conversations] Queued ${queued} profile picture/metadata jobs`,
    );
  }
}
