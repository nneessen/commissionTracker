import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStringValue = (value: unknown): string => String(value);

const getNameOrUnknown = (value: unknown): string => {
  if (!isRecord(value)) return "Unknown";
  const name = value.name;
  return typeof name === "string" ? name : "Unknown";
};

const formatAmount = (value: unknown): string => {
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string" && value.length > 0) return value;
  return "N/A";
};

async function checkProducts() {
  console.log("\n=== PRODUCTS DIAGNOSTIC ===\n");

  // Check ALL products (regardless of active status)
  const {
    data: allProducts,
    count: totalCount,
    error,
  } = await supabase
    .from("products")
    .select(
      "id, name, product_type, is_active, min_age, max_age, min_face_amount, max_face_amount, imo_id, carriers(name)",
      { count: "exact" },
    )
    .limit(50);

  if (error) {
    console.log("Error querying products:", error.message);
    return;
  }

  console.log("Total products in database:", totalCount);

  if (totalCount === 0) {
    console.log("\n❌ NO PRODUCTS EXIST IN THE DATABASE");
    console.log("\nYou need to:");
    console.log("1. Add carrier records to the carriers table");
    console.log("2. Add product records to the products table");
    console.log("3. Add premium rate data to premium_matrix table");
    return;
  }

  const activeCount = allProducts?.filter((p) => p.is_active).length || 0;
  const inactiveCount = allProducts?.filter((p) => !p.is_active).length || 0;

  console.log("Active products:", activeCount);
  console.log("Inactive products:", inactiveCount);

  console.log("\n--- All Products ---");
  const productRows = Array.isArray(allProducts) ? allProducts : [];
  for (const prod of productRows) {
    if (!isRecord(prod)) continue;
    const carrier = getNameOrUnknown(prod.carriers);
    const status = prod.is_active ? "✓ Active" : "✗ Inactive";
    console.log(
      "  " +
        status +
        " | " +
        carrier +
        " - " +
        getStringValue(prod.name) +
        " (" +
        getStringValue(prod.product_type) +
        ")",
    );
    console.log(
      "    Age: " +
        (prod.min_age ? getStringValue(prod.min_age) : "N/A") +
        "-" +
        (prod.max_age ? getStringValue(prod.max_age) : "N/A"),
    );
    console.log(
      "    Face: $" +
        formatAmount(prod.min_face_amount) +
        "-$" +
        formatAmount(prod.max_face_amount),
    );
    console.log(
      "    IMO: " +
        (prod.imo_id ? getStringValue(prod.imo_id) : "NULL (global)"),
    );
  }

  // Check carriers
  const { data: carriers, count: carrierCount } = await supabase
    .from("carriers")
    .select("id, name, is_active", { count: "exact" })
    .limit(20);

  console.log("\n--- Carriers ---");
  console.log("Total carriers:", carrierCount);
  for (const c of carriers || []) {
    const status = c.is_active ? "✓" : "✗";
    console.log("  " + status + " " + c.name + " (" + c.id + ")");
  }

  // Check IMOs
  const { data: imos, count: imoCount } = await supabase
    .from("imos")
    .select("id, name", { count: "exact" })
    .limit(10);

  console.log("\n--- IMOs ---");
  console.log("Total IMOs:", imoCount);
  for (const imo of imos || []) {
    console.log("  " + imo.name + " (" + imo.id + ")");
  }

  console.log("\n=================================\n");
}

checkProducts().catch(console.error);
