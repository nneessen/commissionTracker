// supabase/functions/instagram-get-conversations/index.ts
// Fetches Instagram DM conversations for an integration
// Uses Meta Graph API to get conversation list and syncs to local DB

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { decrypt } from "../_shared/encryption.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

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
        "id, instagram_user_id, access_token_encrypted, connection_status, is_active",
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
    const accessToken = await decrypt(integration.access_token_encrypted);

    // Fetch conversations from Instagram Graph API
    // Note: Instagram API for Business uses graph.instagram.com endpoints
    const igUserId = integration.instagram_user_id;

    // Use the user ID directly instead of /me for better compatibility
    const apiUrl = new URL(
      `https://graph.instagram.com/v21.0/${igUserId}/conversations`,
    );
    apiUrl.searchParams.set("access_token", accessToken);
    // Request profile_picture_url for participants to display avatars
    apiUrl.searchParams.set(
      "fields",
      "id,updated_time,participants{id,username,name,profile_picture_url},messages{id,message,created_time,from}",
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

    const apiResponse = await fetch(apiUrl.toString());
    const rawResponse = await apiResponse.text();

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

      // Handle token expiration
      if (
        apiData.error.code === 190 ||
        apiData.error.type === "OAuthException"
      ) {
        // Update integration status to expired
        await supabase
          .from("instagram_integrations")
          .update({
            connection_status: "expired",
            last_error: apiData.error.message,
            last_error_at: new Date().toISOString(),
          })
          .eq("id", integrationId);

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

    // Optionally sync conversations to database (batch upsert for performance)
    if (syncToDb && conversations.length > 0) {
      // Build batch of conversations to upsert
      const conversationsToUpsert = conversations
        .map((conv) => {
          // Find the other participant (not our instagram user)
          const otherParticipant = conv.participants.data.find(
            (p) => p.id !== igUserId,
          );

          if (!otherParticipant) return null;

          // Get last message info
          const lastMessage = conv.messages?.data?.[0];
          const lastMessageAt = lastMessage?.created_time || conv.updated_time;
          const lastMessagePreview =
            lastMessage?.message?.substring(0, 100) || null;
          const isInbound = lastMessage?.from?.id !== igUserId;

          return {
            integration_id: integrationId,
            instagram_conversation_id: conv.id,
            participant_instagram_id: otherParticipant.id,
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
