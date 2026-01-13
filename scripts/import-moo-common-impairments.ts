// scripts/import-moo-common-impairments.ts
// Import Mutual of Omaha Common Impairments (Declinable) for All Products

import { createClient } from "@supabase/supabase-js";
import {
  CARRIER_ID,
  GUIDE_ID,
  IMO_ID,
  COMMON_IMPAIRMENT_RULES,
  NEW_CONDITIONS,
} from "./moo-common-impairments-data";

const supabaseUrl = "https://pcyaqwodnyrpkaiojnpz.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y";
const supabase = createClient(supabaseUrl, supabaseKey);

async function importCommonImpairments() {
  console.log("=== Mutual of Omaha Common Impairments Import ===\n");

  let ruleSetCount = 0;
  let ruleCount = 0;
  let conditionCount = 0;
  let errorCount = 0;

  // Step 1: Create any new health conditions that don't exist
  console.log("Creating new health conditions if needed...");

  for (const cond of NEW_CONDITIONS) {
    const { data: existing } = await supabase
      .from("underwriting_health_conditions")
      .select("id")
      .eq("code", cond.code)
      .single();

    if (!existing) {
      const { error } = await supabase
        .from("underwriting_health_conditions")
        .insert({
          code: cond.code,
          name: cond.name,
          category: cond.category,
          is_active: true,
          risk_weight: 8,
          sort_order: 50,
          knockout_category: "standard",
        });

      if (error) {
        console.error(`Error creating condition ${cond.code}:`, error.message);
        errorCount++;
      } else {
        conditionCount++;
      }
    }
  }

  if (conditionCount > 0) {
    console.log(`Created ${conditionCount} new health conditions`);
  } else {
    console.log("All conditions already exist");
  }

  // Step 2: Delete existing carrier-level rule sets for these conditions
  console.log("\nCleaning up existing carrier-level rules...");

  const conditionCodes = COMMON_IMPAIRMENT_RULES.map((r) => r.conditionCode);

  const { data: existingRuleSets } = await supabase
    .from("underwriting_rule_sets")
    .select("id, condition_code")
    .eq("carrier_id", CARRIER_ID)
    .is("product_id", null)
    .in("condition_code", conditionCodes);

  if (existingRuleSets && existingRuleSets.length > 0) {
    const ruleSetIds = existingRuleSets.map((rs) => rs.id);
    await supabase
      .from("underwriting_rules")
      .delete()
      .in("rule_set_id", ruleSetIds);
    await supabase.from("underwriting_rule_sets").delete().in("id", ruleSetIds);
    console.log(`Deleted ${existingRuleSets.length} existing rule sets`);
  }

  // Step 3: Create rule sets and rules for each condition
  console.log("\nCreating rule sets and rules...");

  // Group rules by category for better organization
  const categories: Record<string, typeof COMMON_IMPAIRMENT_RULES> = {};
  for (const rule of COMMON_IMPAIRMENT_RULES) {
    const category = rule.conditionCode.split("_")[0] || "other";
    if (!categories[category]) categories[category] = [];
    categories[category].push(rule);
  }

  for (const rule of COMMON_IMPAIRMENT_RULES) {
    const ruleSetId = crypto.randomUUID();

    // Create rule set
    const { error: ruleSetError } = await supabase
      .from("underwriting_rule_sets")
      .insert({
        id: ruleSetId,
        imo_id: IMO_ID,
        carrier_id: CARRIER_ID,
        product_id: null, // Carrier-level - applies to ALL products
        scope: "condition",
        condition_code: rule.conditionCode,
        name: `MoO - ${rule.condition}`,
        description: rule.notes,
        source: "imported",
        source_guide_id: GUIDE_ID,
        review_status: "approved",
        reviewed_at: new Date().toISOString(),
      });

    if (ruleSetError) {
      console.error(
        `Error creating rule set for ${rule.condition}:`,
        ruleSetError.message,
      );
      errorCount++;
      continue;
    }

    ruleSetCount++;

    // Create the rule
    const ruleId = crypto.randomUUID();
    const predicate = {
      version: 2,
      root: {
        type: "condition_presence",
        field: "conditions",
        operator: "includes_any",
        value: [rule.conditionCode],
      },
    };

    const { error: ruleError } = await supabase
      .from("underwriting_rules")
      .insert({
        id: ruleId,
        rule_set_id: ruleSetId,
        name: `${rule.condition} - Decline`,
        description: `Decline coverage for ${rule.condition}`,
        priority: 1,
        predicate,
        predicate_version: 2,
        outcome_eligibility: "ineligible",
        outcome_health_class: "decline",
        outcome_table_rating: null,
        outcome_reason: rule.notes,
      });

    if (ruleError) {
      console.error(
        `Error creating rule for ${rule.condition}:`,
        ruleError.message,
      );
      errorCount++;
    } else {
      ruleCount++;
      console.log(`  ✓ ${rule.condition} -> Decline`);
    }
  }

  // Summary
  console.log("\n=== Import Summary ===");
  console.log("Carrier: Mutual of Omaha");
  console.log("Scope: ALL Products (carrier-level)");
  console.log(`New Conditions Created: ${conditionCount}`);
  console.log(`Rule Sets Created: ${ruleSetCount}`);
  console.log(`Rules Created: ${ruleCount}`);
  console.log(`Errors: ${errorCount}`);

  // Breakdown by category
  console.log("\n=== Rules by Category ===");
  const catCounts: Record<string, number> = {};
  for (const rule of COMMON_IMPAIRMENT_RULES) {
    const cat =
      NEW_CONDITIONS.find((c) => c.code === rule.conditionCode)?.category ||
      "other";
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(catCounts).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${cat}: ${count}`);
  }

  return { ruleSetCount, ruleCount, conditionCount, errorCount };
}

importCommonImpairments().catch(console.error);
