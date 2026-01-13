// scripts/query-foresters.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pcyaqwodnyrpkaiojnpz.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWFxd29kbnlycGthaW9qbnB6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk3MTA5MiwiZXhwIjoyMDczNTQ3MDkyfQ.XX7b-WjJHpx1V7b3rl2fBg_HPVfWz3CCt5IUtsluo1Y";

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyForestersRules() {
  const CARRIER_ID = "acca122f-4261-46d9-9287-da47b8ba5e37";

  // Get rule sets
  const { data: ruleSets, error } = await supabase
    .from("underwriting_rule_sets")
    .select("id, condition_code, name, review_status")
    .eq("carrier_id", CARRIER_ID)
    .is("product_id", null)
    .order("condition_code");

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("=== Foresters Rule Sets ===\n");
  console.log(`Total rule sets: ${ruleSets?.length || 0}\n`);

  // Sample conditions
  const sampleConditions = [
    "diabetes",
    "copd",
    "cancer",
    "alcohol_abuse",
    "asthma",
  ];

  for (const code of sampleConditions) {
    const ruleSet = ruleSets?.find((rs) => rs.condition_code === code);
    if (!ruleSet) {
      console.log(`\n--- ${code}: No rule set found ---`);
      continue;
    }

    const { data: rules } = await supabase
      .from("underwriting_rules")
      .select("id, name, priority, outcome_eligibility, outcome_health_class")
      .eq("rule_set_id", ruleSet.id)
      .order("priority");

    console.log(`\n--- ${code} (${rules?.length || 0} rules) ---`);
    console.log(`Rule Set: ${ruleSet.name}`);
    for (const rule of rules || []) {
      const decision =
        rule.outcome_eligibility === "ineligible"
          ? "Decline"
          : rule.outcome_eligibility === "refer"
            ? "Refer"
            : "Accept";
      console.log(
        `  ${rule.priority}. ${rule.name.substring(0, 55)} -> ${decision}`,
      );
    }
  }

  // Summary
  const { data: allRules } = await supabase
    .from("underwriting_rules")
    .select("outcome_eligibility")
    .in("rule_set_id", ruleSets?.map((rs) => rs.id) || []);

  const summary = { accept: 0, decline: 0, refer: 0 };
  for (const rule of allRules || []) {
    if (rule.outcome_eligibility === "ineligible") summary.decline++;
    else if (rule.outcome_eligibility === "refer") summary.refer++;
    else summary.accept++;
  }

  console.log("\n=== Summary ===");
  console.log(`Accept: ${summary.accept}`);
  console.log(`Decline: ${summary.decline}`);
  console.log(`Refer: ${summary.refer}`);
  console.log(`Total: ${allRules?.length || 0}`);
}

verifyForestersRules();
