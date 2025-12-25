// supabase/functions/slack-policy-notification/index.ts
// Handles policy creation events and posts notifications + leaderboard to Slack

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { decrypt } from "../_shared/encryption.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface PolicyNotificationPayload {
  policyId: string;
  policyNumber?: string;
  carrierId?: string;
  productId?: string;
  agentId: string;
  clientName?: string;
  annualPremium: number;
  effectiveDate?: string;
  status?: string;
  imoId: string;
  agencyId?: string;
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  elements?: Array<{
    type: string;
    text: string;
  }>;
}

interface LeaderboardEntry {
  agent_id: string;
  agent_name: string;
  agent_email: string;
  total_annual_premium: number;
  active_policies: number;
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
 * Format date
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
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
 * Build policy notification blocks
 */
function buildPolicyNotificationBlocks(
  agentName: string,
  annualPremium: number,
  carrierName: string,
  productName: string,
  effectiveDate: string,
  policyNumber: string,
  includeClientInfo: boolean,
  clientName?: string,
): SlackBlock[] {
  const fields: Array<{ type: string; text: string }> = [
    {
      type: "mrkdwn",
      text: `*Agent:*\n${agentName}`,
    },
    {
      type: "mrkdwn",
      text: `*Annual Premium:*\n${formatCurrency(annualPremium)}`,
    },
    {
      type: "mrkdwn",
      text: `*Carrier:*\n${carrierName}`,
    },
    {
      type: "mrkdwn",
      text: `*Product:*\n${productName}`,
    },
    {
      type: "mrkdwn",
      text: `*Effective Date:*\n${formatDate(effectiveDate)}`,
    },
    {
      type: "mrkdwn",
      text: `*Policy #:*\n${policyNumber}`,
    },
  ];

  if (includeClientInfo && clientName) {
    fields.push({
      type: "mrkdwn",
      text: `*Client:*\n${clientName}`,
    });
  }

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "New Policy Sold!",
        emoji: true,
      },
    },
    {
      type: "section",
      fields,
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Posted by Commission Tracker at ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}`,
        },
      ],
    },
  ];

  return blocks;
}

/**
 * Build leaderboard blocks
 */
function buildLeaderboardBlocks(
  entries: LeaderboardEntry[],
  agencyTotal: number,
): SlackBlock[] {
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Build leaderboard text
  const leaderboardLines = entries
    .slice(0, 10)
    .map((entry, index) => {
      const rank = index + 1;
      const emoji = getRankEmoji(rank);
      const name = entry.agent_name || entry.agent_email.split("@")[0];
      const premium = formatCurrency(entry.total_annual_premium);
      const policies = entry.active_policies;
      return `${emoji} *${name}* - ${premium} (${policies} ${policies === 1 ? "policy" : "policies"})`;
    })
    .join("\n");

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Daily Sales Leaderboard",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Top Performers - ${today}*`,
      },
    },
    {
      type: "divider",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: leaderboardLines || "_No sales recorded yet_",
      },
    },
    {
      type: "divider",
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `*Total Agency Production:* ${formatCurrency(agencyTotal)}`,
        },
      ],
    },
  ];

  return blocks;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    console.log("[slack-policy-notification] Function invoked");

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

    const body: PolicyNotificationPayload = await req.json();
    const {
      policyId,
      policyNumber,
      carrierId,
      productId,
      agentId,
      clientName,
      annualPremium,
      effectiveDate,
      imoId,
      agencyId,
    } = body;

    if (!imoId || !policyId || !agentId) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing required fields: imoId, policyId, agentId",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get Slack integration
    const { data: integration, error: integrationError } = await supabase
      .from("slack_integrations")
      .select("*")
      .eq("imo_id", imoId)
      .eq("is_active", true)
      .eq("connection_status", "connected")
      .maybeSingle();

    if (integrationError || !integration) {
      console.log(
        "[slack-policy-notification] No active Slack integration for IMO:",
        imoId,
      );
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: "No active integration",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get channel configs for policy_created
    const { data: channelConfigs, error: configError } = await supabase
      .from("slack_channel_configs")
      .select("*")
      .eq("imo_id", imoId)
      .eq("notification_type", "policy_created")
      .eq("is_active", true);

    if (configError || !channelConfigs || channelConfigs.length === 0) {
      console.log(
        "[slack-policy-notification] No channel configs for policy notifications",
      );
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: "No channel configs",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Filter configs for this agency (or global configs)
    const relevantConfigs = channelConfigs.filter(
      (config) => config.agency_id === agencyId || config.agency_id === null,
    );

    if (relevantConfigs.length === 0) {
      console.log(
        "[slack-policy-notification] No relevant channel configs for agency:",
        agencyId,
      );
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: "No configs for agency",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch additional data
    const [agentResult, carrierResult, productResult] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("first_name, last_name, email")
        .eq("id", agentId)
        .maybeSingle(),
      carrierId
        ? supabase
            .from("carriers")
            .select("name")
            .eq("id", carrierId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      productId
        ? supabase
            .from("products")
            .select("name")
            .eq("id", productId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const agentName = agentResult.data
      ? `${agentResult.data.first_name || ""} ${agentResult.data.last_name || ""}`.trim() ||
        agentResult.data.email
      : "Unknown Agent";

    const carrierName = carrierResult.data?.name || "Unknown Carrier";
    const productName = productResult.data?.name || "Unknown Product";

    // Decrypt bot token
    const botToken = await decrypt(integration.bot_token_encrypted);

    // Send notifications to each configured channel
    const results = [];

    for (const config of relevantConfigs) {
      // Check filter config (e.g., min premium)
      const filterConfig = config.filter_config || {};
      if (
        filterConfig.min_premium &&
        annualPremium < filterConfig.min_premium
      ) {
        console.log(
          `[slack-policy-notification] Skipping channel ${config.channel_name}: premium ${annualPremium} < min ${filterConfig.min_premium}`,
        );
        continue;
      }

      // Build policy notification blocks
      const policyBlocks = buildPolicyNotificationBlocks(
        agentName,
        annualPremium,
        carrierName,
        productName,
        effectiveDate || new Date().toISOString(),
        policyNumber || "N/A",
        config.include_client_info || false,
        clientName,
      );

      // Send policy notification
      const policyResponse = await fetch(
        "https://slack.com/api/chat.postMessage",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channel: config.channel_id,
            text: `New Policy Sold! ${agentName} - ${formatCurrency(annualPremium)}`,
            blocks: policyBlocks,
          }),
        },
      );

      const policyData = await policyResponse.json();

      // Record message
      await supabase.from("slack_messages").insert({
        imo_id: imoId,
        slack_integration_id: integration.id,
        channel_config_id: config.id,
        channel_id: config.channel_id,
        notification_type: "policy_created",
        message_blocks: policyBlocks,
        message_text: `New Policy Sold! ${agentName} - ${formatCurrency(annualPremium)}`,
        related_entity_type: "policy",
        related_entity_id: policyId,
        status: policyData.ok ? "sent" : "failed",
        message_ts: policyData.ts || null,
        error_message: policyData.error || null,
        sent_at: policyData.ok ? new Date().toISOString() : null,
      });

      results.push({
        channel: config.channel_name,
        policyNotification: policyData.ok,
        error: policyData.error,
      });

      // Post leaderboard if configured
      if (config.include_leaderboard) {
        // Get agency production data
        const { data: production, error: prodError } = await supabase.rpc(
          "get_agency_production_by_agent",
          {
            p_agency_id: agencyId || null,
          },
        );

        if (!prodError && production && production.length > 0) {
          // Sort by total premium
          const sortedProduction = production
            .sort(
              (a: LeaderboardEntry, b: LeaderboardEntry) =>
                b.total_annual_premium - a.total_annual_premium,
            )
            .slice(0, 10);

          const agencyTotal = production.reduce(
            (sum: number, entry: LeaderboardEntry) =>
              sum + (entry.total_annual_premium || 0),
            0,
          );

          const leaderboardBlocks = buildLeaderboardBlocks(
            sortedProduction,
            agencyTotal,
          );

          // Send leaderboard in thread or as separate message
          const leaderboardResponse = await fetch(
            "https://slack.com/api/chat.postMessage",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${botToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                channel: config.channel_id,
                text: "Daily Sales Leaderboard",
                blocks: leaderboardBlocks,
                thread_ts: policyData.ts, // Post in thread under policy notification
              }),
            },
          );

          const leaderboardData = await leaderboardResponse.json();

          // Record leaderboard message
          await supabase.from("slack_messages").insert({
            imo_id: imoId,
            slack_integration_id: integration.id,
            channel_config_id: config.id,
            channel_id: config.channel_id,
            notification_type: "daily_leaderboard",
            message_blocks: leaderboardBlocks,
            message_text: "Daily Sales Leaderboard",
            related_entity_type: "leaderboard",
            related_entity_id: null,
            status: leaderboardData.ok ? "sent" : "failed",
            message_ts: leaderboardData.ts || null,
            thread_ts: policyData.ts || null,
            error_message: leaderboardData.error || null,
            sent_at: leaderboardData.ok ? new Date().toISOString() : null,
          });

          results[results.length - 1].leaderboard = leaderboardData.ok;
        }
      }
    }

    console.log(
      `[slack-policy-notification] Sent notifications to ${results.length} channels`,
    );

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[slack-policy-notification] Unexpected error:", err);
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
