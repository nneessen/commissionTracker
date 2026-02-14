// supabase/functions/slack-ip-leaderboard/index.ts
// Posts weekly IP (Issued Premium) report to configured Slack channel
//
// **IP (Issued Premium) Definition:**
// Policies that are APPROVED and PLACED/ISSUED count towards IP.
// Based on effective_date, not submit_date.
// Does NOT include pending policies that have not been issued yet.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { decrypt } from "../_shared/encryption.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface IPLeaderboardEntry {
  agent_id: string;
  agent_name: string;
  wtd_ip: number;
  wtd_policies: number;
  mtd_ip: number;
  mtd_policies: number;
}

interface AgencyIPEntry {
  agency_id: string;
  agency_name: string;
  wtd_ip: number;
  wtd_policies: number;
  mtd_ip: number;
  mtd_policies: number;
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get rank emoji
 */
function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1:
      return ":first_place_medal:";
    case 2:
      return ":second_place_medal:";
    case 3:
      return ":third_place_medal:";
    default:
      return `${rank}.`;
  }
}

/**
 * Get date range for current week
 */
function getWeekRange(): string {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

  // Get Monday of current week
  const day = et.getDay();
  const diff = et.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(et);
  monday.setDate(diff);

  // Get Sunday (today or end of week)
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const mondayStr = monday.toLocaleDateString('en-US', options);
  const sundayStr = sunday.toLocaleDateString('en-US', options);

  return `${mondayStr} - ${sundayStr}`;
}

/**
 * Build IP leaderboard message
 */
function buildIPLeaderboardMessage(
  agents: IPLeaderboardEntry[],
  agencies: AgencyIPEntry[]
): string {
  const weekRange = getWeekRange();

  let message = `:chart_with_upwards_trend: *Weekly IP Report*\n`;
  message += `:date: Week of ${weekRange}\n\n`;
  message += `*IP (Issued Premium):* Approved & placed policies count towards IP only. Pending policies not yet issued are excluded.\n\n`;
  message += `:warning: *Accuracy depends on YOU:* Update your policies from pending to approved when policies go into effect.\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Show agents with IP > 0
  const agentsWithIP = agents.filter(a => a.wtd_ip > 0);
  const agentsWithZeroIP = agents.length - agentsWithIP.length;

  if (agentsWithIP.length > 0) {
    message += `*Top Producers (WTD):*\n`;
    agentsWithIP.forEach((agent, index) => {
      const rank = index + 1;
      const emoji = getRankEmoji(rank);
      const ip = formatCurrency(agent.wtd_ip);
      const policies = agent.wtd_policies;
      const paddedIP = ip.padStart(10, ' ');
      message += `${emoji} ${paddedIP}  ·  *${agent.agent_name}*  (${policies} ${policies === 1 ? 'policy' : 'policies'})\n`;
    });
    message += `\n`;
  }

  // Show agents with zero
  if (agentsWithZeroIP > 0) {
    message += `_${agentsWithZeroIP} agent${agentsWithZeroIP === 1 ? '' : 's'} with zero IP this week_\n\n`;
  }

  // Calculate totals
  const totalWTD = agents.reduce((sum, a) => sum + a.wtd_ip, 0);
  const totalMTD = agents.reduce((sum, a) => sum + a.mtd_ip, 0);

  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `:moneybag: *Total WTD:* ${formatCurrency(totalWTD)}\n`;
  message += `:calendar: *Total MTD:* ${formatCurrency(totalMTD)}\n\n`;

  // Agency rankings
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `:office: *Agency Rankings*\n\n`;

  agencies
    .filter(a => a.mtd_ip > 0)
    .forEach(agency => {
      message += `*${agency.agency_name}:*  WTD ${formatCurrency(agency.wtd_ip)} · MTD ${formatCurrency(agency.mtd_ip)}\n`;
    });

  return message;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    console.log("[slack-ip-leaderboard] Function invoked");

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

    const body = await req.json();
    const { imoId } = body;

    if (!imoId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing imoId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get Self Made Slack integration specifically
    const { data: integrations, error: integrationError } = await supabase
      .from("slack_integrations")
      .select("*, workspace_logo_url")
      .eq("imo_id", imoId)
      .eq("is_active", true)
      .eq("connection_status", "connected")
      .ilike("team_name", "%self made%")
      .limit(1);

    const integration = integrations?.[0];

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "No active Slack integration found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check if leaderboard channel is configured
    if (!integration.leaderboard_channel_id) {
      console.log(
        "[slack-ip-leaderboard] No leaderboard channel configured",
      );
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: "No leaderboard channel configured",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get IP leaderboard data (agents with WTD IP)
    const { data: agents, error: agentsError } = await supabase.rpc(
      "get_ip_leaderboard_with_periods",
      {
        p_imo_id: imoId,
        p_agency_id: null,
      },
    );

    if (agentsError) {
      console.error(
        "[slack-ip-leaderboard] Error fetching agents:",
        agentsError,
      );
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to fetch agent data" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get agency IP totals
    const { data: agencies, error: agenciesError } = await supabase.rpc(
      "get_agencies_ip_totals",
      {
        p_imo_id: imoId,
      },
    );

    if (agenciesError) {
      console.error(
        "[slack-ip-leaderboard] Error fetching agencies:",
        agenciesError,
      );
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to fetch agency data" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!agents || agents.length === 0) {
      console.log("[slack-ip-leaderboard] No IP data available");
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: "No IP data",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build message
    const message = buildIPLeaderboardMessage(
      agents as IPLeaderboardEntry[],
      agencies as AgencyIPEntry[]
    );

    // Decrypt bot token
    const botToken = await decrypt(integration.bot_token_encrypted);

    // Build message payload
    const messagePayload: Record<string, unknown> = {
      channel: integration.leaderboard_channel_id,
      text: message,
    };

    // Use workspace logo as bot icon if configured
    if (integration.workspace_logo_url) {
      messagePayload.icon_url = integration.workspace_logo_url;
    }

    // Send to Slack
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messagePayload),
    });

    const data = await response.json();

    // Record message
    await supabase.from("slack_messages").insert({
      imo_id: imoId,
      slack_integration_id: integration.id,
      channel_id: integration.leaderboard_channel_id,
      notification_type: "ip_leaderboard",
      message_text: message,
      related_entity_type: "leaderboard",
      related_entity_id: null,
      status: data.ok ? "sent" : "failed",
      message_ts: data.ts || null,
      error_message: data.error || null,
      sent_at: data.ok ? new Date().toISOString() : null,
    });

    // Update integration status if token is invalid
    if (data.error === "token_revoked" || data.error === "invalid_auth") {
      await supabase
        .from("slack_integrations")
        .update({
          connection_status: "error",
          last_error: data.error,
        })
        .eq("id", integration.id);
    }

    const result = {
      channel: integration.leaderboard_channel_name,
      ok: data.ok,
      error: data.error,
    };

    console.log(
      `[slack-ip-leaderboard] Posted IP report to #${integration.leaderboard_channel_name}`,
    );

    return new Response(JSON.stringify({ ok: true, results: [result] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[slack-ip-leaderboard] Unexpected error:", err);
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
