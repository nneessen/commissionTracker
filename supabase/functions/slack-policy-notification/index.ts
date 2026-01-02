// supabase/functions/slack-policy-notification/index.ts
// Posts simplified policy notifications and updates daily leaderboard in Slack

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { decrypt } from "../_shared/encryption.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface PolicyNotificationPayload {
  action?: "post-policy" | "update-leaderboard";
  policyId?: string;
  policyNumber?: string;
  carrierId?: string;
  productId?: string;
  agentId?: string;
  clientName?: string;
  annualPremium?: number;
  effectiveDate?: string;
  status?: string;
  imoId?: string;
  agencyId?: string;
  // For update-leaderboard action
  logId?: string;
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
 * Get today's date in US Eastern timezone (YYYY-MM-DD format)
 * This ensures consistent date handling for US business operations
 */
function getTodayDateET(): string {
  const now = new Date();
  // Format in Eastern Time
  const etDate = now.toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
  return etDate; // Returns YYYY-MM-DD format
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
 * Get default title based on day of week (Eastern timezone)
 */
function getDefaultDailyTitle(): string {
  const today = new Date();
  // Get day name in Eastern Time
  const dayName = today.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "America/New_York",
  });

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
 * Post a message to Slack and return the response
 */
async function postSlackMessage(
  botToken: string,
  channelId: string,
  text: string,
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel: channelId, text }),
    });
    return await response.json();
  } catch (err) {
    console.error("[slack-policy-notification] Failed to post message:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" };
  }
}

/**
 * Update an existing Slack message
 */
async function updateSlackMessage(
  botToken: string,
  channelId: string,
  messageTs: string,
  text: string,
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  try {
    const response = await fetch("https://slack.com/api/chat.update", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        ts: messageTs,
        text,
      }),
    });
    return await response.json();
  } catch (err) {
    console.error("[slack-policy-notification] Failed to update message:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" };
  }
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
    timeZone: "America/New_York",
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

/**
 * Handle complete-first-sale action
 * Posts the pending policy notification and leaderboard after user names (or skips) the leaderboard
 */
async function handleCompleteFirstSale(
  supabase: ReturnType<typeof createClient>,
  logId: string,
): Promise<{
  ok: boolean;
  error?: string;
  policyOk?: boolean;
  leaderboardOk?: boolean;
}> {
  console.log(
    "[slack-policy-notification] Completing first sale for log:",
    logId,
  );

  // Fetch the daily log with pending data (including hierarchy_depth for leaderboard logic)
  const { data: log, error: logError } = await supabase
    .from("daily_sales_logs")
    .select(
      `
      id,
      imo_id,
      slack_integration_id,
      channel_id,
      log_date,
      title,
      pending_policy_data,
      first_seller_id,
      hierarchy_depth
    `,
    )
    .eq("id", logId)
    .single();

  if (logError || !log) {
    console.error("[slack-policy-notification] Log not found:", logError);
    return { ok: false, error: "Log not found" };
  }

  if (!log.pending_policy_data) {
    console.log(
      "[slack-policy-notification] No pending data - already completed",
    );
    return { ok: true, policyOk: true, leaderboardOk: true };
  }

  const pendingData = log.pending_policy_data as {
    policyText: string;
    carrierName: string;
    productName: string;
    agentName: string;
    agentSlackMemberId: string | null;
    annualPremium: number;
    effectiveDate: string;
    agentId: string;
  };

  // Get the Slack integration
  const { data: integration, error: intError } = await supabase
    .from("slack_integrations")
    .select("id, bot_token_encrypted, agency_id")
    .eq("id", log.slack_integration_id)
    .single();

  if (intError || !integration) {
    console.error(
      "[slack-policy-notification] Integration not found:",
      intError,
    );
    return { ok: false, error: "Slack integration not found" };
  }

  // Decrypt bot token
  const botToken = await decrypt(integration.bot_token_encrypted);

  // Post the policy notification
  const policyResult = await postSlackMessage(
    botToken,
    log.channel_id,
    pendingData.policyText,
  );

  if (!policyResult.ok) {
    console.error(
      "[slack-policy-notification] Failed to post policy:",
      policyResult.error,
    );
    return { ok: false, error: "Failed to post policy notification" };
  }

  // ONLY include leaderboard for direct agency (hierarchy_depth = 0)
  // Parent agencies (depth > 0) and IMO-level (depth = 999) get policy notification only
  const shouldIncludeLeaderboard = log.hierarchy_depth === 0;

  let leaderboardOk = false;
  let leaderboardMessageTs: string | null = null;

  if (shouldIncludeLeaderboard) {
    // Get today's production for leaderboard
    const { data: productionData } = await supabase.rpc(
      "get_daily_production_by_agent",
      {
        p_imo_id: log.imo_id,
        p_agency_id: integration.agency_id,
      },
    );

    const production: DailyProductionEntry[] = productionData || [];
    const totalAP = production.reduce(
      (sum, e) => sum + (e.total_annual_premium || 0),
      0,
    );

    // Build leaderboard with the title (use default if not set)
    const title = log.title || getDefaultDailyTitle();
    const leaderboardText = buildLeaderboardText(title, production, totalAP);

    // Post the leaderboard
    const leaderboardResult = await postSlackMessage(
      botToken,
      log.channel_id,
      leaderboardText,
    );

    leaderboardOk = leaderboardResult.ok;
    leaderboardMessageTs = leaderboardResult.ts || null;
  } else {
    console.log(
      `[slack-policy-notification] Skipping leaderboard for parent/IMO integration (hierarchy_depth=${log.hierarchy_depth})`,
    );
  }

  // Update the log: clear pending_policy_data, save leaderboard message_ts (if any)
  const { error: updateError } = await supabase
    .from("daily_sales_logs")
    .update({
      pending_policy_data: null,
      leaderboard_message_ts: leaderboardMessageTs,
      updated_at: new Date().toISOString(),
    })
    .eq("id", logId);

  if (updateError) {
    console.error(
      "[slack-policy-notification] Failed to update log:",
      updateError,
    );
  }

  console.log("[slack-policy-notification] First sale completed successfully");
  return {
    ok: true,
    policyOk: policyResult.ok,
    leaderboardOk,
  };
}

/**
 * Handle update-leaderboard action
 * Updates an existing Slack leaderboard message with a new title
 */
async function handleUpdateLeaderboard(
  supabase: ReturnType<typeof createClient>,
  logId: string,
): Promise<{
  ok: boolean;
  error?: string;
  updated?: boolean;
}> {
  console.log(
    "[slack-policy-notification] Updating leaderboard for log:",
    logId,
  );

  // Fetch the daily log with integration details (including hierarchy_depth for validation)
  const { data: log, error: logError } = await supabase
    .from("daily_sales_logs")
    .select(
      `
      id,
      imo_id,
      slack_integration_id,
      channel_id,
      log_date,
      title,
      leaderboard_message_ts,
      first_seller_id,
      hierarchy_depth
    `,
    )
    .eq("id", logId)
    .single();

  if (logError || !log) {
    console.error("[slack-policy-notification] Log not found:", logError);
    return { ok: false, error: "Log not found" };
  }

  // Validate that leaderboards are only updated for direct agency integrations
  if (log.hierarchy_depth !== 0) {
    console.log(
      `[slack-policy-notification] Skipping leaderboard update for parent/IMO integration (hierarchy_depth=${log.hierarchy_depth})`,
    );
    return { ok: true, updated: false };
  }

  if (!log.leaderboard_message_ts) {
    console.error("[slack-policy-notification] No message_ts to update");
    return { ok: false, error: "No Slack message to update" };
  }

  // Get the Slack integration
  const { data: integration, error: intError } = await supabase
    .from("slack_integrations")
    .select("id, bot_token_encrypted, agency_id")
    .eq("id", log.slack_integration_id)
    .single();

  if (intError || !integration) {
    console.error(
      "[slack-policy-notification] Integration not found:",
      intError,
    );
    return { ok: false, error: "Slack integration not found" };
  }

  // Decrypt bot token
  const botToken = await decrypt(integration.bot_token_encrypted);

  // Get today's production for leaderboard
  const { data: productionData } = await supabase.rpc(
    "get_daily_production_by_agent",
    {
      p_imo_id: log.imo_id,
      p_agency_id: integration.agency_id,
    },
  );

  const production: DailyProductionEntry[] = productionData || [];
  const totalAP = production.reduce(
    (sum, e) => sum + (e.total_annual_premium || 0),
    0,
  );

  // Build leaderboard with the title from database (which was just updated)
  const title = log.title || getDefaultDailyTitle();
  const leaderboardText = buildLeaderboardText(title, production, totalAP);

  // Update the Slack message
  const updateResult = await updateSlackMessage(
    botToken,
    log.channel_id,
    log.leaderboard_message_ts,
    leaderboardText,
  );

  if (!updateResult.ok) {
    console.error(
      "[slack-policy-notification] Failed to update Slack message:",
      updateResult.error,
    );
    return {
      ok: false,
      error: updateResult.error || "Failed to update Slack message",
    };
  }

  console.log(
    "[slack-policy-notification] Leaderboard updated successfully with title:",
    title,
  );
  return { ok: true, updated: true };
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: PolicyNotificationPayload = await req.json();

    // Handle complete-first-sale action (posts pending notification after naming dialog)
    if (body.action === "complete-first-sale") {
      if (!body.logId) {
        return new Response(
          JSON.stringify({ ok: false, error: "Missing required field: logId" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const result = await handleCompleteFirstSale(supabase, body.logId);
      return new Response(JSON.stringify(result), {
        status: result.ok ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle update-leaderboard action (for refreshing Slack message after title is set)
    if (body.action === "update-leaderboard") {
      if (!body.logId) {
        return new Response(
          JSON.stringify({ ok: false, error: "Missing required field: logId" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const result = await handleUpdateLeaderboard(supabase, body.logId);
      return new Response(JSON.stringify(result), {
        status: result.ok ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default action: post-policy (original behavior)
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

    console.log(
      `[slack-policy-notification] Processing policy ${policyId} for agent ${agentId}, imoId=${imoId}, agencyId=${agencyId}`,
    );

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
        console.log(
          `[slack-policy-notification] Found ${hierarchyIntegrations.length} integrations for agency ${agencyId}`,
        );
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
      pendingFirstSale?: boolean;
      logId?: string | null;
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
            const { error: upsertError } = await supabase
              .from("user_slack_preferences")
              .upsert(
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

            if (upsertError) {
              console.error(
                `[slack-policy-notification] Failed to save Slack member ID for ${agentEmail}:`,
                upsertError,
              );
            } else {
              console.log(
                `[slack-policy-notification] Saved Slack member ID for ${agentEmail}: ${lookedUpId}`,
              );
            }
          }
        }

        // Build the simple policy notification text
        // Use Eastern timezone for fallback date display
        const fallbackDate = new Date().toLocaleDateString("en-CA", {
          timeZone: "America/New_York",
        });
        const policyText = buildSimplePolicyText(
          annualPremium,
          carrierName,
          productName,
          effectiveDate || fallbackDate,
          agentSlackMemberId,
          agentName,
        );

        // =====================================================================
        // Check FIRST if this is a first sale - before posting anything
        // =====================================================================
        let leaderboardOk = false;
        let isFirstSale = false;

        // ONLY include leaderboard for direct agency (hierarchy_depth = 0)
        // Parent agencies (depth > 0) and IMO-level (depth = 999) get policy notification only
        const shouldIncludeLeaderboard = integration.hierarchy_depth === 0;

        // Check if there's already a daily log for today (Eastern timezone)
        const todayDate = getTodayDateET();
        const { data: existingLog } = await supabase
          .from("daily_sales_logs")
          .select("*")
          .eq("imo_id", imoId)
          .eq("slack_integration_id", integration.integration_id)
          .eq("channel_id", integration.policy_channel_id)
          .eq("log_date", todayDate)
          .maybeSingle();

        // Get today's production for leaderboard
        // Use integration's agency_id so each level shows appropriate scope:
        // - The Standard's scoreboard shows only The Standard's sales
        // - Self Made's scoreboard shows Self Made + all child agencies
        const integrationAgencyId = integration.agency_id;
        const { data: productionData } = await supabase.rpc(
          "get_daily_production_by_agent",
          {
            p_imo_id: imoId,
            p_agency_id: integrationAgencyId,
          },
        );

        const production: DailyProductionEntry[] = productionData || [];
        const totalAP = production.reduce(
          (sum, e) => sum + (e.total_annual_premium || 0),
          0,
        );

        // Detect if this is effectively the first sale of the day
        // More robust check: if log exists, verify the first_seller still has production
        // This handles the case where policies were deleted
        let isEffectivelyFirstSale = !existingLog;

        if (existingLog && existingLog.first_seller_id) {
          // Check if the recorded first_seller still has any production today
          const firstSellerProduction = production.find(
            (p) => p.agent_id === existingLog.first_seller_id,
          );
          const firstSellerHasProduction =
            firstSellerProduction && firstSellerProduction.policy_count > 0;

          // If first seller has no production, their policies were deleted - reset
          if (!firstSellerHasProduction) {
            isEffectivelyFirstSale = true;
            console.log(
              "[slack-policy-notification] First seller has no production, resetting log",
            );
          }
        }

        // Also check if there's a pending first sale that hasn't been completed
        if (existingLog && existingLog.pending_policy_data) {
          // There's already a pending first sale - treat this as subsequent sale
          isEffectivelyFirstSale = false;
        }

        if (isEffectivelyFirstSale) {
          // =====================================================================
          // FIRST SALE HANDLING
          // =====================================================================

          // For parent agencies and IMO-level integrations, skip the naming dialog
          // Just post the policy notification immediately (no leaderboard)
          if (!shouldIncludeLeaderboard) {
            console.log(
              `[slack-policy-notification] First sale for parent/IMO integration ${integration.team_name} - posting policy only, no naming dialog`,
            );

            const policyResponse = await postSlackMessage(
              botToken,
              integration.policy_channel_id,
              policyText,
            );

            results.push({
              integrationId: integration.integration_id,
              teamName: integration.team_name,
              channelName: integration.policy_channel_name,
              policyOk: policyResponse.ok,
              leaderboardOk: false, // No leaderboard for parent/IMO
              isFirstSale: false, // Not treating as first sale for parent/IMO
              error: policyResponse.error || null,
            });

            continue; // Skip to next integration
          }

          // For direct agency (hierarchy_depth = 0), do the normal first-sale flow with naming dialog
          isFirstSale = true;

          console.log(
            "[slack-policy-notification] First sale detected - storing pending data for naming dialog",
          );

          // Store the policy data for later posting after user names the leaderboard
          const pendingData = {
            policyText,
            carrierName,
            productName,
            agentName,
            agentSlackMemberId,
            annualPremium,
            effectiveDate: effectiveDate || fallbackDate,
            agentId,
          };

          let savedLogId: string | null = null;

          if (existingLog) {
            // Log exists but was stale (first seller's policies deleted) - update it
            const { error: updateError } = await supabase
              .from("daily_sales_logs")
              .update({
                first_seller_id: agentId,
                pending_policy_data: pendingData,
                leaderboard_message_ts: null, // Clear old message_ts
                hierarchy_depth: integration.hierarchy_depth, // Track integration level for leaderboard logic
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingLog.id);

            if (updateError) {
              console.error(
                "[slack-policy-notification] Failed to update daily log:",
                updateError,
              );
            } else {
              savedLogId = existingLog.id;
            }
          } else {
            // No log exists - create new one with pending data
            const { data: insertedLog, error: insertError } = await supabase
              .from("daily_sales_logs")
              .insert({
                imo_id: imoId,
                slack_integration_id: integration.integration_id,
                channel_id: integration.policy_channel_id,
                log_date: todayDate,
                first_seller_id: agentId,
                pending_policy_data: pendingData,
                hierarchy_depth: integration.hierarchy_depth, // Track integration level for leaderboard logic
              })
              .select("id")
              .single();

            if (insertError) {
              console.error(
                "[slack-policy-notification] Failed to insert daily log:",
                insertError,
              );
            } else {
              savedLogId = insertedLog?.id || null;
            }
          }

          // Return result indicating pending first sale (no Slack messages sent)
          results.push({
            integrationId: integration.integration_id,
            teamName: integration.team_name,
            channelName: integration.policy_channel_name,
            policyOk: false, // Not posted yet
            leaderboardOk: false, // Not posted yet
            isFirstSale: true,
            pendingFirstSale: true,
            logId: savedLogId,
            error: null,
          });

          console.log(
            `[slack-policy-notification] Pending first sale stored for ${integration.team_name} - awaiting naming dialog`,
          );
          continue; // Skip to next integration
        }

        // =====================================================================
        // SUBSEQUENT SALE - Post policy notification normally
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
        // Handle daily leaderboard for subsequent sales
        // ONLY for direct agency (hierarchy_depth = 0), not for parent/IMO
        // =====================================================================
        if (shouldIncludeLeaderboard && existingLog) {
          // Subsequent sale - delete old leaderboard and post fresh one
          // This ensures leaderboard always appears AFTER the latest policy notification
          const leaderboardText = buildLeaderboardText(
            existingLog.title || getDefaultDailyTitle(),
            production,
            totalAP,
          );

          // Delete old leaderboard message if it exists (ignore errors - message may be gone)
          if (existingLog.leaderboard_message_ts) {
            try {
              const deleteResponse = await fetch(
                "https://slack.com/api/chat.delete",
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${botToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    channel: integration.policy_channel_id,
                    ts: existingLog.leaderboard_message_ts,
                  }),
                },
              );
              const deleteData = await deleteResponse.json();
              if (!deleteData.ok && deleteData.error !== "message_not_found") {
                console.log(
                  "[slack-policy-notification] Could not delete old leaderboard:",
                  deleteData.error,
                );
              }
            } catch (deleteErr) {
              console.log(
                "[slack-policy-notification] Error deleting old leaderboard (continuing):",
                deleteErr,
              );
            }
          }

          // Always post fresh leaderboard after the policy notification
          const leaderboardData = await postSlackMessage(
            botToken,
            integration.policy_channel_id,
            leaderboardText,
          );
          leaderboardOk = leaderboardData.ok;

          // Update the log with new message_ts
          if (leaderboardData.ok && leaderboardData.ts) {
            const { error: updateLogError } = await supabase
              .from("daily_sales_logs")
              .update({
                leaderboard_message_ts: leaderboardData.ts,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingLog.id);

            if (updateLogError) {
              console.error(
                "[slack-policy-notification] Failed to update log with new message_ts:",
                updateLogError,
              );
            }
          } else if (!leaderboardData.ok) {
            console.error(
              "[slack-policy-notification] Failed to post new leaderboard:",
              leaderboardData.error,
            );
          }
        } else if (!shouldIncludeLeaderboard) {
          // Parent/IMO integration - no leaderboard, just policy notification
          console.log(
            `[slack-policy-notification] Skipping leaderboard for parent/IMO integration ${integration.team_name}`,
          );
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
