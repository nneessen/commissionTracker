// scripts/import-foresters-rules.ts
// Import Foresters Your Term, Strong Foundation and Advantage Plus rules

import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import {
  FORESTERS_RULES,
  FORESTERS_ADDITIONAL_CONDITIONS,
  type ForestersRuleData,
} from "./foresters-rules-data";

const supabaseUrl = "https://pcyaqwodnyrpkaiojnpz.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y";

const supabase = createClient(supabaseUrl, supabaseKey);

// IDs
const CARRIER_ID = "acca122f-4261-46d9-9287-da47b8ba5e37"; // Foresters Financial
const IMO_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";
const GUIDE_ID = "c6d9e2e8-1ea3-4337-a7fa-0cb056f513b6";

// Build predicate from rule data
function buildPredicate(rule: ForestersRuleData): object {
  const conditions: object[] = [
    {
      type: "condition_presence",
      field: "conditions",
      operator: "includes_any",
      value: [rule.conditionCode],
    },
  ];

  const params = rule.parameters.toLowerCase();

  // Recovery/remission status
  if (
    params.includes("in remission") ||
    params.includes("recovered") ||
    params.includes("inactive")
  ) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.in_remission`,
      operator: "eq",
      value: true,
    });
  }
  if (
    params.includes("treatment completed") ||
    params.includes("no recurrence")
  ) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.treatment_completed`,
      operator: "eq",
      value: true,
    });
  }

  // Time-based conditions
  if (params.includes("within 5 years")) {
    conditions.push({
      type: "date",
      field: `${rule.conditionCode}.last_occurrence_date`,
      operator: "years_since_lte",
      value: 5,
    });
  } else if (params.includes("after 5 years")) {
    conditions.push({
      type: "date",
      field: `${rule.conditionCode}.last_occurrence_date`,
      operator: "years_since_gte",
      value: 5,
    });
  }
  if (params.includes("over 10 years ago")) {
    conditions.push({
      type: "date",
      field: `${rule.conditionCode}.treatment_end_date`,
      operator: "years_since_gte",
      value: 10,
    });
  }
  if (params.includes(">5 years in remission")) {
    conditions.push({
      type: "date",
      field: `${rule.conditionCode}.remission_start_date`,
      operator: "years_since_gte",
      value: 5,
    });
  }
  if (params.includes("no seizures for 2 years")) {
    conditions.push({
      type: "date",
      field: `${rule.conditionCode}.last_seizure_date`,
      operator: "years_since_gte",
      value: 2,
    });
  }
  if (params.includes("after 1 year") || params.includes(">1 year ago")) {
    conditions.push({
      type: "date",
      field: `${rule.conditionCode}.procedure_date`,
      operator: "years_since_gte",
      value: 1,
    });
  }

  // Severity
  if (params.includes("mild") && !params.includes("moderate")) {
    conditions.push({
      type: "string",
      field: `${rule.conditionCode}.severity`,
      operator: "eq",
      value: "mild",
    });
  } else if (
    params.includes("mild/moderate") ||
    params.includes("mild to moderate")
  ) {
    conditions.push({
      type: "set",
      field: `${rule.conditionCode}.severity`,
      operator: "in",
      value: ["mild", "moderate"],
    });
  } else if (
    params.includes("moderate or severe") ||
    params.includes("severe")
  ) {
    conditions.push({
      type: "set",
      field: `${rule.conditionCode}.severity`,
      operator: "in",
      value: ["moderate", "severe"],
    });
  }

  // Control status
  if (params.includes("controlled") && !params.includes("uncontrolled")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.is_controlled`,
      operator: "eq",
      value: true,
    });
  }
  if (params.includes("good control")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.good_control`,
      operator: "eq",
      value: true,
    });
  }

  // Treatment/medication
  if (
    params.includes("no insulin") ||
    params.includes("non-insulin") ||
    params.includes("non insulin")
  ) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.insulin_use`,
      operator: "eq",
      value: false,
    });
  } else if (
    params.includes("with insulin") ||
    params.includes("treated with insulin")
  ) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.insulin_use`,
      operator: "eq",
      value: true,
    });
  }
  if (params.includes("no steroids")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.on_steroids`,
      operator: "eq",
      value: false,
    });
  }
  if (params.includes("no oxygen")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.oxygen_use`,
      operator: "eq",
      value: false,
    });
  }
  if (params.includes("no symptoms") || params.includes("no treatment")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.has_symptoms`,
      operator: "eq",
      value: false,
    });
  }

  // Hospitalization
  if (params.includes("hospitalization") && params.includes("severe")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.hospitalized`,
      operator: "eq",
      value: true,
    });
  }
  if (params.includes("no hospitalization")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.hospitalized`,
      operator: "eq",
      value: false,
    });
  }

  // Smoking
  if (
    params.includes("smoker") &&
    !params.includes("non smoker") &&
    !params.includes("non-smoker")
  ) {
    conditions.push({
      type: "boolean",
      field: "client.tobacco",
      operator: "eq",
      value: true,
    });
  } else if (params.includes("non smoker") || params.includes("non-smoker")) {
    conditions.push({
      type: "boolean",
      field: "client.tobacco",
      operator: "eq",
      value: false,
    });
  }

  // Complications
  if (
    params.includes("no complications") ||
    params.includes("no diabetic complications")
  ) {
    conditions.push({
      type: "array",
      field: `${rule.conditionCode}.complications`,
      operator: "is_empty",
    });
  } else if (params.includes("complications")) {
    conditions.push({
      type: "array",
      field: `${rule.conditionCode}.complications`,
      operator: "is_not_empty",
    });
  }

  // Cause
  if (params.includes("caused by injury") || params.includes("due to trauma")) {
    conditions.push({
      type: "string",
      field: `${rule.conditionCode}.cause`,
      operator: "eq",
      value: "trauma",
    });
  } else if (params.includes("caused by disease")) {
    conditions.push({
      type: "string",
      field: `${rule.conditionCode}.cause`,
      operator: "eq",
      value: "disease",
    });
  }

  // Specific conditions
  if (params.includes("iron deficiency")) {
    conditions.push({
      type: "string",
      field: `${rule.conditionCode}.type`,
      operator: "eq",
      value: "iron_deficiency",
    });
  }
  if (params.includes("basal cell")) {
    conditions.push({
      type: "string",
      field: `${rule.conditionCode}.cancer_type`,
      operator: "eq",
      value: "basal_cell",
    });
  }
  if (params.includes("acute") && !params.includes("chronic")) {
    conditions.push({
      type: "string",
      field: `${rule.conditionCode}.type`,
      operator: "eq",
      value: "acute",
    });
  } else if (params.includes("chronic")) {
    conditions.push({
      type: "string",
      field: `${rule.conditionCode}.type`,
      operator: "eq",
      value: "chronic",
    });
  }
  if (params.includes("alcohol related")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.alcohol_related`,
      operator: "eq",
      value: true,
    });
  }
  if (params.includes("non alcohol related")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.alcohol_related`,
      operator: "eq",
      value: false,
    });
  }
  if (params.includes("innocent")) {
    conditions.push({
      type: "string",
      field: `${rule.conditionCode}.type`,
      operator: "eq",
      value: "innocent",
    });
  }
  if (params.includes("discoid")) {
    conditions.push({
      type: "string",
      field: `${rule.conditionCode}.type`,
      operator: "eq",
      value: "discoid",
    });
  } else if (params.includes("systemic")) {
    conditions.push({
      type: "string",
      field: `${rule.conditionCode}.type`,
      operator: "eq",
      value: "systemic",
    });
  }
  if (params.includes("localized") || params.includes("non-pulmonary")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.is_pulmonary`,
      operator: "eq",
      value: false,
    });
  } else if (params.includes("pulmonary")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.is_pulmonary`,
      operator: "eq",
      value: true,
    });
  }
  if (params.includes("no depression")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.has_depression`,
      operator: "eq",
      value: false,
    });
  }
  if (params.includes("working full-time")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.working_full_time`,
      operator: "eq",
      value: true,
    });
  }
  if (params.includes("weight stabilized")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.weight_stabilized`,
      operator: "eq",
      value: true,
    });
  }
  if (params.includes("non cancer")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.is_cancer_related`,
      operator: "eq",
      value: false,
    });
  }

  // Age
  if (params.includes("> age 25") || params.includes("age 25")) {
    conditions.push({
      type: "numeric",
      field: "client.age",
      operator: "gt",
      value: 25,
    });
  }
  if (params.includes("onset more than 1 year")) {
    conditions.push({
      type: "date",
      field: `${rule.conditionCode}.onset_date`,
      operator: "years_since_gte",
      value: 1,
    });
  }

  // Usage frequency (marijuana)
  if (params.includes("up to 6 days per week")) {
    conditions.push({
      type: "numeric",
      field: `${rule.conditionCode}.days_per_week`,
      operator: "lte",
      value: 6,
    });
  } else if (params.includes("daily use") || params.includes("daily")) {
    conditions.push({
      type: "numeric",
      field: `${rule.conditionCode}.days_per_week`,
      operator: "eq",
      value: 7,
    });
  }

  return {
    version: 2,
    root: conditions.length > 1 ? { all: conditions } : conditions[0] || {},
  };
}

async function ensureConditionsExist() {
  console.log("Ensuring additional conditions exist...");

  for (const condition of FORESTERS_ADDITIONAL_CONDITIONS) {
    const { data: existing } = await supabase
      .from("underwriting_health_conditions")
      .select("code")
      .eq("code", condition.code)
      .single();

    if (!existing) {
      const { error } = await supabase
        .from("underwriting_health_conditions")
        .insert({
          code: condition.code,
          name: condition.name,
          category: condition.category,
          follow_up_schema: {},
          is_active: true,
        });

      if (error) {
        console.error(
          `Failed to create condition ${condition.code}:`,
          error.message,
        );
      } else {
        console.log(`Created condition: ${condition.code}`);
      }
    }
  }
}

async function importRules() {
  console.log("=== Foresters Rules Import ===\n");
  console.log(`Total rules to import: ${FORESTERS_RULES.length}\n`);

  // Ensure all conditions exist
  await ensureConditionsExist();

  // Check for existing rule sets for this carrier
  const { data: existingRuleSets } = await supabase
    .from("underwriting_rule_sets")
    .select("id, condition_code")
    .eq("carrier_id", CARRIER_ID)
    .is("product_id", null); // Carrier-level rules (no product)

  const existingConditions = new Set(
    existingRuleSets?.map((rs) => rs.condition_code) || [],
  );
  console.log(`Existing carrier-level rule sets: ${existingConditions.size}`);

  // Group rules by condition
  const rulesByCondition = new Map<string, ForestersRuleData[]>();
  for (const rule of FORESTERS_RULES) {
    if (!rulesByCondition.has(rule.conditionCode)) {
      rulesByCondition.set(rule.conditionCode, []);
    }
    rulesByCondition.get(rule.conditionCode)!.push(rule);
  }

  console.log(`Unique conditions: ${rulesByCondition.size}\n`);

  let createdRuleSets = 0;
  let createdRules = 0;
  let skippedConditions = 0;
  let errors = 0;

  for (const [conditionCode, rules] of rulesByCondition) {
    // Skip if exists
    if (existingConditions.has(conditionCode)) {
      console.log(`⏭️  ${conditionCode}: Skipping (rule set exists)`);
      skippedConditions++;
      continue;
    }

    // Verify condition exists
    const { data: conditionExists } = await supabase
      .from("underwriting_health_conditions")
      .select("code")
      .eq("code", conditionCode)
      .single();

    if (!conditionExists) {
      console.log(
        `⚠️  ${conditionCode}: Condition not found in database, skipping`,
      );
      errors++;
      continue;
    }

    // Create rule set (carrier-level, no product_id)
    const ruleSetId = uuidv4();
    const { error: ruleSetError } = await supabase
      .from("underwriting_rule_sets")
      .insert({
        id: ruleSetId,
        imo_id: IMO_ID,
        carrier_id: CARRIER_ID,
        product_id: null, // Carrier-level rules apply to all products
        scope: "condition",
        condition_code: conditionCode,
        variant: "default",
        name: `Foresters - ${rules[0].condition}`,
        description: `Auto-imported from Foresters Your Term, Strong Foundation and Advantage Plus Impairment List (May 2025)`,
        is_active: true,
        version: 1,
        source: "imported",
        source_guide_id: GUIDE_ID,
        review_status: "approved",
      });

    if (ruleSetError) {
      console.error(
        `❌ ${conditionCode}: Failed to create rule set: ${ruleSetError.message}`,
      );
      errors++;
      continue;
    }

    createdRuleSets++;

    // Sort rules: decline first, then by parameter specificity
    const sortedRules = [...rules].sort((a, b) => {
      if (a.decision === "decline" && b.decision !== "decline") return -1;
      if (b.decision === "decline" && a.decision !== "decline") return 1;
      return b.parameters.length - a.parameters.length;
    });

    let priority = 1;
    for (const rule of sortedRules) {
      const predicate = buildPredicate(rule);

      const description = [
        rule.hasQuestionnaire ? "Has questionnaire" : null,
        rule.parameters ? `Parameters: ${rule.parameters}` : null,
        rule.notes ? `Notes: ${rule.notes}` : null,
        rule.productSpecific !== "all"
          ? `Product: ${rule.productSpecific}`
          : null,
      ]
        .filter(Boolean)
        .join("; ");

      const { error: ruleError } = await supabase
        .from("underwriting_rules")
        .insert({
          id: uuidv4(),
          rule_set_id: ruleSetId,
          priority,
          name: rule.parameters
            ? `${rule.condition}: ${rule.parameters.substring(0, 60)}`
            : `${rule.condition}: Default`,
          description: description || null,
          predicate,
          predicate_version: 2,
          outcome_eligibility:
            rule.decision === "decline"
              ? "ineligible"
              : rule.decision === "refer"
                ? "refer"
                : "eligible",
          outcome_health_class:
            rule.decision === "decline"
              ? "decline"
              : rule.decision === "refer"
                ? "refer"
                : "standard",
          outcome_table_rating: "none", // Foresters doesn't use table ratings
          outcome_reason: `Foresters: ${rule.condition}${rule.parameters ? " - " + rule.parameters : ""}`,
          outcome_concerns: [],
          extraction_confidence: 0.95,
          source_snippet: `${rule.condition} | ${rule.parameters} | ${rule.decision === "accept" ? "Accept" : rule.decision === "decline" ? "Decline" : "Individual Consideration"}`,
        });

      if (ruleError) {
        console.error(
          `  ❌ Rule error for ${rule.condition}: ${ruleError.message}`,
        );
        errors++;
      } else {
        createdRules++;
      }

      priority++;
    }

    console.log(`✅ ${conditionCode}: Created ${rules.length} rules`);
  }

  console.log("\n=== Import Summary ===");
  console.log(`Rule sets created: ${createdRuleSets}`);
  console.log(`Rules created: ${createdRules}`);
  console.log(`Conditions skipped (already exist): ${skippedConditions}`);
  console.log(`Errors: ${errors}`);
}

// Run
importRules().catch(console.error);
