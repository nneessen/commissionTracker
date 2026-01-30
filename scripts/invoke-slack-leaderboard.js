// scripts/invoke-slack-leaderboard.js
// Manually triggers refresh of all Slack leaderboards for today
//
// Usage:
//   npm run slack:leaderboard

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  console.log("📊 Refreshing Slack leaderboards...\n");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get today's date in ET (same format the function uses)
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });

  console.log(`Looking for leaderboards from: ${today}\n`);

  // Get today's daily_sales_logs that have a leaderboard message posted
  const { data: logs, error: logsError } = await supabase
    .from("daily_sales_logs")
    .select(`
      id,
      channel_id,
      title,
      leaderboard_message_ts,
      slack_integrations!inner (
        team_name,
        policy_channel_name
      )
    `)
    .eq("log_date", today)
    .not("leaderboard_message_ts", "is", null);

  if (logsError) {
    console.error("❌ Error fetching logs:", logsError.message);
    process.exit(1);
  }

  if (!logs || logs.length === 0) {
    console.log("No leaderboards found for today. Post a policy first to create a leaderboard.");
    process.exit(0);
  }

  console.log(`Found ${logs.length} leaderboard(s) to refresh\n`);

  const functionUrl = `${SUPABASE_URL}/functions/v1/slack-policy-notification`;

  for (const log of logs) {
    const channelName = log.slack_integrations?.policy_channel_name || log.channel_id;
    const teamName = log.slack_integrations?.team_name || "Unknown";

    console.log(`Refreshing: ${teamName} #${channelName}...`);

    try {
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          action: "update-leaderboard",
          logId: log.id,
        }),
      });

      const data = await response.json();

      if (data.ok && data.updated) {
        console.log(`   ✅ Updated`);
      } else {
        console.log(`   ❌ Failed: ${data.error || JSON.stringify(data)}`);
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }
  }

  console.log("\n✅ Done!");
}

main();
