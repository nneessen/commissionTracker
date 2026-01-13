// scripts/import-elco-rules-v2.ts
// Import ELCO Golden Eagle Impairment Table rules using manually extracted data

import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import {
  ELCO_RULES,
  ADDITIONAL_CONDITIONS,
  type ElcoRuleData,
} from "./elco-rules-data";

const supabaseUrl = "https://pcyaqwodnyrpkaiojnpz.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y";

const supabase = createClient(supabaseUrl, supabaseKey);

// IDs
const CARRIER_ID = "a04c25c3-edd8-404a-91d8-cd39e5faf2e8";
const PRODUCT_ID = "02f2e0a2-37d3-4a25-9815-baf6de3e13d3";
const IMO_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";
const GUIDE_ID = "411a35b1-b2bb-49a9-9608-91f500815a81";

// Build predicate from rule data
function buildPredicate(rule: ElcoRuleData): object {
  const conditions: object[] = [
    {
      type: "condition_presence",
      field: "conditions",
      operator: "includes_any",
      value: [rule.conditionCode],
    },
  ];

  // Parse parameters for predicate conditions
  const params = rule.parameters.toLowerCase();

  // Lookback check (for non-Ever/Any conditions)
  if (rule.lookbackYears > 0) {
    conditions.push({
      type: "date",
      field: `${rule.conditionCode}.diagnosis_date`,
      operator: "years_since_lte",
      value: rule.lookbackYears,
    });
  }

  // Insulin use
  if (params.includes("no insulin")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.insulin_use`,
      operator: "eq",
      value: false,
    });
  } else if (params.includes("on insulin") || params.includes("insulin use")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.insulin_use`,
      operator: "eq",
      value: true,
    });
  }

  // Severity
  if (params.includes("mild")) {
    conditions.push({
      type: "string",
      field: `${rule.conditionCode}.severity`,
      operator: "eq",
      value: "mild",
    });
  } else if (params.includes("moderate")) {
    conditions.push({
      type: "string",
      field: `${rule.conditionCode}.severity`,
      operator: "eq",
      value: "moderate",
    });
  } else if (params.includes("severe")) {
    conditions.push({
      type: "string",
      field: `${rule.conditionCode}.severity`,
      operator: "eq",
      value: "severe",
    });
  }

  // Recovery status
  if (params.includes("full recovery")) {
    conditions.push({
      type: "string",
      field: `${rule.conditionCode}.recovery_status`,
      operator: "eq",
      value: "full_recovery",
    });
  } else if (params.includes("ongoing symptoms")) {
    conditions.push({
      type: "string",
      field: `${rule.conditionCode}.recovery_status`,
      operator: "eq",
      value: "ongoing_symptoms",
    });
  }

  // Controlled status
  if (params.includes("controlled") && !params.includes("uncontrolled")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.is_controlled`,
      operator: "eq",
      value: true,
    });
  } else if (params.includes("uncontrolled")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.is_controlled`,
      operator: "eq",
      value: false,
    });
  }

  // Hospitalization/oxygen
  if (params.includes("oxygen")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.oxygen_use`,
      operator: "eq",
      value: true,
    });
  }
  if (
    params.includes("hospital") &&
    (params.includes("no ") || params.includes("none"))
  ) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.hospitalized_recently`,
      operator: "eq",
      value: false,
    });
  }

  // Smoker
  if (params.includes("smoker")) {
    conditions.push({
      type: "boolean",
      field: "client.tobacco",
      operator: "eq",
      value: true,
    });
  }

  // Complications
  if (params.includes("nephropathy")) {
    conditions.push({
      type: "array",
      field: `${rule.conditionCode}.complications`,
      operator: "includes_any",
      value: ["nephropathy"],
    });
  }
  if (params.includes("neuropathy")) {
    conditions.push({
      type: "array",
      field: `${rule.conditionCode}.complications`,
      operator: "includes_any",
      value: ["neuropathy"],
    });
  }
  if (params.includes("retinopathy")) {
    conditions.push({
      type: "array",
      field: `${rule.conditionCode}.complications`,
      operator: "includes_any",
      value: ["retinopathy"],
    });
  }
  if (params.includes("no complications")) {
    conditions.push({
      type: "array",
      field: `${rule.conditionCode}.complications`,
      operator: "is_empty",
    });
  }

  // Age checks
  if (params.includes("age under 65") || params.includes("age < 65")) {
    conditions.push({
      type: "numeric",
      field: "client.age",
      operator: "lt",
      value: 65,
    });
  } else if (params.includes("age 65 or older")) {
    conditions.push({
      type: "numeric",
      field: "client.age",
      operator: "gte",
      value: 65,
    });
  } else if (params.includes("age < 50")) {
    conditions.push({
      type: "numeric",
      field: "client.age",
      operator: "lt",
      value: 50,
    });
  } else if (params.includes("prior to age 40")) {
    conditions.push({
      type: "numeric",
      field: "client.age",
      operator: "lt",
      value: 40,
    });
  } else if (params.includes("before age 25")) {
    conditions.push({
      type: "numeric",
      field: "client.age",
      operator: "lt",
      value: 25,
    });
  }

  // Episodes
  const episodeMatch = params.match(/(\d+)\s*episodes?/i);
  if (episodeMatch) {
    const count = parseInt(episodeMatch[1]);
    if (params.includes("no ") || params.includes("less than")) {
      conditions.push({
        type: "numeric",
        field: `${rule.conditionCode}.episodes_12_months`,
        operator: "lt",
        value: count,
      });
    } else if (params.includes("more than")) {
      conditions.push({
        type: "numeric",
        field: `${rule.conditionCode}.episodes_12_months`,
        operator: "gt",
        value: count,
      });
    }
  }

  // Mobility
  if (params.includes("unable to walk") || params.includes("wheelchair")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.can_walk`,
      operator: "eq",
      value: false,
    });
  }
  if (params.includes("walking aids")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.requires_walking_aids`,
      operator: "eq",
      value: true,
    });
  }

  // Surgery
  if (params.includes("surgery within")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.had_surgery`,
      operator: "eq",
      value: true,
    });
  }
  if (params.includes("required surgery")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.required_surgery`,
      operator: "eq",
      value: true,
    });
  }

  // Steroids
  if (params.includes("steroids within")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.on_steroids`,
      operator: "eq",
      value: true,
    });
  }

  // Amputation
  if (params.includes("amputation")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.has_amputation`,
      operator: "eq",
      value: true,
    });
  }

  // Chronic vs Acute
  if (params.includes("chronic")) {
    conditions.push({
      type: "string",
      field: `${rule.conditionCode}.type`,
      operator: "eq",
      value: "chronic",
    });
  } else if (params.includes("acute")) {
    conditions.push({
      type: "string",
      field: `${rule.conditionCode}.type`,
      operator: "eq",
      value: "acute",
    });
  }

  // Limbs affected
  if (params.includes("> 1 limb affected")) {
    conditions.push({
      type: "numeric",
      field: `${rule.conditionCode}.limbs_affected`,
      operator: "gt",
      value: 1,
    });
  }

  // Conviction type
  if (params.includes("single conviction")) {
    conditions.push({
      type: "numeric",
      field: `${rule.conditionCode}.conviction_count`,
      operator: "eq",
      value: 1,
    });
  } else if (params.includes("repeat conviction")) {
    conditions.push({
      type: "numeric",
      field: `${rule.conditionCode}.conviction_count`,
      operator: "gt",
      value: 1,
    });
  }

  // Felony type
  if (
    params.includes("violent felony") ||
    params.includes("alcohol / drug related")
  ) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.is_violent_or_drug_related`,
      operator: "eq",
      value: true,
    });
  } else if (params.includes("non violent")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.is_violent_or_drug_related`,
      operator: "eq",
      value: false,
    });
  }

  // Movement/incapacity
  if (params.includes("no incapacity")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.has_incapacity`,
      operator: "eq",
      value: false,
    });
  } else if (params.includes("movement impacted")) {
    conditions.push({
      type: "boolean",
      field: `${rule.conditionCode}.movement_impacted`,
      operator: "eq",
      value: true,
    });
  }

  // Dosage
  if (params.includes("over 100mg")) {
    conditions.push({
      type: "numeric",
      field: `${rule.conditionCode}.daily_dosage_mg`,
      operator: "gt",
      value: 100,
    });
  } else if (params.includes("50mg - 100mg")) {
    conditions.push({
      type: "numeric",
      field: `${rule.conditionCode}.daily_dosage_mg`,
      operator: "between",
      value: [50, 100],
    });
  } else if (params.includes("under 50mg")) {
    conditions.push({
      type: "numeric",
      field: `${rule.conditionCode}.daily_dosage_mg`,
      operator: "lt",
      value: 50,
    });
  }

  // Diagnosis timing
  if (
    params.includes("diagnosed within 12 months") ||
    params.includes("diagnosed within 2 years")
  ) {
    conditions.push({
      type: "date",
      field: `${rule.conditionCode}.diagnosis_date`,
      operator: "years_since_lte",
      value: params.includes("12 months") ? 1 : 2,
    });
  } else if (params.includes("diagnosed 1 to 3 years ago")) {
    conditions.push({
      type: "date",
      field: `${rule.conditionCode}.diagnosis_date`,
      operator: "years_since_gte",
      value: 1,
    });
    conditions.push({
      type: "date",
      field: `${rule.conditionCode}.diagnosis_date`,
      operator: "years_since_lte",
      value: 3,
    });
  } else if (
    params.includes("diagnosed over 3 years ago") ||
    params.includes("diagnosed over 2 years ago")
  ) {
    conditions.push({
      type: "date",
      field: `${rule.conditionCode}.diagnosis_date`,
      operator: "years_since_gte",
      value: params.includes("3") ? 3 : 2,
    });
  }

  return {
    version: 2,
    root: conditions.length > 1 ? { all: conditions } : conditions[0],
  };
}

async function ensureConditionsExist() {
  console.log("Ensuring additional conditions exist...");

  for (const condition of ADDITIONAL_CONDITIONS) {
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
  console.log("=== ELCO Golden Eagle Rules Import v2 ===\n");
  console.log(`Total rules to import: ${ELCO_RULES.length}\n`);

  // Ensure all conditions exist
  await ensureConditionsExist();

  // Check for existing rule sets
  const { data: existingRuleSets } = await supabase
    .from("underwriting_rule_sets")
    .select("id, condition_code")
    .eq("carrier_id", CARRIER_ID)
    .eq("product_id", PRODUCT_ID);

  const existingConditions = new Set(
    existingRuleSets?.map((rs) => rs.condition_code) || [],
  );
  console.log(
    `Existing rule sets for this carrier/product: ${existingConditions.size}`,
  );

  // Group rules by condition
  const rulesByCondition = new Map<string, ElcoRuleData[]>();
  for (const rule of ELCO_RULES) {
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

    // Create rule set
    const ruleSetId = uuidv4();
    const { error: ruleSetError } = await supabase
      .from("underwriting_rule_sets")
      .insert({
        id: ruleSetId,
        imo_id: IMO_ID,
        carrier_id: CARRIER_ID,
        product_id: PRODUCT_ID,
        scope: "condition",
        condition_code: conditionCode,
        variant: "default",
        name: `ELCO Golden Eagle - ${rules[0].condition}`,
        description: `Auto-imported from ELCO Golden Eagle Impairment Table (April 2024)`,
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

    // Create rules with proper priority (more specific first)
    // Sort: decline first, then by parameter specificity
    const sortedRules = [...rules].sort((a, b) => {
      if (a.decision === "decline" && b.decision !== "decline") return -1;
      if (b.decision === "decline" && a.decision !== "decline") return 1;
      return b.parameters.length - a.parameters.length; // More specific params first
    });

    let priority = 1;
    for (const rule of sortedRules) {
      const predicate = buildPredicate(rule);

      const description = [
        `Lookback: ${rule.lookback}`,
        rule.parameters ? `Parameters: ${rule.parameters}` : null,
        rule.medications ? `Medications: ${rule.medications}` : null,
        rule.drugCombinations ? `Drug combos: ${rule.drugCombinations}` : null,
        rule.notes ? `Notes: ${rule.notes}` : null,
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
          description,
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
                : rule.decision === "substandard"
                  ? "substandard"
                  : "standard",
          outcome_table_rating: rule.tableRating,
          outcome_reason: `ELCO Golden Eagle: ${rule.condition} - ${rule.parameters || "Default"}`,
          outcome_concerns: [],
          extraction_confidence: 0.95,
          source_snippet: `${rule.condition} | ${rule.lookback} | ${rule.parameters} | ${rule.decision}${rule.tableRating !== "none" ? ` (Table ${rule.tableRating})` : ""}`,
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
