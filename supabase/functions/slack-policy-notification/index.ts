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
 * Format date - short format (e.g., "Dec 25, 2025")
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
 * Format date - compact format (e.g., "12/25/2025")
 */
function formatDateCompact(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Build compact message text for additional channels
 * Format: "$1,200 Carrier/Product 12/25/2025"
 */
function buildCompactPolicyText(
  annualPremium: number,
  carrierName: string,
  productName: string,
  effectiveDate: string,
): string {
  return `${formatCurrency(annualPremium)} ${carrierName}/${productName} ${formatDateCompact(effectiveDate)}`;
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

    // Get Slack integration with channel settings (for OAuth-based posting)
    const { data: integration, error: integrationError } = await supabase
      .from("slack_integrations")
      .select("*")
      .eq("imo_id", imoId)
      .eq("is_active", true)
      .eq("connection_status", "connected")
      .maybeSingle();

    // Get webhooks (for non-OAuth multi-workspace posting)
    const { data: webhooks } = await supabase
      .from("slack_webhooks")
      .select("*")
      .eq("imo_id", imoId)
      .eq("is_active", true)
      .eq("notifications_enabled", true);

    const hasOAuthIntegration =
      !integrationError && integration && integration.policy_channel_id;
    const hasWebhooks = webhooks && webhooks.length > 0;

    // Skip if no OAuth integration AND no webhooks
    if (!hasOAuthIntegration && !hasWebhooks) {
      console.log(
        "[slack-policy-notification] No active Slack integration or webhooks for IMO:",
        imoId,
      );
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: "No active integration or webhooks",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch additional data including user preferences
    const [agentResult, carrierResult, productResult, userPrefsResult] =
      await Promise.all([
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
        // Fetch user's Slack preferences for additional channels (multi-workspace format)
        supabase
          .from("user_slack_preferences")
          .select("policy_post_channels, auto_post_enabled")
          .eq("user_id", agentId)
          .eq("imo_id", imoId)
          .maybeSingle(),
      ]);

    const agentName = agentResult.data
      ? `${agentResult.data.first_name || ""} ${agentResult.data.last_name || ""}`.trim() ||
        agentResult.data.email
      : "Unknown Agent";

    const carrierName = carrierResult.data?.name || "Unknown Carrier";
    const productName = productResult.data?.name || "Unknown Product";

    // Get user's additional channels and auto-post setting (multi-workspace format)
    const userPrefs = userPrefsResult.data;
    const autoPostEnabled = userPrefs?.auto_post_enabled ?? true;

    // policy_post_channels is JSONB: [{ integration_id, channel_id, channel_name }, ...]
    interface PolicyPostChannel {
      integration_id: string;
      channel_id: string;
      channel_name: string;
    }
    const policyPostChannels: PolicyPostChannel[] =
      (userPrefs?.policy_post_channels as PolicyPostChannel[]) ?? [];

    // Filter to only channels for the current integration
    const additionalChannelIds: string[] = policyPostChannels
      .filter((c) => c.integration_id === integration.id)
      .map((c) => c.channel_id);

    // If user has disabled auto-posting, skip entirely
    if (!autoPostEnabled) {
      console.log(
        "[slack-policy-notification] Auto-post disabled for user:",
        agentId,
      );
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: "User has disabled auto-posting",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch production data (needed for leaderboard in both OAuth and webhooks)
    let production: LeaderboardEntry[] = [];
    const { data: prodData } = await supabase.rpc(
      "get_agency_production_by_agent",
      {
        p_agency_id: agencyId || null,
      },
    );
    if (prodData && prodData.length > 0) {
      production = prodData;
    }

    // Initialize result tracking
    let result = {
      channel: null as string | null,
      policyNotification: false,
      error: null as string | null,
      leaderboard: false,
    };
    const additionalResults: Array<{ channelId: string; ok: boolean }> = [];

    // =========================================================================
    // OAuth-based posting (if configured)
    // =========================================================================
    if (hasOAuthIntegration && integration) {
      // Decrypt bot token
      const botToken = await decrypt(integration.bot_token_encrypted);

      // Build policy notification blocks using integration settings
      const policyBlocks = buildPolicyNotificationBlocks(
        agentName,
        annualPremium,
        carrierName,
        productName,
        effectiveDate || new Date().toISOString(),
        policyNumber || "N/A",
        integration.include_client_info || false,
        clientName,
      );

      // Send policy notification to the configured channel
      const policyResponse = await fetch(
        "https://slack.com/api/chat.postMessage",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channel: integration.policy_channel_id,
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
        channel_id: integration.policy_channel_id,
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

      result = {
        channel: integration.policy_channel_name,
        policyNotification: policyData.ok,
        error: policyData.error,
        leaderboard: false,
      };

      // Post leaderboard if configured
      if (
        integration.include_leaderboard_with_policy !== false &&
        production.length > 0
      ) {
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

        // Send leaderboard in thread under policy notification
        const leaderboardResponse = await fetch(
          "https://slack.com/api/chat.postMessage",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              channel: integration.policy_channel_id,
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
          channel_id: integration.policy_channel_id,
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

        result.leaderboard = leaderboardData.ok;
      }

      console.log(
        `[slack-policy-notification] Sent notification to #${integration.policy_channel_name}`,
      );

      // Post to user's additional channels with compact format
      if (additionalChannelIds.length > 0) {
        const compactText = buildCompactPolicyText(
          annualPremium,
          carrierName,
          productName,
          effectiveDate || new Date().toISOString(),
        );

        for (const channelId of additionalChannelIds) {
          // Skip if same as master channel
          if (channelId === integration.policy_channel_id) {
            continue;
          }

          try {
            const additionalResponse = await fetch(
              "https://slack.com/api/chat.postMessage",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${botToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  channel: channelId,
                  text: compactText,
                }),
              },
            );

            const additionalData = await additionalResponse.json();

            // Record message
            await supabase.from("slack_messages").insert({
              imo_id: imoId,
              slack_integration_id: integration.id,
              channel_id: channelId,
              notification_type: "policy_created",
              message_blocks: null,
              message_text: compactText,
              related_entity_type: "policy",
              related_entity_id: policyId,
              status: additionalData.ok ? "sent" : "failed",
              message_ts: additionalData.ts || null,
              error_message: additionalData.error || null,
              sent_at: additionalData.ok ? new Date().toISOString() : null,
            });

            additionalResults.push({ channelId, ok: additionalData.ok });

            if (additionalData.ok) {
              console.log(
                `[slack-policy-notification] Sent compact notification to channel ${channelId}`,
              );
            }
          } catch (err) {
            console.error(
              `[slack-policy-notification] Failed to post to channel ${channelId}:`,
              err,
            );
            additionalResults.push({ channelId, ok: false });
          }
        }
      }
    } // End of OAuth section (hasOAuthIntegration)

    // =========================================================================
    // POST TO WEBHOOKS (multi-workspace support, no OAuth needed)
    // =========================================================================
    const webhookResults: Array<{
      webhookId: string;
      channelName: string;
      ok: boolean;
      error?: string;
    }> = [];

    if (hasWebhooks && webhooks && webhooks.length > 0) {
      console.log(
        `[slack-policy-notification] Found ${webhooks.length} active webhooks`,
      );

      for (const webhook of webhooks) {
        try {
          // Build message blocks for this webhook based on its settings
          const webhookBlocks = buildPolicyNotificationBlocks(
            agentName,
            annualPremium,
            carrierName,
            productName,
            effectiveDate || new Date().toISOString(),
            policyNumber || "N/A",
            webhook.include_client_info || false,
            clientName,
          );

          // Post to webhook
          const webhookResponse = await fetch(webhook.webhook_url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: `New Policy Sold! ${agentName} - ${formatCurrency(annualPremium)}`,
              blocks: webhookBlocks,
            }),
          });

          const webhookOk = webhookResponse.ok;
          webhookResults.push({
            webhookId: webhook.id,
            channelName: webhook.channel_name,
            ok: webhookOk,
            error: webhookOk ? undefined : `HTTP ${webhookResponse.status}`,
          });

          if (webhookOk) {
            console.log(
              `[slack-policy-notification] Posted to webhook: ${webhook.channel_name} (${webhook.workspace_name || "unknown workspace"})`,
            );

            // Post leaderboard as follow-up if enabled
            if (
              webhook.include_leaderboard &&
              production &&
              production.length > 0
            ) {
              const leaderboardBlocks = buildLeaderboardBlocks(
                production
                  .sort(
                    (a: LeaderboardEntry, b: LeaderboardEntry) =>
                      b.total_annual_premium - a.total_annual_premium,
                  )
                  .slice(0, 10),
                production.reduce(
                  (sum: number, entry: LeaderboardEntry) =>
                    sum + (entry.total_annual_premium || 0),
                  0,
                ),
              );

              await fetch(webhook.webhook_url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  text: "Daily Sales Leaderboard",
                  blocks: leaderboardBlocks,
                }),
              });
            }
          }
        } catch (err) {
          console.error(
            `[slack-policy-notification] Webhook error for ${webhook.channel_name}:`,
            err,
          );
          webhookResults.push({
            webhookId: webhook.id,
            channelName: webhook.channel_name,
            ok: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        results: [result],
        additionalChannels: additionalResults,
        webhooks: webhookResults,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
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
