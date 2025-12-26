// supabase/functions/slack-policy-notification/index.ts
// Posts simplified policy notifications and updates daily leaderboard in Slack

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

interface DailyProductionEntry {
  agent_id: string;
  agent_name: string;
  agent_email: string;
  slack_member_id: string | null;
  total_annual_premium: number;
  policy_count: number;
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
 * Format date - compact (e.g., "12/26")
 */
function formatDateCompact(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format product type enum to readable name
 * e.g., "whole_life" -> "Whole Life"
 */
function formatProductType(productType: string): string {
  if (!productType) return "Life";
  return productType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get rank emoji for leaderboard
 */
function getRankDisplay(rank: number): string {
  switch (rank) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return `${rank}.`;
  }
}

/**
 * Get default title based on day of week
 */
function getDefaultDailyTitle(): string {
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const today = new Date();
  const dayName = dayNames[today.getDay()];

  const titles: Record<string, string> = {
    Monday: "Manic Monday Sales",
    Tuesday: "Terrific Tuesday Sales",
    Wednesday: "Winner Wednesday Sales",
    Thursday: "Thrilling Thursday Sales",
    Friday: "Fantastic Friday Sales",
    Saturday: "Super Saturday Sales",
    Sunday: "Stellar Sunday Sales",
  };

  return titles[dayName] || `${dayName} Sales`;
}

/**
 * Look up Slack member ID by email
 */
async function lookupSlackMemberByEmail(
  botToken: string,
  email: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${botToken}`,
        },
      },
    );

    const data = await response.json();
    if (data.ok && data.user) {
      return data.user.id;
    }
    return null;
  } catch (err) {
    console.error("[slack-policy-notification] Error looking up user:", err);
    return null;
  }
}

/**
 * Build the simple policy notification text
 * Format: $1,200 Carrier Product Eff Date: 12/26 @slackuser
 */
function buildSimplePolicyText(
  annualPremium: number,
  carrierName: string,
  productName: string,
  effectiveDate: string,
  slackMemberId: string | null,
  agentName: string,
): string {
  const ap = formatCurrency(annualPremium);
  const date = formatDateCompact(effectiveDate);

  // Use @mention if we have slack_member_id, otherwise just name
  const userDisplay = slackMemberId ? `<@${slackMemberId}>` : agentName;

  return `${ap} ${carrierName} ${productName} Eff Date: ${date} ${userDisplay}`;
}

/**
 * Build the daily leaderboard text (simple text format)
 */
function buildLeaderboardText(
  title: string,
  entries: DailyProductionEntry[],
  totalAP: number,
): string {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  let text = `*${title}*\n_${today}_\n\n`;

  if (entries.length === 0) {
    text += "_No sales yet today_\n";
  } else {
    entries.forEach((entry, index) => {
      const rank = index + 1;
      const rankDisplay = getRankDisplay(rank);
      const ap = formatCurrency(entry.total_annual_premium);
      const policies = entry.policy_count;
      const policyText = policies === 1 ? "policy" : "policies";

      // Use @mention if available
      const nameDisplay = entry.slack_member_id
        ? `<@${entry.slack_member_id}>`
        : entry.agent_name;

      text += `${rankDisplay} ${nameDisplay} - ${ap} (${policies} ${policyText})\n`;
    });
  }

  text += `\n*Total: ${formatCurrency(totalAP)}*`;

  return text;
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
      carrierId,
      productId,
      agentId,
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

    // =========================================================================
    // Get Slack integrations for the agency hierarchy
    // =========================================================================
    interface HierarchyIntegration {
      integration_id: string;
      agency_id: string | null;
      agency_name: string;
      team_id: string;
      team_name: string;
      display_name: string;
      policy_channel_id: string;
      policy_channel_name: string;
      include_client_info: boolean;
      include_leaderboard: boolean;
      hierarchy_depth: number;
    }

    let hierarchyIntegrations: HierarchyIntegration[] = [];

    if (agencyId) {
      const { data: hierarchyData, error: hierarchyError } = await supabase.rpc(
        "get_slack_integrations_for_agency_hierarchy",
        { p_agency_id: agencyId },
      );

      if (hierarchyError) {
        console.error(
          "[slack-policy-notification] Error fetching hierarchy:",
          hierarchyError,
        );
      } else {
        hierarchyIntegrations = hierarchyData || [];
      }
    } else {
      // Fall back to IMO-level integration
      const { data: imoIntegration } = await supabase
        .from("slack_integrations")
        .select(
          "id, agency_id, team_id, team_name, display_name, policy_channel_id, policy_channel_name, include_client_info, include_leaderboard_with_policy",
        )
        .eq("imo_id", imoId)
        .is("agency_id", null)
        .eq("is_active", true)
        .eq("connection_status", "connected")
        .not("policy_channel_id", "is", null)
        .maybeSingle();

      if (imoIntegration) {
        hierarchyIntegrations = [
          {
            integration_id: imoIntegration.id,
            agency_id: null,
            agency_name: "IMO-Level",
            team_id: imoIntegration.team_id,
            team_name: imoIntegration.team_name,
            display_name: imoIntegration.display_name,
            policy_channel_id: imoIntegration.policy_channel_id,
            policy_channel_name: imoIntegration.policy_channel_name,
            include_client_info: imoIntegration.include_client_info || false,
            include_leaderboard:
              imoIntegration.include_leaderboard_with_policy || false,
            hierarchy_depth: 999,
          },
        ];
      }
    }

    if (hierarchyIntegrations.length === 0) {
      console.log(
        "[slack-policy-notification] No active Slack integrations for IMO:",
        imoId,
      );
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: "No active integrations",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // =========================================================================
    // Fetch policy details (including product enum), agent, carrier, product
    // =========================================================================
    const [
      policyResult,
      agentResult,
      carrierResult,
      productResult,
      slackPrefsResult,
    ] = await Promise.all([
      // Get the policy to access the 'product' enum field
      supabase
        .from("policies")
        .select("product, product_id")
        .eq("id", policyId)
        .maybeSingle(),
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
      supabase
        .from("user_slack_preferences")
        .select("slack_member_id, auto_post_enabled")
        .eq("user_id", agentId)
        .eq("imo_id", imoId)
        .maybeSingle(),
    ]);

    const agentName = agentResult.data
      ? `${agentResult.data.first_name || ""} ${agentResult.data.last_name || ""}`.trim() ||
        agentResult.data.email
      : "Unknown";
    const agentEmail = agentResult.data?.email || null;

    const carrierName = carrierResult.data?.name || "Unknown";

    // Product name: prefer products table, fall back to policy.product enum
    let productName = productResult.data?.name;
    if (!productName && policyResult.data?.product) {
      productName = formatProductType(policyResult.data.product);
    }
    if (!productName) {
      productName = "Life";
    }

    let agentSlackMemberId = slackPrefsResult.data?.slack_member_id || null;
    const autoPostEnabled = slackPrefsResult.data?.auto_post_enabled ?? true;

    if (!autoPostEnabled) {
      console.log(
        "[slack-policy-notification] Auto-post disabled for user:",
        agentId,
      );
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: "User disabled auto-posting",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // =========================================================================
    // Post to each Slack workspace in the hierarchy
    // =========================================================================
    const results: Array<{
      integrationId: string;
      teamName: string;
      channelName: string;
      policyOk: boolean;
      leaderboardOk: boolean;
      isFirstSale: boolean;
      error: string | null;
    }> = [];

    for (const integration of hierarchyIntegrations) {
      try {
        // Get bot token
        const { data: fullIntegration } = await supabase
          .from("slack_integrations")
          .select("bot_token_encrypted")
          .eq("id", integration.integration_id)
          .single();

        if (!fullIntegration) {
          results.push({
            integrationId: integration.integration_id,
            teamName: integration.team_name,
            channelName: integration.policy_channel_name,
            policyOk: false,
            leaderboardOk: false,
            isFirstSale: false,
            error: "Failed to fetch integration",
          });
          continue;
        }

        const botToken = await decrypt(fullIntegration.bot_token_encrypted);

        // =====================================================================
        // Look up Slack member ID if not already set
        // =====================================================================
        if (!agentSlackMemberId && agentEmail) {
          const lookedUpId = await lookupSlackMemberByEmail(
            botToken,
            agentEmail,
          );
          if (lookedUpId) {
            agentSlackMemberId = lookedUpId;
            // Save it for future use
            await supabase.from("user_slack_preferences").upsert(
              {
                user_id: agentId,
                imo_id: imoId,
                slack_member_id: lookedUpId,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: "user_id,imo_id",
              },
            );
            console.log(
              `[slack-policy-notification] Saved Slack member ID for ${agentEmail}: ${lookedUpId}`,
            );
          }
        }

        // Build the simple policy notification text
        const policyText = buildSimplePolicyText(
          annualPremium,
          carrierName,
          productName,
          effectiveDate || new Date().toISOString(),
          agentSlackMemberId,
          agentName,
        );

        // =====================================================================
        // Post simple policy notification
        // =====================================================================
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
              text: policyText,
            }),
          },
        );

        const policyData = await policyResponse.json();

        // =====================================================================
        // Handle daily leaderboard
        // =====================================================================
        let leaderboardOk = false;
        let isFirstSale = false;

        // Check if there's already a daily log for today
        const todayDate = new Date().toISOString().split("T")[0];
        const { data: existingLog } = await supabase
          .from("daily_sales_logs")
          .select("*")
          .eq("imo_id", imoId)
          .eq("slack_integration_id", integration.integration_id)
          .eq("channel_id", integration.policy_channel_id)
          .eq("log_date", todayDate)
          .maybeSingle();

        // Get today's production for leaderboard
        const { data: productionData } = await supabase.rpc(
          "get_daily_production_by_agent",
          {
            p_imo_id: imoId,
            p_agency_id: agencyId || null,
          },
        );

        const production: DailyProductionEntry[] = productionData || [];
        const totalAP = production.reduce(
          (sum, e) => sum + (e.total_annual_premium || 0),
          0,
        );

        if (!existingLog) {
          // First sale of the day - create new leaderboard
          isFirstSale = true;
          const dailyTitle = getDefaultDailyTitle();
          const leaderboardText = buildLeaderboardText(
            dailyTitle,
            production,
            totalAP,
          );

          // Post leaderboard as a new message
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
                text: leaderboardText,
              }),
            },
          );

          const leaderboardData = await leaderboardResponse.json();
          leaderboardOk = leaderboardData.ok;

          // Save the daily log with message_ts for future updates
          let savedLogId: string | null = null;
          if (leaderboardData.ok) {
            const { data: insertedLog } = await supabase
              .from("daily_sales_logs")
              .insert({
                imo_id: imoId,
                slack_integration_id: integration.integration_id,
                channel_id: integration.policy_channel_id,
                log_date: todayDate,
                title: dailyTitle,
                first_seller_id: agentId,
                leaderboard_message_ts: leaderboardData.ts,
              })
              .select("id")
              .single();

            savedLogId = insertedLog?.id || null;

            // Notify the first seller they can name the leaderboard
            const appUrl =
              Deno.env.get("APP_URL") || "https://www.thestandardhq.com";
            const nameUrl = savedLogId
              ? `${appUrl}/slack/name-leaderboard?logId=${savedLogId}`
              : `${appUrl}/slack/name-leaderboard`;

            // Post a message telling the first seller they can name the leaderboard
            const firstSaleNotice = agentSlackMemberId
              ? `Congrats <@${agentSlackMemberId}> - you're the first sale of the day! Want to name today's leaderboard? <${nameUrl}|Click here to give it a name>`
              : `Congrats ${agentName} - you're the first sale of the day! Want to name today's leaderboard? <${nameUrl}|Click here to give it a name>`;

            await fetch("https://slack.com/api/chat.postMessage", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${botToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                channel: integration.policy_channel_id,
                text: firstSaleNotice,
              }),
            });
          }
        } else {
          // Update existing leaderboard
          const leaderboardText = buildLeaderboardText(
            existingLog.title || getDefaultDailyTitle(),
            production,
            totalAP,
          );

          if (existingLog.leaderboard_message_ts) {
            // Update the existing message
            const updateResponse = await fetch(
              "https://slack.com/api/chat.update",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${botToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  channel: integration.policy_channel_id,
                  ts: existingLog.leaderboard_message_ts,
                  text: leaderboardText,
                }),
              },
            );

            const updateData = await updateResponse.json();
            leaderboardOk = updateData.ok;

            if (!updateData.ok) {
              console.error(
                "[slack-policy-notification] Failed to update leaderboard:",
                updateData.error,
              );
            }
          } else {
            // No message_ts stored, post new message
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
                  text: leaderboardText,
                }),
              },
            );

            const leaderboardData = await leaderboardResponse.json();
            leaderboardOk = leaderboardData.ok;

            // Update the log with new message_ts
            if (leaderboardData.ok) {
              await supabase
                .from("daily_sales_logs")
                .update({
                  leaderboard_message_ts: leaderboardData.ts,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingLog.id);
            }
          }
        }

        results.push({
          integrationId: integration.integration_id,
          teamName: integration.team_name,
          channelName: integration.policy_channel_name,
          policyOk: policyData.ok,
          leaderboardOk,
          isFirstSale,
          error: policyData.error || null,
        });

        console.log(
          `[slack-policy-notification] Posted to ${integration.team_name} #${integration.policy_channel_name}`,
        );
      } catch (err) {
        console.error(
          `[slack-policy-notification] Error posting to ${integration.team_name}:`,
          err,
        );
        results.push({
          integrationId: integration.integration_id,
          teamName: integration.team_name,
          channelName: integration.policy_channel_name,
          policyOk: false,
          leaderboardOk: false,
          isFirstSale: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        results,
        summary: {
          total: results.length,
          policySuccess: results.filter((r) => r.policyOk).length,
          leaderboardSuccess: results.filter((r) => r.leaderboardOk).length,
        },
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
