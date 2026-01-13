import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPremiumMatrix() {
  console.log("\n=== PREMIUM MATRIX DIAGNOSTIC ===\n");

  // Total row count
  const { count: totalCount, error: countError } = await supabase
    .from("premium_matrix")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.log("Error querying premium_matrix:", countError.message);
    return;
  }

  console.log(`Total rows in premium_matrix: ${totalCount}`);

  if (totalCount === 0) {
    console.log("\n❌ PROBLEM: premium_matrix table is EMPTY!");
    console.log('This is why you see "No rate table matches found".');
    console.log("\nYou need to populate this table with premium rate data.");
    return;
  }

  // Get breakdown by product
  const { data: products, error: prodError } = await supabase
    .from("premium_matrix")
    .select("product_id, products(name, carrier_id, carriers(name))")
    .limit(1000);

  if (prodError) {
    console.log("Error getting products:", prodError.message);
  } else {
    const productCounts = new Map<
      string,
      { name: string; carrier: string; count: number }
    >();
    for (const row of products || []) {
      const key = row.product_id;
      const existing = productCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        const prod = row.products as any;
        productCounts.set(key, {
          name: prod?.name || "Unknown",
          carrier: prod?.carriers?.name || "Unknown",
          count: 1,
        });
      }
    }

    console.log("\n--- Products with rate data ---");
    for (const [_id, info] of productCounts) {
      console.log(`  ${info.carrier} - ${info.name}: ${info.count} rate rows`);
    }
  }

  // Get unique dimensions
  const { data: sample } = await supabase
    .from("premium_matrix")
    .select("gender, tobacco_class, health_class, term_years, age, face_amount")
    .limit(5000);

  if (sample && sample.length > 0) {
    const genders = [...new Set(sample.map((r) => r.gender))];
    const tobaccoClasses = [...new Set(sample.map((r) => r.tobacco_class))];
    const healthClasses = [...new Set(sample.map((r) => r.health_class))];
    const termYears = [...new Set(sample.map((r) => r.term_years))];
    const ages = [...new Set(sample.map((r) => r.age))].sort((a, b) => a - b);
    const faceAmounts = [...new Set(sample.map((r) => r.face_amount))].sort(
      (a, b) => a - b,
    );

    console.log("\n--- Available Dimensions ---");
    console.log("  Genders:", genders);
    console.log("  Tobacco classes:", tobaccoClasses);
    console.log("  Health classes:", healthClasses);
    console.log("  Term years:", termYears);
    console.log(
      "  Age range:",
      Math.min(...ages),
      "-",
      Math.max(...ages),
      `(${ages.length} values)`,
    );
    console.log(
      "  Face amounts:",
      faceAmounts.map((f) => `$${f.toLocaleString()}`).join(", "),
    );
  }

  // Check which IMOs have data
  const { data: imos } = await supabase
    .from("premium_matrix")
    .select("imo_id, imos(name)")
    .limit(100);

  if (imos && imos.length > 0) {
    const imoSet = new Map<string, string>();
    for (const row of imos) {
      if (!imoSet.has(row.imo_id)) {
        imoSet.set(row.imo_id, (row.imos as any)?.name || "Unknown");
      }
    }
    console.log("\n--- IMOs with rate data ---");
    for (const [id, name] of imoSet) {
      console.log(`  ${name} (${id})`);
    }
  }

  console.log("\n=================================\n");
}

checkPremiumMatrix().catch(console.error);
