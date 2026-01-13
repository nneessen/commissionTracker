// scripts/import-kcl-medications.ts
// Import KCL Term Medication Exclusion List into underwriting rules

import { createClient } from "@supabase/supabase-js";
import {
  CARRIER_ID,
  PRODUCT_ID,
  GUIDE_ID,
  IMO_ID,
  DECLINE_MEDICATIONS,
  REFER_MEDICATIONS,
  MEDICATION_CATEGORIES,
} from "./kcl-medications-data";

const supabaseUrl = "https://pcyaqwodnyrpkaiojnpz.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y";
const supabase = createClient(supabaseUrl, supabaseKey);

async function importMedicationExclusions() {
  console.log("=== KCL Medication Exclusion Import ===\n");

  let ruleSetCount = 0;
  let ruleCount = 0;
  let errorCount = 0;

  // Step 1: Update guide with parsed content
  console.log("Updating guide with parsed content...");
  const parsedContent = {
    fullText: `KCL TERM MEDICATION EXCLUSION LIST

Proposed insureds who are currently taking any of the below listed prescription medications are not eligible for the Signature Term Express. Kansas City Life reserves the right to ask additional questions or pursue additional information and take final action on any medication or combination of medications listed and not listed here.

DECLINE MEDICATIONS (${DECLINE_MEDICATIONS.length}):
${DECLINE_MEDICATIONS.join(", ")}

INDIVIDUAL CONSIDERATION MEDICATIONS (${REFER_MEDICATIONS.length}):
${REFER_MEDICATIONS.join(", ")}
(Provide the reason for the medication on the application)`,
    sections: [
      {
        pageNumber: 1,
        content: "Prescription drug exclusions",
      },
    ],
    pageCount: 1,
    extractedAt: new Date().toISOString(),
    metadata: {
      title: "KCL TERM MEDICATION EXCLUSION LIST",
      totalDeclineMedications: DECLINE_MEDICATIONS.length,
      totalReferMedications: REFER_MEDICATIONS.length,
      categories: Object.keys(MEDICATION_CATEGORIES),
    },
    medicationList: {
      decline: DECLINE_MEDICATIONS,
      refer: REFER_MEDICATIONS,
      categories: MEDICATION_CATEGORIES,
    },
  };

  const { error: guideError } = await supabase
    .from("underwriting_guides")
    .update({
      parsed_content: JSON.stringify(parsedContent),
      parsing_status: "completed",
      parsing_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", GUIDE_ID);

  if (guideError) {
    console.error("Error updating guide:", guideError);
    errorCount++;
  } else {
    console.log("Guide updated with parsed content\n");
  }

  // Step 2: Create or get medication_exclusion condition
  console.log("Ensuring medication_exclusion condition exists...");

  const { data: existingCondition } = await supabase
    .from("underwriting_health_conditions")
    .select("id")
    .eq("code", "medication_exclusion")
    .single();

  if (existingCondition) {
    console.log(
      "Using existing medication_exclusion condition:",
      existingCondition.id,
    );
  } else {
    const { data: newCondition, error: conditionError } = await supabase
      .from("underwriting_health_conditions")
      .insert({
        code: "medication_exclusion",
        name: "Prescription Medication Exclusion",
        category: "other",
        is_active: true,
        risk_weight: 10,
        sort_order: 100,
        knockout_category: "standard",
        follow_up_schema: {
          questions: [
            {
              id: "medications",
              type: "text",
              label: "List all current prescription medications",
              required: true,
            },
          ],
        },
      })
      .select("id")
      .single();

    if (conditionError) {
      console.error("Error creating condition:", conditionError);
      errorCount++;
      return { ruleSetCount, ruleCount, errorCount };
    }
    console.log(
      "Created new medication_exclusion condition:",
      newCondition!.id,
    );
  }

  // Step 3: Delete existing rule sets for this carrier/product with medication_exclusion
  console.log("\nCleaning up existing medication exclusion rules...");

  const { data: existingRuleSets } = await supabase
    .from("underwriting_rule_sets")
    .select("id")
    .eq("carrier_id", CARRIER_ID)
    .eq("product_id", PRODUCT_ID)
    .eq("condition_code", "medication_exclusion");

  if (existingRuleSets && existingRuleSets.length > 0) {
    const ruleSetIds = existingRuleSets.map((rs) => rs.id);
    await supabase
      .from("underwriting_rules")
      .delete()
      .in("rule_set_id", ruleSetIds);
    await supabase.from("underwriting_rule_sets").delete().in("id", ruleSetIds);
    console.log(`Deleted ${existingRuleSets.length} existing rule sets`);
  }

  // Step 4: Create rule set for decline medications
  console.log("\nCreating medication exclusion rule set...");

  const ruleSetId = crypto.randomUUID();
  const { error: ruleSetError } = await supabase
    .from("underwriting_rule_sets")
    .insert({
      id: ruleSetId,
      imo_id: IMO_ID,
      carrier_id: CARRIER_ID,
      product_id: PRODUCT_ID,
      scope: "condition",
      condition_code: "medication_exclusion",
      name: "KCL Signature Term - Medication Exclusions",
      description: `Prescription medications that exclude applicants from Signature Term Express. ${DECLINE_MEDICATIONS.length} decline medications, ${REFER_MEDICATIONS.length} refer medications.`,
      source: "imported",
      source_guide_id: GUIDE_ID,
      review_status: "approved",
      reviewed_at: new Date().toISOString(),
    });

  if (ruleSetError) {
    console.error("Error creating rule set:", ruleSetError);
    errorCount++;
    return { ruleSetCount, ruleCount, errorCount };
  }

  ruleSetCount++;
  console.log("Created medication exclusion rule set");

  // Step 5: Create rules for each medication category (grouped for manageability)
  console.log("\nCreating rules by category...");

  let priority = 1;

  for (const [category, medications] of Object.entries(MEDICATION_CATEGORIES)) {
    const categoryMeds = medications.filter((med) =>
      DECLINE_MEDICATIONS.includes(med),
    );

    if (categoryMeds.length === 0) continue;

    const ruleId = crypto.randomUUID();
    const predicate = {
      version: 2,
      root: {
        // Note: This predicate format stores medication list for reference
        // Actual evaluation requires wizard integration to collect medications
        type: "array",
        field: "current_medications",
        operator: "includes_any",
        value: categoryMeds.map((m) => m.toLowerCase()),
      },
    };

    const { error: ruleError } = await supabase
      .from("underwriting_rules")
      .insert({
        id: ruleId,
        rule_set_id: ruleSetId,
        name: `${category} Medications`,
        description: `Decline if taking: ${categoryMeds.join(", ")}`,
        priority,
        predicate: predicate,
        predicate_version: 2,
        outcome_eligibility: "ineligible",
        outcome_health_class: "decline",
        outcome_table_rating: null,
        outcome_reason: `${categoryMeds.length} medications in this category result in decline`,
      });

    if (ruleError) {
      console.error(`Error creating rule for ${category}:`, ruleError);
      errorCount++;
    } else {
      ruleCount++;
      console.log(
        `  ${priority}. ${category}: ${categoryMeds.length} medications -> Decline`,
      );
    }

    priority++;
  }

  // Step 6: Create rules for individual consideration medications
  console.log("\nCreating individual consideration rules...");

  const referRuleId = crypto.randomUUID();
  const referPredicate = {
    version: 2,
    root: {
      type: "array",
      field: "current_medications",
      operator: "includes_any",
      value: REFER_MEDICATIONS.map((m) => m.toLowerCase()),
    },
  };

  const { error: referRuleError } = await supabase
    .from("underwriting_rules")
    .insert({
      id: referRuleId,
      rule_set_id: ruleSetId,
      name: "Individual Consideration Medications",
      description: `Refer for review if taking: ${REFER_MEDICATIONS.join(", ")}`,
      priority,
      predicate: referPredicate,
      predicate_version: 2,
      outcome_eligibility: "refer",
      outcome_health_class: "refer",
      outcome_table_rating: null,
      outcome_reason:
        "Provide reason for medication on application. These are typically cardiac/anticoagulant medications.",
    });

  if (referRuleError) {
    console.error("Error creating refer rule:", referRuleError);
    errorCount++;
  } else {
    ruleCount++;
    console.log(
      `  ${priority}. Individual Consideration: ${REFER_MEDICATIONS.length} medications -> Refer`,
    );
  }

  // Summary
  console.log("\n=== Import Summary ===");
  console.log(`Carrier: Kansas City Life`);
  console.log(`Product: Signature Term`);
  console.log(`Rule Sets Created: ${ruleSetCount}`);
  console.log(`Rules Created: ${ruleCount}`);
  console.log(`Decline Medications: ${DECLINE_MEDICATIONS.length}`);
  console.log(`Refer Medications: ${REFER_MEDICATIONS.length}`);
  console.log(`Errors: ${errorCount}`);

  return { ruleSetCount, ruleCount, errorCount };
}

importMedicationExclusions().catch(console.error);
