import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getNameOrUnknown = (value: unknown): string => {
  if (!isRecord(value)) return "Unknown";
  const name = value.name;
  return typeof name === "string" ? name : "Unknown";
};

const formatValue = (value: unknown): string => String(value);
const formatLocale = (value: unknown): string => {
  if (
    value &&
    typeof (value as { toLocaleString?: unknown }).toLocaleString === "function"
  ) {
    return String((value as { toLocaleString: () => string }).toLocaleString());
  }
  return String(value);
};

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
    const productRows = Array.isArray(products) ? products : [];
    for (const row of productRows) {
      if (!isRecord(row)) continue;
      const key = row.product_id;
      const existing = productCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        const product = isRecord(row.products) ? row.products : null;
        productCounts.set(key, {
          name: getNameOrUnknown(product),
          carrier: getNameOrUnknown(product?.carriers),
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
    const sampleRows = Array.isArray(sample) ? sample : [];
    const genders: unknown[] = [];
    const tobaccoClasses: unknown[] = [];
    const healthClasses: unknown[] = [];
    const termYears: unknown[] = [];
    const agesRaw: unknown[] = [];
    const faceAmountsRaw: unknown[] = [];

    for (const row of sampleRows) {
      if (!isRecord(row)) continue;
      genders.push(row.gender);
      tobaccoClasses.push(row.tobacco_class);
      healthClasses.push(row.health_class);
      termYears.push(row.term_years);
      agesRaw.push(row.age);
      faceAmountsRaw.push(row.face_amount);
    }

    const gendersUnique = [...new Set(genders)];
    const tobaccoClassesUnique = [...new Set(tobaccoClasses)];
    const healthClassesUnique = [...new Set(healthClasses)];
    const termYearsUnique = [...new Set(termYears)];
    const ages = [...new Set(agesRaw)].sort((a, b) => Number(a) - Number(b));
    const faceAmounts = [...new Set(faceAmountsRaw)].sort(
      (a, b) => Number(a) - Number(b),
    );

    console.log("\n--- Available Dimensions ---");
    console.log("  Genders:", gendersUnique);
    console.log("  Tobacco classes:", tobaccoClassesUnique);
    console.log("  Health classes:", healthClassesUnique);
    console.log("  Term years:", termYearsUnique);
    console.log(
      "  Age range:",
      Math.min(...ages.map((age) => Number(age))),
      "-",
      Math.max(...ages.map((age) => Number(age))),
      `(${ages.length} values)`,
    );
    console.log(
      "  Face amounts:",
      faceAmounts.map((f) => `$${formatLocale(f)}`).join(", "),
    );
  }

  // Check which IMOs have data
  const { data: imos } = await supabase
    .from("premium_matrix")
    .select("imo_id, imos(name)")
    .limit(100);

  if (imos && imos.length > 0) {
    const imoSet = new Map<unknown, string>();
    const imoRows = Array.isArray(imos) ? imos : [];
    for (const row of imoRows) {
      if (!isRecord(row)) continue;
      if (!imoSet.has(row.imo_id)) {
        const imoRecord = isRecord(row.imos) ? row.imos : null;
        imoSet.set(row.imo_id, getNameOrUnknown(imoRecord));
      }
    }
    console.log("\n--- IMOs with rate data ---");
    for (const [id, name] of imoSet) {
      console.log(`  ${name} (${formatValue(id)})`);
    }
  }

  console.log("\n=================================\n");
}

checkPremiumMatrix().catch(console.error);
