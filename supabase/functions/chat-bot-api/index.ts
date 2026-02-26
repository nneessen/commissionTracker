// supabase/functions/chat-bot-api/index.ts
// User-facing edge function — proxies chat bot management actions to standard-chat-bot external API.
// Auth: Bearer token (user JWT) → resolves user_id → looks up chat_bot_agents → proxies request.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Helper to call standard-chat-bot external API
async function callChatBotApi(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const CHAT_BOT_API_URL = Deno.env.get("CHAT_BOT_API_URL");
  const CHAT_BOT_API_KEY = Deno.env.get("CHAT_BOT_API_KEY");

  if (!CHAT_BOT_API_URL || !CHAT_BOT_API_KEY) {
    throw new Error("CHAT_BOT_API_URL or CHAT_BOT_API_KEY not configured");
  }

  const url = `${CHAT_BOT_API_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": CHAT_BOT_API_KEY,
    },
  };
  if (method !== "GET" && method !== "DELETE") {
    options.body = JSON.stringify(body || {});
  }

  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Authenticate user via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Look up active chat bot agent for this user
    const { data: agent } = await supabase
      .from("chat_bot_agents")
      .select("external_agent_id, provisioning_status")
      .eq("user_id", user.id)
      .eq("provisioning_status", "active")
      .maybeSingle();

    if (!agent) {
      return jsonResponse({ error: "No active chat bot found" }, 404);
    }

    const agentId = agent.external_agent_id;
    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      // ──────────────────────────────────────────────
      // AGENT STATUS & CONFIG
      // ──────────────────────────────────────────────
      case "get_status": {
        const res = await callChatBotApi(
          "GET",
          `/api/external/agents/${agentId}/status`,
        );
        return jsonResponse(res.data, res.status);
      }

      case "get_agent": {
        const res = await callChatBotApi(
          "GET",
          `/api/external/agents/${agentId}`,
        );
        return jsonResponse(res.data, res.status);
      }

      case "update_config": {
        const res = await callChatBotApi(
          "PATCH",
          `/api/external/agents/${agentId}`,
          params,
        );
        return jsonResponse(res.data, res.status);
      }

      // ──────────────────────────────────────────────
      // CLOSE CRM CONNECTION
      // ──────────────────────────────────────────────
      case "connect_close": {
        const res = await callChatBotApi(
          "POST",
          `/api/external/agents/${agentId}/connections/close`,
          params,
        );
        return jsonResponse(res.data, res.status);
      }

      case "disconnect_close": {
        const res = await callChatBotApi(
          "DELETE",
          `/api/external/agents/${agentId}/connections/close`,
        );
        return jsonResponse(res.data, res.status);
      }

      case "get_close_status": {
        const res = await callChatBotApi(
          "GET",
          `/api/external/agents/${agentId}/connections/close`,
        );
        return jsonResponse(res.data, res.status);
      }

      // ──────────────────────────────────────────────
      // CALENDLY CONNECTION
      // ──────────────────────────────────────────────
      case "get_calendly_auth_url": {
        const returnUrl = params.returnUrl || "";
        const res = await callChatBotApi(
          "GET",
          `/api/external/agents/${agentId}/calendly/authorize?returnUrl=${encodeURIComponent(returnUrl)}`,
        );
        return jsonResponse(res.data, res.status);
      }

      case "disconnect_calendly": {
        const res = await callChatBotApi(
          "DELETE",
          `/api/external/agents/${agentId}/connections/calendly`,
        );
        return jsonResponse(res.data, res.status);
      }

      case "get_calendly_status": {
        const res = await callChatBotApi(
          "GET",
          `/api/external/agents/${agentId}/connections/calendly`,
        );
        return jsonResponse(res.data, res.status);
      }

      // ──────────────────────────────────────────────
      // CONVERSATIONS & MESSAGES
      // ──────────────────────────────────────────────
      case "get_conversations": {
        const qs = new URLSearchParams();
        if (params.page) qs.set("page", String(params.page));
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.status) qs.set("status", String(params.status));
        const queryString = qs.toString() ? `?${qs.toString()}` : "";
        const res = await callChatBotApi(
          "GET",
          `/api/external/agents/${agentId}/conversations${queryString}`,
        );
        return jsonResponse(res.data, res.status);
      }

      case "get_messages": {
        const { conversationId } = params;
        if (!conversationId) {
          return jsonResponse({ error: "conversationId is required" }, 400);
        }
        const qs = new URLSearchParams();
        if (params.page) qs.set("page", String(params.page));
        if (params.limit) qs.set("limit", String(params.limit));
        const queryString = qs.toString() ? `?${qs.toString()}` : "";
        const res = await callChatBotApi(
          "GET",
          `/api/external/agents/${agentId}/conversations/${conversationId}/messages${queryString}`,
        );
        return jsonResponse(res.data, res.status);
      }

      // ──────────────────────────────────────────────
      // APPOINTMENTS & USAGE
      // ──────────────────────────────────────────────
      case "get_appointments": {
        const qs = new URLSearchParams();
        if (params.page) qs.set("page", String(params.page));
        if (params.limit) qs.set("limit", String(params.limit));
        const queryString = qs.toString() ? `?${qs.toString()}` : "";
        const res = await callChatBotApi(
          "GET",
          `/api/external/agents/${agentId}/appointments${queryString}`,
        );
        return jsonResponse(res.data, res.status);
      }

      case "get_usage": {
        const res = await callChatBotApi(
          "GET",
          `/api/external/agents/${agentId}/usage`,
        );
        return jsonResponse(res.data, res.status);
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("[chat-bot-api] Unhandled error:", err);
    return jsonResponse(
      { error: "Internal server error", message: String(err) },
      500,
    );
  }
});
