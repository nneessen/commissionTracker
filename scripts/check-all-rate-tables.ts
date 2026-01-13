import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllRateTables() {
  console.log("\n=== RATE DATA DIAGNOSTIC ===\n");

  // Check premium_matrix
  const { count: pmCount } = await supabase
    .from("premium_matrix")
    .select("*", { count: "exact", head: true });
  console.log("premium_matrix rows:", pmCount || 0);

  // Check product_rate_table (legacy)
  const { count: prtCount, error: prtError } = await supabase
    .from("product_rate_table")
    .select("*", { count: "exact", head: true });

  if (prtError) {
    console.log("product_rate_table:", prtError.message);
  } else {
    console.log("product_rate_table rows:", prtCount || 0);

    if (prtCount && prtCount > 0) {
      // Get sample data
      const { data: sample } = await supabase
        .from("product_rate_table")
        .select("*, products(name, carriers(name))")
        .limit(10);

      console.log("\n--- Sample from product_rate_table ---");
      for (const row of sample || []) {
        const prod = row.products as any;
        console.log(
          "  " +
            (prod?.carriers?.name || "Unknown") +
            " - " +
            (prod?.name || "Unknown") +
            ":",
        );
        console.log(
          "    Age " +
            row.age_band_start +
            "-" +
            row.age_band_end +
            ", " +
            row.gender +
            ", " +
            row.tobacco_class +
            ", " +
            row.health_class,
        );
        console.log("    Rate: $" + row.rate_per_thousand + "/thousand");
      }
    }
  }

  // Check products table
  const { count: prodCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
  console.log("\nActive products:", prodCount || 0);

  // List active products
  const { data: activeProducts } = await supabase
    .from("products")
    .select(
      "id, name, product_type, min_age, max_age, min_face_amount, max_face_amount, carriers(name)",
    )
    .eq("is_active", true)
    .limit(20);

  if (activeProducts && activeProducts.length > 0) {
    console.log("\n--- Active Products ---");
    for (const prod of activeProducts) {
      const carrier = (prod.carriers as any)?.name || "Unknown";
      console.log(
        "  " + carrier + " - " + prod.name + " (" + prod.product_type + ")",
      );
      console.log(
        "    Age: " +
          (prod.min_age || "N/A") +
          "-" +
          (prod.max_age || "N/A") +
          ", Face: $" +
          (prod.min_face_amount?.toLocaleString() || "N/A") +
          "-$" +
          (prod.max_face_amount?.toLocaleString() || "N/A"),
      );
    }
  }

  console.log("\n=================================\n");

  const hasPM = (pmCount || 0) > 0;
  const hasPRT = (prtCount || 0) > 0;

  if (!hasPM && !hasPRT) {
    console.log("❌ NO RATE DATA EXISTS IN ANY TABLE");
    console.log("\nTo fix this, you need to:");
    console.log("1. Import premium rates into the premium_matrix table");
    console.log("2. OR import rates into product_rate_table (legacy format)");
    console.log("\nThe premium_matrix table requires these columns per row:");
    console.log("  - product_id (UUID)");
    console.log("  - imo_id (UUID)");
    console.log("  - age (integer)");
    console.log("  - face_amount (integer, e.g. 50000, 100000)");
    console.log('  - gender ("male" or "female")');
    console.log('  - tobacco_class ("tobacco" or "non_tobacco")');
    console.log('  - health_class ("preferred", "standard", etc.)');
    console.log("  - monthly_premium (decimal)");
    console.log("  - term_years (integer or NULL for permanent products)");
  }
}

checkAllRateTables().catch(console.error);
