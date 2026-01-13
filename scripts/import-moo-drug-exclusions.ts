// scripts/import-moo-drug-exclusions.ts
// Import Mutual of Omaha Prescription Drug Exclusions

import { createClient } from "@supabase/supabase-js";
import {
  CARRIER_ID,
  IMO_ID,
  GUIDE_IDS,
  PRODUCT_IDS,
  TLE_IUL_DECLINE_MEDICATIONS,
  LP_DECLINE_MEDICATIONS,
  LP_GRADED_MEDICATIONS,
  LP_REFER_MEDICATIONS,
  MEDICATION_CATEGORIES,
} from "./moo-drug-exclusions-data";

const supabaseUrl = "https://pcyaqwodnyrpkaiojnpz.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y";
const supabase = createClient(supabaseUrl, supabaseKey);

async function importDrugExclusions() {
  console.log("=== Mutual of Omaha Prescription Drug Exclusions Import ===\n");

  let ruleSetCount = 0;
  let ruleCount = 0;
  let errorCount = 0;

  // Ensure medication_exclusion condition exists
  const { data: existingCondition } = await supabase
    .from("underwriting_health_conditions")
    .select("id")
    .eq("code", "medication_exclusion")
    .single();

  if (!existingCondition) {
    await supabase.from("underwriting_health_conditions").insert({
      code: "medication_exclusion",
      name: "Prescription Medication Exclusion",
      category: "other",
      is_active: true,
      risk_weight: 10,
      sort_order: 100,
      knockout_category: "standard",
    });
    console.log("Created medication_exclusion condition");
  }

  // =========================================================================
  // TERM LIFE EXPRESS & IUL EXPRESS
  // =========================================================================
  console.log("\n--- Term Life Express & IUL Express ---");

  for (const [productName, productId] of [
    ["Term Life Express", PRODUCT_IDS.TERM_LIFE_EXPRESS],
    ["IUL Express", PRODUCT_IDS.IUL_EXPRESS],
  ]) {
    // Delete existing
    const { data: existing } = await supabase
      .from("underwriting_rule_sets")
      .select("id")
      .eq("carrier_id", CARRIER_ID)
      .eq("product_id", productId)
      .eq("condition_code", "medication_exclusion");

    if (existing && existing.length > 0) {
      await supabase
        .from("underwriting_rules")
        .delete()
        .in(
          "rule_set_id",
          existing.map((r) => r.id),
        );
      await supabase
        .from("underwriting_rule_sets")
        .delete()
        .in(
          "id",
          existing.map((r) => r.id),
        );
    }

    // Create rule set
    const ruleSetId = crypto.randomUUID();
    const { error: rsError } = await supabase
      .from("underwriting_rule_sets")
      .insert({
        id: ruleSetId,
        imo_id: IMO_ID,
        carrier_id: CARRIER_ID,
        product_id: productId,
        scope: "condition",
        condition_code: "medication_exclusion",
        name: `MoO ${productName} - Medication Exclusions`,
        description: `${TLE_IUL_DECLINE_MEDICATIONS.length} medications that exclude applicants from ${productName}`,
        source: "imported",
        source_guide_id: GUIDE_IDS.TERM_LIFE_IUL,
        review_status: "approved",
        reviewed_at: new Date().toISOString(),
      });

    if (rsError) {
      console.error(
        `Error creating rule set for ${productName}:`,
        rsError.message,
      );
      errorCount++;
      continue;
    }
    ruleSetCount++;

    // Create rules by category
    let priority = 1;
    for (const [category, meds] of Object.entries(MEDICATION_CATEGORIES)) {
      const categoryMeds = meds.filter((m) =>
        TLE_IUL_DECLINE_MEDICATIONS.includes(m),
      );
      if (categoryMeds.length === 0) continue;

      const { error: ruleError } = await supabase
        .from("underwriting_rules")
        .insert({
          id: crypto.randomUUID(),
          rule_set_id: ruleSetId,
          name: `${category} Medications`,
          description: `Decline: ${categoryMeds.join(", ")}`,
          priority: priority++,
          predicate: {
            version: 2,
            root: {
              type: "array",
              field: "current_medications",
              operator: "includes_any",
              value: categoryMeds.map((m) => m.toLowerCase()),
            },
          },
          predicate_version: 2,
          outcome_eligibility: "ineligible",
          outcome_health_class: "decline",
          outcome_reason: `${categoryMeds.length} medications in ${category} category`,
        });

      if (ruleError) {
        errorCount++;
      } else {
        ruleCount++;
      }
    }

    console.log(`  ✓ ${productName}: ${priority - 1} category rules`);
  }

  // =========================================================================
  // LIVING PROMISE WHOLE LIFE
  // =========================================================================
  console.log("\n--- Living Promise Whole Life ---");

  // Delete existing
  const { data: lpExisting } = await supabase
    .from("underwriting_rule_sets")
    .select("id")
    .eq("carrier_id", CARRIER_ID)
    .eq("product_id", PRODUCT_IDS.LIVING_PROMISE)
    .eq("condition_code", "medication_exclusion");

  if (lpExisting && lpExisting.length > 0) {
    await supabase
      .from("underwriting_rules")
      .delete()
      .in(
        "rule_set_id",
        lpExisting.map((r) => r.id),
      );
    await supabase
      .from("underwriting_rule_sets")
      .delete()
      .in(
        "id",
        lpExisting.map((r) => r.id),
      );
  }

  // Create rule set for Living Promise
  const lpRuleSetId = crypto.randomUUID();
  await supabase.from("underwriting_rule_sets").insert({
    id: lpRuleSetId,
    imo_id: IMO_ID,
    carrier_id: CARRIER_ID,
    product_id: PRODUCT_IDS.LIVING_PROMISE,
    scope: "condition",
    condition_code: "medication_exclusion",
    name: "MoO Living Promise - Medication Exclusions",
    description: `${LP_DECLINE_MEDICATIONS.length} decline, ${LP_GRADED_MEDICATIONS.length} may qualify for graded, ${LP_REFER_MEDICATIONS.length} require review`,
    source: "imported",
    source_guide_id: GUIDE_IDS.LIVING_PROMISE,
    review_status: "approved",
    reviewed_at: new Date().toISOString(),
  });
  ruleSetCount++;

  let lpPriority = 1;

  // Decline medications (by category)
  for (const [category, meds] of Object.entries(MEDICATION_CATEGORIES)) {
    const categoryMeds = meds.filter((m) => LP_DECLINE_MEDICATIONS.includes(m));
    if (categoryMeds.length === 0) continue;

    await supabase.from("underwriting_rules").insert({
      id: crypto.randomUUID(),
      rule_set_id: lpRuleSetId,
      name: `${category} - Decline`,
      description: `Decline: ${categoryMeds.join(", ")}`,
      priority: lpPriority++,
      predicate: {
        version: 2,
        root: {
          type: "array",
          field: "current_medications",
          operator: "includes_any",
          value: categoryMeds.map((m) => m.toLowerCase()),
        },
      },
      predicate_version: 2,
      outcome_eligibility: "ineligible",
      outcome_health_class: "decline",
      outcome_reason: `Not eligible for Living Promise - ${categoryMeds.length} ${category} medications`,
    });
    ruleCount++;
  }

  // Graded benefit medications (single rule)
  await supabase.from("underwriting_rules").insert({
    id: crypto.randomUUID(),
    rule_set_id: lpRuleSetId,
    name: "May Qualify for Graded Benefit",
    description: `Graded: ${LP_GRADED_MEDICATIONS.join(", ")}`,
    priority: lpPriority++,
    predicate: {
      version: 2,
      root: {
        type: "array",
        field: "current_medications",
        operator: "includes_any",
        value: LP_GRADED_MEDICATIONS.map((m) => m.toLowerCase()),
      },
    },
    predicate_version: 2,
    outcome_eligibility: "refer",
    outcome_health_class: "refer",
    outcome_reason: `${LP_GRADED_MEDICATIONS.length} medications may qualify for Living Promise Graded benefit instead`,
  });
  ruleCount++;

  // Refer medications (single rule)
  await supabase.from("underwriting_rules").insert({
    id: crypto.randomUUID(),
    rule_set_id: lpRuleSetId,
    name: "Additional Information Required",
    description: `Review: ${LP_REFER_MEDICATIONS.join(", ")}`,
    priority: lpPriority++,
    predicate: {
      version: 2,
      root: {
        type: "array",
        field: "current_medications",
        operator: "includes_any",
        value: LP_REFER_MEDICATIONS.map((m) => m.toLowerCase()),
      },
    },
    predicate_version: 2,
    outcome_eligibility: "refer",
    outcome_health_class: "refer",
    outcome_reason: `${LP_REFER_MEDICATIONS.length} medications require additional information - include reason on application`,
  });
  ruleCount++;

  console.log(
    `  ✓ Living Promise: ${lpPriority - 1} rules (decline + graded + refer)`,
  );

  // Summary
  console.log("\n=== Import Summary ===");
  console.log("Carrier: Mutual of Omaha");
  console.log("Products: Term Life Express, IUL Express, Living Promise");
  console.log(`Rule Sets Created: ${ruleSetCount}`);
  console.log(`Rules Created: ${ruleCount}`);
  console.log(`Errors: ${errorCount}`);

  console.log("\n=== Medication Counts ===");
  console.log(
    `Term Life Express / IUL Express: ${TLE_IUL_DECLINE_MEDICATIONS.length} decline`,
  );
  console.log(`Living Promise - Decline: ${LP_DECLINE_MEDICATIONS.length}`);
  console.log(`Living Promise - Graded: ${LP_GRADED_MEDICATIONS.length}`);
  console.log(`Living Promise - Refer: ${LP_REFER_MEDICATIONS.length}`);

  return { ruleSetCount, ruleCount, errorCount };
}

importDrugExclusions().catch(console.error);
