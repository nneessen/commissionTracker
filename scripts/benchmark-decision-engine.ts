/**
 * Decision Engine Performance Benchmark Script
 *
 * Tests performance bottlenecks identified in code review:
 * 1. Individual function timing (matrix fetch, criteria, approval, premium)
 * 2. Sequential vs parallel product evaluation
 * 3. Duplicate matrix fetch impact
 * 4. COUNT query impact in matrix service
 * 5. Batch prefetch vs per-product queries
 * 6. Full pipeline end-to-end
 *
 * Usage:
 *   npx tsx scripts/benchmark-decision-engine.ts
 *   npx tsx scripts/benchmark-decision-engine.ts --products=10
 *   npx tsx scripts/benchmark-decision-engine.ts --runs=5
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabaseKey = serviceRoleKey || anonKey;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse CLI args
const args = process.argv.slice(2).reduce(
  (acc, arg) => {
    const [key, value] = arg.replace("--", "").split("=");
    acc[key] = value || "true";
    return acc;
  },
  {} as Record<string, string>,
);

const CONFIG = {
  productCount: parseInt(args.products || "10", 10),
  runs: parseInt(args.runs || "3", 10),
  imoId: args.imoId || "", // Will be fetched dynamically
};

// ============================================================================
// Utility Functions
// ============================================================================

interface BenchmarkResult {
  name: string;
  avgMs: number;
  minMs: number;
  maxMs: number;
  runs: number;
}

async function benchmark(
  name: string,
  fn: () => Promise<void>,
  runs: number = CONFIG.runs,
): Promise<BenchmarkResult> {
  const times: number[] = [];

  // Warm-up run (not counted)
  try {
    await fn();
  } catch (e) {
    console.error(`  ❌ ${name} warm-up failed:`, e);
    return { name, avgMs: -1, minMs: -1, maxMs: -1, runs: 0 };
  }

  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }

  return {
    name,
    avgMs: times.reduce((a, b) => a + b, 0) / times.length,
    minMs: Math.min(...times),
    maxMs: Math.max(...times),
    runs,
  };
}

function formatMs(ms: number): string {
  if (ms < 0) return "FAILED";
  return ms < 1000 ? `${ms.toFixed(1)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function printResult(result: BenchmarkResult) {
  console.log(
    `  ${result.name.padEnd(45)} avg: ${formatMs(result.avgMs).padStart(10)} ` +
      `(min: ${formatMs(result.minMs)}, max: ${formatMs(result.maxMs)})`,
  );
}

function printHeader(title: string) {
  console.log(`\n${"=".repeat(75)}`);
  console.log(`  ${title}`);
  console.log("=".repeat(75));
}

function printSubheader(title: string) {
  console.log(`\n--- ${title} ---`);
}

// ============================================================================
// Data Fetching Helpers
// ============================================================================

interface Product {
  id: string;
  name: string;
  carrier_id: string;
  product_type: string;
}

async function getTestImoId(): Promise<string> {
  // Get an IMO that has premium matrix data
  const { data, error } = await supabase
    .from("premium_matrix")
    .select("imo_id")
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error("No premium matrix data found. Cannot run benchmarks.");
  }
  return data.imo_id;
}

async function getTestProducts(
  imoId: string,
  limit: number,
): Promise<Product[]> {
  // Get products that have premium matrix entries
  const { data, error } = await supabase
    .from("premium_matrix")
    .select("product_id, products(id, name, carrier_id, product_type)")
    .eq("imo_id", imoId)
    .limit(limit * 10); // Get more to dedupe

  if (error) {
    throw new Error(`Failed to get products: ${error.message}`);
  }

  // Dedupe by product_id
  const seen = new Set<string>();
  const products: Product[] = [];
  for (const row of data || []) {
    if (!seen.has(row.product_id) && row.products) {
      seen.add(row.product_id);
      const p = row.products as unknown as Product;
      products.push({
        id: row.product_id,
        name: p.name,
        carrier_id: p.carrier_id,
        product_type: p.product_type,
      });
      if (products.length >= limit) break;
    }
  }
  return products;
}

// ============================================================================
// Benchmark Tests
// ============================================================================

/**
 * Test 1: Individual Function Timing
 */
async function benchmarkIndividualFunctions(
  imoId: string,
  products: Product[],
): Promise<void> {
  printHeader("1. INDIVIDUAL FUNCTION TIMING");

  const product = products[0];
  if (!product) {
    console.log("  No products available for testing");
    return;
  }

  console.log(`  Testing with product: ${product.name} (${product.id})\n`);

  // getPremiumMatrixForProduct
  const matrixResult = await benchmark(
    "getPremiumMatrixForProduct()",
    async () => {
      await supabase
        .from("premium_matrix")
        .select("*, product:products(id, name, product_type, carrier_id)")
        .eq("product_id", product.id)
        .eq("imo_id", imoId);
    },
  );
  printResult(matrixResult);

  // COUNT query (part of getPremiumMatrixForProduct)
  const countResult = await benchmark("  └─ COUNT query only", async () => {
    await supabase
      .from("premium_matrix")
      .select("*", { count: "exact", head: true })
      .eq("product_id", product.id)
      .eq("imo_id", imoId);
  });
  printResult(countResult);

  // getExtractedCriteria equivalent
  const criteriaResult = await benchmark("getExtractedCriteria()", async () => {
    await supabase
      .from("carrier_underwriting_criteria")
      .select("criteria")
      .eq("product_id", product.id)
      .eq("review_status", "approved")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
  });
  printResult(criteriaResult);

  // loadApprovedRuleSets (part of calculateApprovalV2)
  const ruleResult = await benchmark(
    "loadApprovedRuleSets() (rule engine)",
    async () => {
      await supabase
        .from("underwriting_rule_sets")
        .select("*, rules:underwriting_rules(*)")
        .eq("imo_id", imoId)
        .eq("carrier_id", product.carrier_id)
        .eq("review_status", "approved")
        .eq("is_active", true);
    },
  );
  printResult(ruleResult);

  printSubheader("Analysis");
  const total = matrixResult.avgMs + criteriaResult.avgMs + ruleResult.avgMs;
  console.log(`  Total per-product overhead: ~${formatMs(total)}`);
  console.log(
    `  Projected for ${CONFIG.productCount} products: ~${formatMs(total * CONFIG.productCount)}`,
  );

  if (countResult.avgMs > 50) {
    console.log(
      `\n  ⚠️  COUNT query adds ${formatMs(countResult.avgMs)} per product - consider removing`,
    );
  }
}

/**
 * Test 2: Sequential vs Parallel
 */
async function benchmarkSequentialVsParallel(
  imoId: string,
  products: Product[],
): Promise<void> {
  printHeader("2. SEQUENTIAL vs PARALLEL PRODUCT EVALUATION");

  const testProducts = products.slice(0, Math.min(10, products.length));
  console.log(`  Testing with ${testProducts.length} products\n`);

  // Simulated per-product evaluation (matrix + criteria + rules)
  const evaluateProduct = async (product: Product) => {
    const [matrix, criteria, rules] = await Promise.all([
      supabase
        .from("premium_matrix")
        .select("*")
        .eq("product_id", product.id)
        .eq("imo_id", imoId)
        .limit(100),
      supabase
        .from("carrier_underwriting_criteria")
        .select("criteria")
        .eq("product_id", product.id)
        .limit(1),
      supabase
        .from("underwriting_rule_sets")
        .select("*, rules:underwriting_rules(*)")
        .eq("carrier_id", product.carrier_id)
        .eq("imo_id", imoId)
        .limit(5),
    ]);
    return { matrix, criteria, rules };
  };

  // Sequential (current implementation)
  const sequentialResult = await benchmark(
    `Sequential (${testProducts.length} products)`,
    async () => {
      for (const product of testProducts) {
        await evaluateProduct(product);
      }
    },
    CONFIG.runs,
  );
  printResult(sequentialResult);

  // Parallel (proposed optimization)
  const parallelResult = await benchmark(
    `Parallel (${testProducts.length} products)`,
    async () => {
      await Promise.all(testProducts.map(evaluateProduct));
    },
    CONFIG.runs,
  );
  printResult(parallelResult);

  printSubheader("Analysis");
  const speedup = sequentialResult.avgMs / parallelResult.avgMs;
  console.log(`  Speedup: ${speedup.toFixed(1)}x faster with parallelization`);
  console.log(
    `  Sequential: ${formatMs(sequentialResult.avgMs / testProducts.length)} per product`,
  );
  console.log(
    `  Parallel: ${formatMs(parallelResult.avgMs / testProducts.length)} effective per product`,
  );

  if (speedup > 2) {
    console.log(
      `\n  ✅ RECOMMENDATION: Parallelize product evaluation for ${speedup.toFixed(1)}x speedup`,
    );
  }
}

/**
 * Test 3: Duplicate Matrix Fetch Impact
 */
async function benchmarkDuplicateFetch(
  imoId: string,
  products: Product[],
): Promise<void> {
  printHeader("3. DUPLICATE MATRIX FETCH IMPACT");

  const product = products[0];
  if (!product) return;

  console.log(`  Testing with product: ${product.name}\n`);

  // Current: Fetch matrix twice (once in main loop, once in getPremium)
  const duplicateResult = await benchmark(
    "Current: 2x matrix fetch per product",
    async () => {
      // First fetch (in main getRecommendations loop)
      await supabase
        .from("premium_matrix")
        .select("*, product:products(id, name)")
        .eq("product_id", product.id)
        .eq("imo_id", imoId);

      // Second fetch (inside getPremium)
      await supabase
        .from("premium_matrix")
        .select("*, product:products(id, name)")
        .eq("product_id", product.id)
        .eq("imo_id", imoId);
    },
  );
  printResult(duplicateResult);

  // Optimized: Fetch once, reuse
  const singleResult = await benchmark(
    "Optimized: 1x matrix fetch, pass down",
    async () => {
      const { data: matrix } = await supabase
        .from("premium_matrix")
        .select("*, product:products(id, name)")
        .eq("product_id", product.id)
        .eq("imo_id", imoId);

      // Simulate using cached matrix (no second fetch)
      // In real implementation, matrix would be passed to getPremiumWithMatrix()
      void matrix;
    },
  );
  printResult(singleResult);

  printSubheader("Analysis");
  const savings = duplicateResult.avgMs - singleResult.avgMs;
  const percentSaved = ((savings / duplicateResult.avgMs) * 100).toFixed(1);
  console.log(`  Savings per product: ${formatMs(savings)} (${percentSaved}%)`);
  console.log(
    `  Projected savings for ${CONFIG.productCount} products: ${formatMs(savings * CONFIG.productCount)}`,
  );

  console.log(
    `\n  ⚠️  CRITICAL: Remove duplicate fetch to save ~${formatMs(savings)} per product`,
  );
}

/**
 * Test 4: COUNT Query Impact
 */
async function benchmarkCountQuery(
  imoId: string,
  products: Product[],
): Promise<void> {
  printHeader("4. COUNT QUERY IMPACT");

  const product = products[0];
  if (!product) return;

  console.log(`  Testing with product: ${product.name}\n`);

  // Current: COUNT + SELECT
  const withCountResult = await benchmark(
    "Current: COUNT + SELECT",
    async () => {
      // Step 1: COUNT
      await supabase
        .from("premium_matrix")
        .select("*", { count: "exact", head: true })
        .eq("product_id", product.id)
        .eq("imo_id", imoId);

      // Step 2: SELECT
      await supabase
        .from("premium_matrix")
        .select("*, product:products(id, name)")
        .eq("product_id", product.id)
        .eq("imo_id", imoId);
    },
  );
  printResult(withCountResult);

  // Optimized: SELECT only with limit
  const noCountResult = await benchmark(
    "Optimized: SELECT only (limit 10000)",
    async () => {
      await supabase
        .from("premium_matrix")
        .select("*, product:products(id, name)")
        .eq("product_id", product.id)
        .eq("imo_id", imoId)
        .limit(10000);
    },
  );
  printResult(noCountResult);

  printSubheader("Analysis");
  const savings = withCountResult.avgMs - noCountResult.avgMs;
  const percentSaved = ((savings / withCountResult.avgMs) * 100).toFixed(1);
  console.log(`  Savings per product: ${formatMs(savings)} (${percentSaved}%)`);

  if (savings > 20) {
    console.log(
      `\n  ⚠️  RECOMMENDATION: Remove COUNT query to save ~${formatMs(savings)} per product`,
    );
  }
}

/**
 * Test 5: Batch Prefetch vs Per-Product
 */
async function benchmarkBatchPrefetch(
  _imoId: string,
  products: Product[],
): Promise<void> {
  printHeader("5. BATCH PREFETCH vs PER-PRODUCT QUERIES");

  const testProducts = products.slice(0, Math.min(10, products.length));
  console.log(`  Testing with ${testProducts.length} products\n`);

  // Current: Per-product criteria query
  const perProductResult = await benchmark(
    `Per-product criteria (${testProducts.length} queries)`,
    async () => {
      for (const product of testProducts) {
        await supabase
          .from("carrier_underwriting_criteria")
          .select("criteria")
          .eq("product_id", product.id)
          .limit(1);
      }
    },
  );
  printResult(perProductResult);

  // Optimized: Batch prefetch with IN clause
  const batchResult = await benchmark(
    "Batch prefetch (1 query with IN)",
    async () => {
      const productIds = testProducts.map((p) => p.id);
      await supabase
        .from("carrier_underwriting_criteria")
        .select("product_id, criteria")
        .in("product_id", productIds);
    },
  );
  printResult(batchResult);

  printSubheader("Analysis");
  const speedup = perProductResult.avgMs / batchResult.avgMs;
  console.log(`  Speedup: ${speedup.toFixed(1)}x faster with batch prefetch`);

  if (speedup > 2) {
    console.log(
      `\n  ✅ RECOMMENDATION: Use batch prefetch for ${speedup.toFixed(1)}x speedup`,
    );
  }
}

/**
 * Test 6: Full Pipeline Simulation
 */
async function benchmarkFullPipeline(
  imoId: string,
  products: Product[],
): Promise<void> {
  printHeader("6. FULL PIPELINE SIMULATION");

  const testProducts = products.slice(
    0,
    Math.min(CONFIG.productCount, products.length),
  );
  console.log(
    `  Simulating getRecommendations() with ${testProducts.length} products\n`,
  );

  // Simulate current sequential implementation
  const currentResult = await benchmark(
    "Current: Sequential with duplicate fetches",
    async () => {
      for (const product of testProducts) {
        // Matrix fetch #1 (in main loop)
        await supabase
          .from("premium_matrix")
          .select("*", { count: "exact", head: true })
          .eq("product_id", product.id)
          .eq("imo_id", imoId);
        await supabase
          .from("premium_matrix")
          .select("*")
          .eq("product_id", product.id)
          .eq("imo_id", imoId);

        // Criteria
        await supabase
          .from("carrier_underwriting_criteria")
          .select("criteria")
          .eq("product_id", product.id)
          .limit(1);

        // Rules
        await supabase
          .from("underwriting_rule_sets")
          .select("*, rules:underwriting_rules(*)")
          .eq("carrier_id", product.carrier_id)
          .eq("imo_id", imoId)
          .limit(5);

        // Matrix fetch #2 (in getPremium - DUPLICATE)
        await supabase
          .from("premium_matrix")
          .select("*")
          .eq("product_id", product.id)
          .eq("imo_id", imoId);
      }
    },
    1, // Only 1 run for full pipeline
  );
  printResult(currentResult);

  // Simulate optimized parallel implementation
  const optimizedResult = await benchmark(
    "Optimized: Parallel, no duplicates, batch prefetch",
    async () => {
      // Batch prefetch criteria for all products
      const productIds = testProducts.map((p) => p.id);
      const criteriaPromise = supabase
        .from("carrier_underwriting_criteria")
        .select("product_id, criteria")
        .in("product_id", productIds);

      // Parallel product evaluation (no duplicate matrix fetch)
      const productPromises = testProducts.map(async (product) => {
        const [matrix, rules] = await Promise.all([
          supabase
            .from("premium_matrix")
            .select("*")
            .eq("product_id", product.id)
            .eq("imo_id", imoId)
            .limit(10000), // No COUNT, just SELECT with limit
          supabase
            .from("underwriting_rule_sets")
            .select("*, rules:underwriting_rules(*)")
            .eq("carrier_id", product.carrier_id)
            .eq("imo_id", imoId)
            .limit(5),
        ]);
        return { matrix, rules };
      });

      await Promise.all([criteriaPromise, ...productPromises]);
    },
    1,
  );
  printResult(optimizedResult);

  printSubheader("Analysis");
  const speedup = currentResult.avgMs / optimizedResult.avgMs;
  const timeSaved = currentResult.avgMs - optimizedResult.avgMs;
  console.log(`  Current implementation: ${formatMs(currentResult.avgMs)}`);
  console.log(`  Optimized implementation: ${formatMs(optimizedResult.avgMs)}`);
  console.log(`  Speedup: ${speedup.toFixed(1)}x`);
  console.log(`  Time saved: ${formatMs(timeSaved)}`);

  if (currentResult.avgMs > 5000) {
    console.log(
      `\n  🔴 CRITICAL: Current pipeline takes ${formatMs(currentResult.avgMs)} - needs optimization`,
    );
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("\n" + "█".repeat(75));
  console.log("  Decision Engine Performance Benchmark");
  console.log("█".repeat(75));
  console.log(`\n  Runs per test: ${CONFIG.runs}`);
  console.log(`  Target product count: ${CONFIG.productCount}`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);

  try {
    // Get test data
    const imoId = CONFIG.imoId || (await getTestImoId());
    console.log(`  IMO ID: ${imoId}`);

    const products = await getTestProducts(imoId, CONFIG.productCount);
    console.log(`  Products found: ${products.length}`);

    if (products.length === 0) {
      console.error("\n  ❌ No products with premium matrix data found.");
      process.exit(1);
    }

    // Run all benchmarks
    await benchmarkIndividualFunctions(imoId, products);
    await benchmarkSequentialVsParallel(imoId, products);
    await benchmarkDuplicateFetch(imoId, products);
    await benchmarkCountQuery(imoId, products);
    await benchmarkBatchPrefetch(imoId, products);
    await benchmarkFullPipeline(imoId, products);

    // Summary
    printHeader("SUMMARY & RECOMMENDATIONS");
    console.log(`
  Based on the benchmarks above, prioritize these optimizations:

  1. 🔴 CRITICAL: Remove duplicate matrix fetch in getPremium()
     - File: src/services/underwriting/decisionEngine.ts:602
     - Pass matrix as parameter instead of re-fetching

  2. 🔴 CRITICAL: Parallelize product evaluation
     - File: src/services/underwriting/decisionEngine.ts:850-1200
     - Use Promise.all() with concurrency limit

  3. 🟠 HIGH: Remove COUNT query in getPremiumMatrixForProduct()
     - File: src/services/underwriting/premiumMatrixService.ts:401-406
     - Use SELECT with limit instead

  4. 🟠 HIGH: Batch prefetch criteria before product loop
     - File: src/services/underwriting/decisionEngine.ts
     - Single query with IN clause instead of N queries

  Run again after each optimization to measure improvement:
    npx tsx scripts/benchmark-decision-engine.ts --products=${CONFIG.productCount}
`);
  } catch (error) {
    console.error("\n  ❌ Benchmark failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);
