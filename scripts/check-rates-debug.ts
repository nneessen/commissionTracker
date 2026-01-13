import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load env
dotenv.config({ path: ".env.local" });

const url = process.env.VITE_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log("Supabase URL:", url?.slice(0, 40) + "...");
console.log("Using service key:", Boolean(serviceKey));

const supabase = createClient(url!, serviceKey || anonKey!);

async function check() {
  console.log("\n=== Checking all rate-related tables ===\n");

  // Check premium_matrix
  const { count: pmCount, error: pmError } = await supabase
    .from("premium_matrix")
    .select("*", { count: "exact", head: true });
  console.log("premium_matrix rows:", pmCount, pmError?.message || "");

  // Check product_rate_table
  const { count: prtCount, error: prtError } = await supabase
    .from("product_rate_table")
    .select("*", { count: "exact", head: true });
  console.log("product_rate_table rows:", prtCount, prtError?.message || "");

  // If product_rate_table has data, show sample
  if (prtCount && prtCount > 0) {
    const { data: sample } = await supabase
      .from("product_rate_table")
      .select(
        "product_id, gender, health_class, tobacco_class, age, face_amount, monthly_premium, term_years",
      )
      .limit(5);

    console.log("\nSample from product_rate_table:");
    console.log(JSON.stringify(sample, null, 2));

    // Get unique values
    const { data: all } = await supabase
      .from("product_rate_table")
      .select("gender, health_class, tobacco_class, term_years")
      .limit(5000);

    if (all) {
      console.log("\nUnique genders:", [...new Set(all.map((r) => r.gender))]);
      console.log("Unique health_class:", [
        ...new Set(all.map((r) => r.health_class)),
      ]);
      console.log("Unique tobacco_class:", [
        ...new Set(all.map((r) => r.tobacco_class)),
      ]);
      console.log("Unique term_years:", [
        ...new Set(all.map((r) => r.term_years)),
      ]);
    }
  }

  // Check products table
  const { count: prodCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });
  console.log("\nproducts table rows:", prodCount);
}

check().catch(console.error);
