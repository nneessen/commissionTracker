/**
 * BaseRepository Performance Benchmark Script
 *
 * Tests performance characteristics identified in code review:
 * 1. Count: exact vs estimated
 * 2. Pagination: offset vs keyset
 * 3. Payload size: select * vs specific columns
 * 4. Concurrent load handling
 * 5. ORDER BY created_at (index impact)
 *
 * Usage:
 *   npx tsx scripts/benchmark-base-repository.ts
 *   npx tsx scripts/benchmark-base-repository.ts --table=commissions
 *   npx tsx scripts/benchmark-base-repository.ts --runs=5
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
// Prefer service role key for benchmarking (bypasses RLS)
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabaseKey = serviceRoleKey || anonKey;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const usingServiceRole = Boolean(serviceRoleKey);
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
  table: args.table || "clients", // Default to clients (has data, accessible via anon key)
  runs: parseInt(args.runs || "3", 10),
  verbose: args.verbose === "true",
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
  await fn();

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
  return ms < 1000 ? `${ms.toFixed(1)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function printResult(result: BenchmarkResult) {
  console.log(
    `  ${result.name.padEnd(40)} avg: ${formatMs(result.avgMs).padStart(10)} ` +
      `(min: ${formatMs(result.minMs)}, max: ${formatMs(result.maxMs)})`,
  );
}

function printHeader(title: string) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`  ${title}`);
  console.log("=".repeat(70));
}

function printSubheader(title: string) {
  console.log(`\n--- ${title} ---`);
}

// ============================================================================
// Benchmark Tests
// ============================================================================

async function getTableRowCount(table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) throw new Error(`Failed to count ${table}: ${error.message}`);
  return count || 0;
}

/**
 * Test 1: Count Performance (exact vs estimated vs planned)
 */
async function benchmarkCount(table: string): Promise<void> {
  printHeader("1. COUNT PERFORMANCE");

  const rowCount = await getTableRowCount(table);
  console.log(`  Table: ${table} (${rowCount.toLocaleString()} rows)\n`);

  // Exact count
  const exactResult = await benchmark("count: exact", async () => {
    await supabase.from(table).select("*", { count: "exact", head: true });
  });

  // Estimated count (if supported)
  let estimatedResult: BenchmarkResult | null = null;
  try {
    estimatedResult = await benchmark("count: estimated", async () => {
      await supabase
        .from(table)
        .select("*", { count: "estimated", head: true });
    });
  } catch {
    console.log("  count: estimated - NOT SUPPORTED by this PostgREST version");
  }

  // Planned count (uses pg_class)
  const plannedResult = await benchmark("count: planned", async () => {
    await supabase.from(table).select("*", { count: "planned", head: true });
  });

  printResult(exactResult);
  if (estimatedResult) printResult(estimatedResult);
  printResult(plannedResult);

  // Analysis
  printSubheader("Analysis");
  if (estimatedResult) {
    const speedup = exactResult.avgMs / estimatedResult.avgMs;
    console.log(`  estimated is ${speedup.toFixed(1)}x faster than exact`);
  }
  const plannedSpeedup = exactResult.avgMs / plannedResult.avgMs;
  console.log(`  planned is ${plannedSpeedup.toFixed(1)}x faster than exact`);

  if (rowCount > 10000 && exactResult.avgMs > 100) {
    console.log(
      `\n  ⚠️  RECOMMENDATION: Use estimated/planned for tables with ${rowCount.toLocaleString()}+ rows`,
    );
  }
}

/**
 * Test 2: Pagination Performance (offset vs keyset)
 */
async function benchmarkPagination(table: string): Promise<void> {
  printHeader("2. PAGINATION PERFORMANCE (offset vs keyset)");

  const rowCount = await getTableRowCount(table);
  console.log(`  Table: ${table} (${rowCount.toLocaleString()} rows)\n`);

  const pageSize = 50;
  const offsets = [0, 100, 500, 1000, 2000, 5000].filter((o) => o < rowCount);

  printSubheader("Offset-based pagination");
  const offsetResults: BenchmarkResult[] = [];

  for (const offset of offsets) {
    const result = await benchmark(`offset=${offset}`, async () => {
      await supabase
        .from(table)
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);
    });
    offsetResults.push(result);
    printResult(result);
  }

  printSubheader("Keyset-based pagination");
  const keysetResults: BenchmarkResult[] = [];

  // Get cursor values at equivalent positions
  const { data: cursorData } = await supabase
    .from(table)
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(Math.max(...offsets) + pageSize);

  for (let i = 0; i < offsets.length; i++) {
    const offset = offsets[i];
    const cursorValue = cursorData?.[offset]?.created_at;

    if (!cursorValue && offset > 0) {
      console.log(
        `  page ${i + 1} (equivalent to offset=${offset}) - SKIPPED (not enough data)`,
      );
      continue;
    }

    const result = await benchmark(
      `keyset page ${i + 1} (≈offset=${offset})`,
      async () => {
        let query = supabase
          .from(table)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(pageSize);

        if (cursorValue) {
          query = query.lt("created_at", cursorValue);
        }

        await query;
      },
    );
    keysetResults.push(result);
    printResult(result);
  }

  // Analysis
  printSubheader("Analysis");
  if (offsetResults.length >= 2 && keysetResults.length >= 2) {
    const offsetDegradation =
      offsetResults[offsetResults.length - 1].avgMs / offsetResults[0].avgMs;
    const keysetDegradation =
      keysetResults[keysetResults.length - 1].avgMs / keysetResults[0].avgMs;

    console.log(
      `  Offset pagination degradation: ${offsetDegradation.toFixed(1)}x slower at deep pages`,
    );
    console.log(
      `  Keyset pagination degradation: ${keysetDegradation.toFixed(1)}x slower at deep pages`,
    );

    if (offsetDegradation > 2 && keysetDegradation < offsetDegradation) {
      console.log(
        `\n  ⚠️  RECOMMENDATION: Switch to keyset pagination for better deep-page performance`,
      );
    }
  }
}

/**
 * Test 3: Payload Size (select * vs specific columns)
 */
async function benchmarkPayloadSize(table: string): Promise<void> {
  printHeader("3. PAYLOAD SIZE (select * vs specific columns)");

  const limit = 100;

  // Full select
  const startFull = performance.now();
  const { data: fullData } = await supabase
    .from(table)
    .select("*")
    .limit(limit);
  const fullTime = performance.now() - startFull;
  const fullSize = JSON.stringify(fullData || []).length;

  // Minimal select (common columns)
  const minimalColumns = "id, created_at, updated_at";
  const startMinimal = performance.now();
  const { data: minimalData } = await supabase
    .from(table)
    .select(minimalColumns)
    .limit(limit);
  const minimalTime = performance.now() - startMinimal;
  const minimalSize = JSON.stringify(minimalData || []).length;

  // Medium select (typical use case columns vary by table)
  const mediumColumns = getMediumColumns(table);
  const startMedium = performance.now();
  const { data: mediumData } = await supabase
    .from(table)
    .select(mediumColumns)
    .limit(limit);
  const mediumTime = performance.now() - startMedium;
  const mediumSize = JSON.stringify(mediumData || []).length;

  console.log(`  Table: ${table} (${limit} rows fetched)\n`);

  console.log(
    `  select("*")`.padEnd(45) +
      `${formatBytes(fullSize).padStart(12)} in ${formatMs(fullTime)}`,
  );
  console.log(
    `  select("${mediumColumns.substring(0, 30)}...")`.padEnd(45) +
      `${formatBytes(mediumSize).padStart(12)} in ${formatMs(mediumTime)}`,
  );
  console.log(
    `  select("${minimalColumns}")`.padEnd(45) +
      `${formatBytes(minimalSize).padStart(12)} in ${formatMs(minimalTime)}`,
  );

  printSubheader("Analysis");
  const reduction = ((1 - minimalSize / fullSize) * 100).toFixed(1);
  const mediumReduction = ((1 - mediumSize / fullSize) * 100).toFixed(1);
  console.log(`  Minimal select reduces payload by ${reduction}%`);
  console.log(`  Medium select reduces payload by ${mediumReduction}%`);

  if (fullSize > 50000) {
    console.log(
      `\n  ⚠️  RECOMMENDATION: Add column selection to QueryOptions for large payloads`,
    );
  }
}

function getMediumColumns(table: string): string {
  const columnMap: Record<string, string> = {
    policies:
      "id, policy_number, status, annual_premium, user_id, carrier_id, created_at",
    commissions:
      "id, amount, status, policy_id, user_id, payment_date, created_at",
    clients: "id, name, email, phone, user_id, created_at",
    users: "id, email, full_name, role, created_at",
  };
  return columnMap[table] || "id, created_at, updated_at";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Test 4: Concurrent Load
 */
async function benchmarkConcurrency(table: string): Promise<void> {
  printHeader("4. CONCURRENT LOAD HANDLING");

  const concurrencyLevels = [1, 5, 10, 25];
  const pageSize = 50;

  console.log(`  Table: ${table}\n`);

  const results: {
    concurrency: number;
    totalMs: number;
    avgPerRequest: number;
  }[] = [];

  for (const n of concurrencyLevels) {
    const start = performance.now();

    await Promise.all(
      Array(n)
        .fill(null)
        .map(() =>
          supabase
            .from(table)
            .select("*")
            .order("created_at", { ascending: false })
            .limit(pageSize),
        ),
    );

    const totalMs = performance.now() - start;
    results.push({
      concurrency: n,
      totalMs,
      avgPerRequest: totalMs / n,
    });

    console.log(
      `  ${n} concurrent requests:`.padEnd(30) +
        `total: ${formatMs(totalMs).padStart(10)}, ` +
        `avg/request: ${formatMs(totalMs / n)}`,
    );
  }

  printSubheader("Analysis");
  const scalingFactor =
    results[results.length - 1].avgPerRequest / results[0].totalMs;
  console.log(
    `  Scaling factor: ${scalingFactor.toFixed(2)}x slower per-request at ${
      results[results.length - 1].concurrency
    } concurrent`,
  );

  if (scalingFactor > 3) {
    console.log(
      `\n  ⚠️  WARNING: Significant performance degradation under concurrent load`,
    );
  }
}

/**
 * Test 5: ORDER BY created_at (index impact)
 */
async function benchmarkOrderBy(table: string): Promise<void> {
  printHeader("5. ORDER BY PERFORMANCE (index impact)");

  const rowCount = await getTableRowCount(table);
  console.log(`  Table: ${table} (${rowCount.toLocaleString()} rows)\n`);

  // Test different order columns
  const orderTests = [
    { column: "created_at", direction: "desc" as const },
    { column: "created_at", direction: "asc" as const },
    { column: "id", direction: "desc" as const },
  ];

  for (const test of orderTests) {
    const result = await benchmark(
      `ORDER BY ${test.column} ${test.direction.toUpperCase()}`,
      async () => {
        await supabase
          .from(table)
          .select("*")
          .order(test.column, { ascending: test.direction === "asc" })
          .limit(50);
      },
    );
    printResult(result);
  }

  // Test without explicit order
  const noOrderResult = await benchmark("No ORDER BY (default)", async () => {
    await supabase.from(table).select("*").limit(50);
  });
  printResult(noOrderResult);

  printSubheader("Note");
  console.log(
    "  If ORDER BY created_at is significantly slower than ORDER BY id,",
  );
  console.log(
    "  consider adding: CREATE INDEX idx_" +
      table +
      "_created_at ON " +
      table +
      "(created_at DESC)",
  );
}

/**
 * Test 6: createMany batch size simulation
 */
async function benchmarkBatchInsertSimulation(): Promise<void> {
  printHeader("6. BATCH INSERT PAYLOAD SIZE ANALYSIS");

  console.log("  Note: This simulates payload sizes without actual inserts\n");

  // Simulate different batch sizes
  const batchSizes = [10, 50, 100, 250, 500, 1000];
  const sampleRow = {
    id: "00000000-0000-0000-0000-000000000000",
    policy_number: "POL-123456",
    status: "active",
    annual_premium: 1200.0,
    monthly_premium: 100.0,
    user_id: "00000000-0000-0000-0000-000000000000",
    carrier_id: "00000000-0000-0000-0000-000000000000",
    client_id: "00000000-0000-0000-0000-000000000000",
    effective_date: "2024-01-01",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  for (const size of batchSizes) {
    const batch = Array(size).fill(sampleRow);
    const payloadSize = JSON.stringify(batch).length;
    const estimatedMB = (payloadSize / (1024 * 1024)).toFixed(2);

    const status =
      payloadSize > 5 * 1024 * 1024
        ? "⚠️  EXCEEDS 5MB"
        : payloadSize > 1024 * 1024
          ? "⚠️  Large"
          : "✓ OK";

    console.log(
      `  ${size} rows:`.padEnd(15) +
        `${formatBytes(payloadSize).padStart(12)} (${estimatedMB} MB) ${status}`,
    );
  }

  printSubheader("Recommendation");
  console.log(
    "  Keep batch inserts under 500 rows to stay well under payload limits",
  );
  console.log("  Current atomic insert is correct for data integrity");
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("\n" + "█".repeat(70));
  console.log("  BaseRepository Performance Benchmark");
  console.log("█".repeat(70));
  console.log(`\n  Target table: ${CONFIG.table}`);
  console.log(`  Runs per test: ${CONFIG.runs}`);
  console.log(
    `  Auth mode: ${usingServiceRole ? "service_role (bypasses RLS)" : "anon_key (subject to RLS)"}`,
  );
  console.log(`  Timestamp: ${new Date().toISOString()}`);

  if (!usingServiceRole) {
    console.log(
      `\n  ⚠️  Using anon key - some tables may show 0 rows due to RLS`,
    );
    console.log(
      `     Set SUPABASE_SERVICE_ROLE_KEY in .env.local for full access`,
    );
  }

  try {
    // Verify table exists and get row count
    const rowCount = await getTableRowCount(CONFIG.table);
    console.log(`  Row count: ${rowCount.toLocaleString()}`);

    if (rowCount === 0) {
      console.log(
        `\n  ⚠️  Table ${CONFIG.table} is empty. Some tests may not be meaningful.\n`,
      );
    }

    // Run all benchmarks
    await benchmarkCount(CONFIG.table);
    await benchmarkPagination(CONFIG.table);
    await benchmarkPayloadSize(CONFIG.table);
    await benchmarkConcurrency(CONFIG.table);
    await benchmarkOrderBy(CONFIG.table);
    await benchmarkBatchInsertSimulation();

    // Summary
    printHeader("SUMMARY");
    console.log(`
  Review the results above for:

  1. COUNT: If exact count is slow (>100ms), use estimated/planned for UI
  2. PAGINATION: If offset degrades >2x at deep pages, use keyset pagination
  3. PAYLOAD: If select("*") returns >50KB, add column selection
  4. CONCURRENCY: If >3x degradation, review connection pooling
  5. ORDER BY: If created_at is slow, add index

  Run with different tables:
    npx tsx scripts/benchmark-base-repository.ts --table=commissions
    npx tsx scripts/benchmark-base-repository.ts --table=clients
`);
  } catch (error) {
    console.error("\n  ❌ Benchmark failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);
