// scripts/fix-submit-dates.js
// Fixes policies where submit_date was incorrectly set to a future date
// Updates submit_date to match created_at date for policies where:
//   - submit_date = today (2026-02-05)
//   - created_at date != today
//
// Usage:
//   npm run fix:submit-dates

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  console.log("🔧 Policy Submit Date Fixer\n");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get today's date
  const today = "2026-02-05";
  console.log(`Looking for policies with submit_date = ${today} but created on a different date...\n`);

  // Find policies where submit_date is today but created_at is not today
  const { data: policies, error: queryError } = await supabase
    .from("policies")
    .select("id, policy_number, submit_date, created_at, product, status")
    .eq("submit_date", today)
    .neq("created_at::date", today);

  if (queryError) {
    console.error("❌ Error querying policies:", queryError.message);
    process.exit(1);
  }

  if (!policies || policies.length === 0) {
    console.log("✅ No policies found that need fixing.\n");
    return;
  }

  console.log(`Found ${policies.length} policies to fix:\n`);

  // Display what we found
  policies.forEach((policy, idx) => {
    const createdDate = new Date(policy.created_at).toISOString().split("T")[0];
    console.log(
      `${idx + 1}. Policy #${policy.policy_number || policy.id.slice(0, 8)} | ` +
      `Created: ${createdDate} | Submit: ${policy.submit_date} | ${policy.product} | ${policy.status}`
    );
  });

  console.log("\n");

  // Update each policy
  let successCount = 0;
  let errorCount = 0;

  for (const policy of policies) {
    const newSubmitDate = new Date(policy.created_at).toISOString().split("T")[0];

    try {
      const { error: updateError } = await supabase
        .from("policies")
        .update({ submit_date: newSubmitDate })
        .eq("id", policy.id);

      if (updateError) {
        console.error(`❌ Failed to update ${policy.id}: ${updateError.message}`);
        errorCount++;
      } else {
        console.log(
          `✅ Updated ${policy.policy_number || policy.id.slice(0, 8)}: ` +
          `${policy.submit_date} → ${newSubmitDate}`
        );
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Error updating ${policy.id}: ${err.message}`);
      errorCount++;
    }
  }

  console.log("\n");
  console.log("─".repeat(50));
  console.log(`✅ Successfully updated: ${successCount}`);
  if (errorCount > 0) {
    console.log(`❌ Failed: ${errorCount}`);
  }
  console.log("─".repeat(50));
  console.log("\n✅ Done!");
}

main();
