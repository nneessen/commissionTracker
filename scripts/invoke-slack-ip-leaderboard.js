// scripts/invoke-slack-ip-leaderboard.js
// Manually triggers IP (Issued Premium) leaderboard report to Slack
//
// IP (Issued Premium) = Approved & placed policies by effective_date
// Does NOT include pending policies that have not been issued yet
//
// Usage:
//   npm run slack:ip-leaderboard

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const IMO_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff"; // Founders Financial Group

async function main() {
  console.log("📊 IP Leaderboard - Weekly Report\n");
  console.log("IP (Issued Premium) = Approved & placed policies");
  console.log("Based on effective_date, NOT submit_date\n");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const functionUrl = `${SUPABASE_URL}/functions/v1/slack-ip-leaderboard`;

  console.log("📤 Posting IP report to Slack...\n");

  try {
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        imoId: IMO_ID,
      }),
    });

    const data = await response.json();

    if (data.ok) {
      if (data.skipped) {
        console.log(`⏭️  Skipped: ${data.reason}`);
      } else {
        console.log(`✅ Posted to #${data.results[0].channel}`);
        if (data.results[0].weekRange) {
          console.log(`📅 Week Range: ${data.results[0].weekRange}`);
        }
        if (Array.isArray(data.results[0].topWTD)) {
          console.log("🏆 Top WTD preview:");
          for (const row of data.results[0].topWTD) {
            console.log(`   - ${row.name}: $${row.ip} (${row.policies})`);
          }
        }
        if (Array.isArray(data.results[0].topMTD)) {
          console.log("📈 Top MTD preview:");
          for (const row of data.results[0].topMTD) {
            console.log(`   - ${row.name}: $${row.ip} (${row.policies})`);
          }
        }
      }
    } else {
      console.log(`❌ Failed: ${data.error || JSON.stringify(data)}`);
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  console.log("\n✅ Done!");
}

main();
