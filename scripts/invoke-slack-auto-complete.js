// scripts/invoke-slack-auto-complete.js
// Manually triggers auto-completion of pending first sales
//
// Usage:
//   npm run slack:auto-complete

import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  console.log("🔄 Auto-completing pending first sales...\n");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const functionUrl = `${SUPABASE_URL}/functions/v1/slack-auto-complete-first-sale`;

  try {
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (data.ok) {
      console.log(`✅ Processed: ${data.processed} pending first sale(s)`);
      console.log(`   Successful: ${data.successful}`);

      if (data.results && data.results.length > 0) {
        console.log("\nResults:");
        data.results.forEach((result) => {
          const status = result.success ? "✅" : "❌";
          console.log(`   ${status} Log ${result.logId.slice(0, 8)}... - ${result.success ? "Completed" : result.error}`);
        });
      }
    } else {
      console.error(`❌ Error: ${data.error}`);
    }
  } catch (err) {
    console.error(`❌ Request failed: ${err.message}`);
    process.exit(1);
  }

  console.log("\n✅ Done!");
}

main();
