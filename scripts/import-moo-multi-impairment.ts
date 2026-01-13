// scripts/import-moo-multi-impairment.ts
// Import Mutual of Omaha Multiple Impairment rules

import { createClient } from "@supabase/supabase-js";
import {
  CARRIER_ID,
  GUIDE_ID,
  IMO_ID,
  PRODUCT_IDS,
  MULTI_IMPAIRMENT_RULES,
  buildPredicate,
} from "./moo-multi-impairment-data";

const supabaseUrl = "https://pcyaqwodnyrpkaiojnpz.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y";
const supabase = createClient(supabaseUrl, supabaseKey);

async function importMultiImpairmentRules() {
  console.log("=== Mutual of Omaha Multi-Impairment Import ===\n");

  let ruleSetCount = 0;
  let ruleCount = 0;
  let errorCount = 0;

  // Import for each product (Term Life Express and IUL Express)
  for (const [productName, productId] of Object.entries(PRODUCT_IDS)) {
    console.log(`\n--- Importing for ${productName} ---`);

    // Step 1: Check for existing rule sets and delete them
    const { data: existingRuleSets } = await supabase
      .from("underwriting_rule_sets")
      .select("id")
      .eq("carrier_id", CARRIER_ID)
      .eq("product_id", productId)
      .eq("scope", "global");

    if (existingRuleSets && existingRuleSets.length > 0) {
      const ruleSetIds = existingRuleSets.map((rs) => rs.id);
      await supabase
        .from("underwriting_rules")
        .delete()
        .in("rule_set_id", ruleSetIds);
      await supabase
        .from("underwriting_rule_sets")
        .delete()
        .in("id", ruleSetIds);
      console.log(
        `Deleted ${existingRuleSets.length} existing global rule sets`,
      );
    }

    // Step 2: Create global rule set for multi-impairment combinations
    const ruleSetId = crypto.randomUUID();
    const { error: ruleSetError } = await supabase
      .from("underwriting_rule_sets")
      .insert({
        id: ruleSetId,
        imo_id: IMO_ID,
        carrier_id: CARRIER_ID,
        product_id: productId,
        scope: "global",
        condition_code: null,
        name: `MoO ${productName.replace(/_/g, " ")} - Multi-Impairment Combinations`,
        description:
          "Multiple impairments resulting in rating > Table 4 are declined. These rules check for specific combinations.",
        source: "imported",
        source_guide_id: GUIDE_ID,
        review_status: "approved",
        reviewed_at: new Date().toISOString(),
      });

    if (ruleSetError) {
      console.error("Error creating rule set:", ruleSetError);
      errorCount++;
      continue;
    }

    ruleSetCount++;
    console.log("Created global multi-impairment rule set");

    // Step 3: Create rules for each multi-impairment combination
    let priority = 1;

    for (const rule of MULTI_IMPAIRMENT_RULES) {
      const ruleId = crypto.randomUUID();
      const predicate = buildPredicate(rule);

      const { error: ruleError } = await supabase
        .from("underwriting_rules")
        .insert({
          id: ruleId,
          rule_set_id: ruleSetId,
          name: rule.name,
          description: rule.description,
          priority,
          predicate,
          predicate_version: 2,
          outcome_eligibility: "ineligible",
          outcome_health_class: "decline",
          outcome_table_rating: null,
          outcome_reason: rule.notes,
        });

      if (ruleError) {
        console.error(`Error creating rule "${rule.name}":`, ruleError);
        errorCount++;
      } else {
        ruleCount++;
        console.log(`  ${priority}. ${rule.name} -> Decline`);
      }

      priority++;
    }
  }

  // Summary
  console.log("\n=== Import Summary ===");
  console.log("Carrier: Mutual of Omaha");
  console.log("Products: Term Life Express, IUL Express");
  console.log(`Rule Sets Created: ${ruleSetCount}`);
  console.log(`Rules Created: ${ruleCount}`);
  console.log(`Errors: ${errorCount}`);

  return { ruleSetCount, ruleCount, errorCount };
}

importMultiImpairmentRules().catch(console.error);
