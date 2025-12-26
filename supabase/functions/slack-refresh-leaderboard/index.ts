// supabase/functions/slack-refresh-leaderboard/index.ts
// Refreshes the daily leaderboard message in Slack after title is updated

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { decrypt } from "../_shared/encryption.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

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
    console.log("[slack-refresh-leaderboard] Function invoked");

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
    const { logId, title } = body;

    if (!logId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing logId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the daily sales log
    const { data: dailyLog, error: logError } = await supabase
      .from("daily_sales_logs")
      .select("*")
      .eq("id", logId)
      .single();

    if (logError || !dailyLog) {
      console.error("[slack-refresh-leaderboard] Log not found:", logError);
      return new Response(
        JSON.stringify({ ok: false, error: "Daily log not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get the Slack integration
    const { data: integration, error: intError } = await supabase
      .from("slack_integrations")
      .select("id, bot_token_encrypted")
      .eq("id", dailyLog.slack_integration_id)
      .single();

    if (intError || !integration) {
      console.error(
        "[slack-refresh-leaderboard] Integration not found:",
        intError,
      );
      return new Response(
        JSON.stringify({ ok: false, error: "Slack integration not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get today's production for leaderboard
    const { data: productionData } = await supabase.rpc(
      "get_daily_production_by_agent",
      {
        p_imo_id: dailyLog.imo_id,
        p_agency_id: null,
      },
    );

    const production: DailyProductionEntry[] = productionData || [];
    const totalAP = production.reduce(
      (sum, e) => sum + (e.total_annual_premium || 0),
      0,
    );

    // Build the updated leaderboard text
    const leaderboardTitle = title || dailyLog.title || "Daily Sales";
    const leaderboardText = buildLeaderboardText(
      leaderboardTitle,
      production,
      totalAP,
    );

    // Decrypt bot token
    const botToken = await decrypt(integration.bot_token_encrypted);

    // Update the Slack message if we have the message_ts
    if (dailyLog.leaderboard_message_ts) {
      const updateResponse = await fetch("https://slack.com/api/chat.update", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: dailyLog.channel_id,
          ts: dailyLog.leaderboard_message_ts,
          text: leaderboardText,
        }),
      });

      const updateData = await updateResponse.json();

      if (!updateData.ok) {
        console.error(
          "[slack-refresh-leaderboard] Failed to update message:",
          updateData.error,
        );

        // If the message is too old or deleted, post a new one
        if (
          updateData.error === "message_not_found" ||
          updateData.error === "cant_update_message"
        ) {
          const postResponse = await fetch(
            "https://slack.com/api/chat.postMessage",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${botToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                channel: dailyLog.channel_id,
                text: leaderboardText,
              }),
            },
          );

          const postData = await postResponse.json();

          if (postData.ok) {
            // Update the log with new message_ts
            await supabase
              .from("daily_sales_logs")
              .update({
                leaderboard_message_ts: postData.ts,
                updated_at: new Date().toISOString(),
              })
              .eq("id", logId);

            return new Response(
              JSON.stringify({
                ok: true,
                action: "posted_new",
                ts: postData.ts,
              }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }

          return new Response(
            JSON.stringify({ ok: false, error: postData.error }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        return new Response(
          JSON.stringify({ ok: false, error: updateData.error }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log("[slack-refresh-leaderboard] Message updated successfully");

      return new Response(
        JSON.stringify({
          ok: true,
          action: "updated",
          ts: dailyLog.leaderboard_message_ts,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } else {
      // No message_ts, post a new message
      const postResponse = await fetch(
        "https://slack.com/api/chat.postMessage",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channel: dailyLog.channel_id,
            text: leaderboardText,
          }),
        },
      );

      const postData = await postResponse.json();

      if (postData.ok) {
        // Update the log with message_ts
        await supabase
          .from("daily_sales_logs")
          .update({
            leaderboard_message_ts: postData.ts,
            updated_at: new Date().toISOString(),
          })
          .eq("id", logId);

        console.log("[slack-refresh-leaderboard] New message posted");

        return new Response(
          JSON.stringify({ ok: true, action: "posted_new", ts: postData.ts }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ ok: false, error: postData.error }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (err) {
    console.error("[slack-refresh-leaderboard] Unexpected error:", err);
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
