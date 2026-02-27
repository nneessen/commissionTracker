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

// deno-lint-ignore no-explicit-any
function jsonResponse(data: any, status = 200): Response {
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
  // deno-lint-ignore no-explicit-any
): Promise<{ ok: boolean; status: number; data: any }> {
  const CHAT_BOT_API_URL = Deno.env.get("CHAT_BOT_API_URL");
  const CHAT_BOT_API_KEY = Deno.env.get("CHAT_BOT_API_KEY");

  if (!CHAT_BOT_API_URL || !CHAT_BOT_API_KEY) {
    throw new Error("CHAT_BOT_API_URL or CHAT_BOT_API_KEY not configured");
  }

  const url = `${CHAT_BOT_API_URL}${path}`;
  const hasBody = method !== "GET" && method !== "DELETE";
  const headers: Record<string, string> = {
    "X-API-Key": CHAT_BOT_API_KEY,
  };
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }
  const options: RequestInit = { method, headers };
  if (hasBody) {
    options.body = JSON.stringify(body || {});
  }

  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// Never return 5xx from edge function — Supabase runtime treats it as a crash (502 Bad Gateway).
function safeStatus(status: number): number {
  return status >= 500 ? 400 : status;
}

// Unwrap apiSuccess envelope: { success: true, data: <payload>, meta?: {...} } → <payload>
// deno-lint-ignore no-explicit-any
function unwrap(res: { ok: boolean; status: number; data: any }): {
  // deno-lint-ignore no-explicit-any
  payload: any;
  // deno-lint-ignore no-explicit-any
  meta: any;
  status: number;
  errorMessage: string | null;
} {
  if (!res.ok || res.data?.success === false) {
    const errObj = res.data?.error;
    const msg =
      typeof errObj === "string"
        ? errObj
        : errObj?.message || "Unknown API error";
    return {
      payload: null,
      meta: null,
      status: safeStatus(res.status),
      errorMessage: msg,
    };
  }
  return {
    payload: res.data?.data ?? res.data,
    meta: res.data?.meta ?? null,
    status: safeStatus(res.status),
    errorMessage: null,
  };
}

// deno-lint-ignore no-explicit-any
function sendResult(res: { ok: boolean; status: number; data: any }): Response {
  const { payload, status, errorMessage } = unwrap(res);
  if (errorMessage) {
    return jsonResponse({ error: errorMessage }, status);
  }
  return jsonResponse(payload, status);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Parse body once upfront (avoids stream-consumed issues)
    const body = await req.json().catch(() => ({}));
    const { action, ...params } = body;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Authenticate user via JWT (deploy WITHOUT --no-verify-jwt so the full token passes through)
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s*/i, "").trim();
    if (!token) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
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

    switch (action) {
      // ──────────────────────────────────────────────
      // AGENT STATUS & CONFIG
      // ──────────────────────────────────────────────
      case "get_agent": {
        const res = await callChatBotApi(
          "GET",
          `/api/external/agents/${agentId}`,
        );
        const { payload, status, errorMessage } = unwrap(res);
        if (errorMessage) {
          return jsonResponse({ error: errorMessage }, status);
        }

        // Transform: flatten agent + reshape connections
        const agentData = payload.agent || {};
        const closeConn = payload.connections?.close;
        const calendlyConn = payload.connections?.calendly;

        return jsonResponse({
          id: agentData.id,
          name: agentData.name,
          botEnabled: agentData.botEnabled ?? false,
          timezone: agentData.timezone ?? "America/New_York",
          isActive: agentData.isActive ?? true,
          createdAt: agentData.createdAt,
          autoOutreachLeadSources: agentData.autoOutreachLeadSources || [],
          allowedLeadStatuses: agentData.allowedLeadStatuses || [],
          calendlyEventTypeSlug: agentData.calendlyEventTypeSlug || null,
          leadSourceEventTypeMappings:
            agentData.leadSourceEventTypeMappings || [],
          connections: {
            close: closeConn
              ? { connected: true, orgName: closeConn.orgId || undefined }
              : { connected: false },
            calendly: calendlyConn
              ? {
                  connected: true,
                  eventType: calendlyConn.calendarId || undefined,
                }
              : { connected: false },
          },
        });
      }

      case "get_status": {
        const res = await callChatBotApi(
          "GET",
          `/api/external/agents/${agentId}/status`,
        );
        return sendResult(res);
      }

      case "update_config": {
        const res = await callChatBotApi(
          "PATCH",
          `/api/external/agents/${agentId}`,
          params,
        );
        return sendResult(res);
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
        return sendResult(res);
      }

      case "disconnect_close": {
        const res = await callChatBotApi(
          "DELETE",
          `/api/external/agents/${agentId}/connections/close`,
        );
        return sendResult(res);
      }

      case "get_close_status": {
        const res = await callChatBotApi(
          "GET",
          `/api/external/agents/${agentId}/connections/close`,
        );
        if (!res.ok) {
          return jsonResponse({ connected: false });
        }
        const { payload } = unwrap(res);
        return jsonResponse({
          connected: true,
          orgName: payload?.orgId || undefined,
        });
      }

      // ──────────────────────────────────────────────
      // CALENDLY CONNECTION
      // ──────────────────────────────────────────────
      case "get_calendly_auth_url": {
        const returnUrl = params.returnUrl || "";
        console.log(
          "[get_calendly_auth_url] agentId:",
          agentId,
          "returnUrl:",
          returnUrl,
        );
        const res = await callChatBotApi(
          "GET",
          `/api/external/agents/${agentId}/calendly/authorize?returnUrl=${encodeURIComponent(returnUrl)}`,
        );
        console.log(
          "[get_calendly_auth_url] API response ok:",
          res.ok,
          "status:",
          res.status,
          "data:",
          JSON.stringify(res.data).slice(0, 200),
        );
        const { payload, status, errorMessage } = unwrap(res);
        if (errorMessage) {
          console.error("[get_calendly_auth_url] error:", errorMessage);
          return jsonResponse({ error: errorMessage }, status);
        }
        console.log(
          "[get_calendly_auth_url] returning url:",
          payload?.url?.slice(0, 80),
        );
        return jsonResponse({ url: payload.url });
      }

      case "disconnect_calendly": {
        const res = await callChatBotApi(
          "DELETE",
          `/api/external/agents/${agentId}/connections/calendly`,
        );
        return sendResult(res);
      }

      case "get_calendly_status": {
        const res = await callChatBotApi(
          "GET",
          `/api/external/agents/${agentId}/connections/calendly`,
        );
        if (!res.ok) {
          return jsonResponse({ connected: false });
        }
        const { payload } = unwrap(res);
        return jsonResponse({
          connected: true,
          eventType: payload?.calendarId ? "Connected" : undefined,
          userName: payload?.userName || undefined,
          userEmail: payload?.userEmail || undefined,
        });
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
        const { payload, meta, status, errorMessage } = unwrap(res);
        if (errorMessage) {
          return jsonResponse({ error: errorMessage }, status);
        }
        const pagination = meta?.pagination || {};
        return jsonResponse({
          data: Array.isArray(payload) ? payload : [],
          total: pagination.total ?? 0,
          page: pagination.page ?? 1,
          limit: pagination.limit ?? 20,
        });
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
        const { payload, meta, status, errorMessage } = unwrap(res);
        if (errorMessage) {
          return jsonResponse({ error: errorMessage }, status);
        }
        const pagination = meta?.pagination || {};
        return jsonResponse({
          data: Array.isArray(payload) ? payload : [],
          total: pagination.total ?? 0,
          page: pagination.page ?? 1,
          limit: pagination.limit ?? 50,
        });
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
        const { payload, meta, status, errorMessage } = unwrap(res);
        if (errorMessage) {
          return jsonResponse({ error: errorMessage }, status);
        }
        const pagination = meta?.pagination || {};
        return jsonResponse({
          data: Array.isArray(payload) ? payload : [],
          total: pagination.total ?? 0,
          page: pagination.page ?? 1,
          limit: pagination.limit ?? 20,
        });
      }

      case "get_usage": {
        const res = await callChatBotApi(
          "GET",
          `/api/external/agents/${agentId}/usage`,
        );
        const { payload, status, errorMessage } = unwrap(res);
        if (errorMessage) {
          return jsonResponse({ error: errorMessage }, status);
        }
        return jsonResponse({
          leadsUsed: payload?.leadCount ?? 0,
          leadLimit: payload?.leadLimit ?? 0,
          periodStart: payload?.periodStart ?? null,
          periodEnd: payload?.periodEnd ?? null,
          tierName: payload?.planName || "Free",
        });
      }

      case "get_calendly_event_types": {
        const res = await callChatBotApi(
          "GET",
          `/api/external/agents/${agentId}/calendly/event-types`,
        );
        const { payload, status, errorMessage } = unwrap(res);
        if (errorMessage) {
          return jsonResponse({ error: errorMessage }, status);
        }
        return jsonResponse(Array.isArray(payload) ? payload : []);
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
