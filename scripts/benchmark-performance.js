import { createClient } from "@supabase/supabase-js";
import { performance } from "node:perf_hooks";
import { writeFile } from "node:fs/promises";
import dotenv from "dotenv";
import { Client as PgClient } from "pg";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials.");
  console.error(
    "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY).",
  );
  process.exit(1);
}

const config = {
  table: process.env.BENCH_TABLE || "policies",
  orderColumn: process.env.BENCH_ORDER_COLUMN || "created_at",
  idColumn: process.env.BENCH_ID_COLUMN || "id",
  pageSize: parseIntEnv("BENCH_PAGE_SIZE", 50),
  payloadLimit: parseIntEnv("BENCH_PAYLOAD_LIMIT", 100),
  offsets: parseIntListEnv("BENCH_OFFSETS", [0, 1000, 5000, 10000]),
  concurrencyLevels: parseIntListEnv("BENCH_CONCURRENCY", [1, 5, 10, 25]),
  repeats: parseIntEnv("BENCH_REPEATS", 3),
  keysetPages: parseIntEnv("BENCH_KEYSET_PAGES", null),
  slimColumns: parseListEnv("BENCH_SLIM_COLUMNS", null),
  paginationColumns: parseListEnv("BENCH_PAGINATION_COLUMNS", null),
  outputPath: process.env.BENCH_OUTPUT || null,
};

if (!config.keysetPages) {
  config.keysetPages = config.offsets.length;
}

if (!config.slimColumns) {
  config.slimColumns = [config.idColumn, config.orderColumn];
}

if (!config.paginationColumns) {
  config.paginationColumns = [config.idColumn, config.orderColumn];
}

const supabase = createClient(supabaseUrl, supabaseKey);

const report = {
  startedAt: new Date().toISOString(),
  config,
  results: {},
};

async function main() {
  console.log("=== Supabase Performance Benchmark ===");
  console.log(`Table: ${config.table}`);
  console.log(
    `Order: ${config.orderColumn} DESC (id: ${config.idColumn || "none"})`,
  );
  console.log(`Repeats: ${config.repeats}`);
  console.log("");

  report.results.count = await runCountBench();
  report.results.pagination = await runPaginationBench();
  report.results.payload = await runPayloadBench();
  report.results.concurrency = await runConcurrencyBench();
  report.results.explain = await runExplainBench();

  report.finishedAt = new Date().toISOString();

  console.log("\n=== Benchmark Complete ===");

  if (config.outputPath) {
    await writeFile(
      config.outputPath,
      JSON.stringify(report, null, 2),
      "utf8",
    );
    console.log(`Report written to ${config.outputPath}`);
  } else {
    console.log("Set BENCH_OUTPUT to write a JSON report to disk.");
  }
}

async function runCountBench() {
  console.log("Count performance (exact vs estimated)");

  const exact = await timedQuery("count_exact", () =>
    supabase
      .from(config.table)
      .select(config.idColumn, { count: "exact", head: true }),
  );
  const estimated = await timedQuery("count_estimated", () =>
    supabase
      .from(config.table)
      .select(config.idColumn, { count: "estimated", head: true }),
  );

  const ratio = ratioValue(exact.stats.avgMs, estimated.stats.avgMs);

  logStatLine("exact", exact.stats, exact.lastCount);
  logStatLine("estimated", estimated.stats, estimated.lastCount);
  console.log(`ratio exact/estimated: ${formatNumber(ratio)}`);
  console.log("");

  return {
    exact,
    estimated,
    ratio,
  };
}

async function runPaginationBench() {
  console.log("Pagination performance (offset vs keyset)");

  const offsetResults = [];
  for (const offset of config.offsets) {
    const result = await timedQuery(`offset_${offset}`, () =>
      supabase
        .from(config.table)
        .select(config.paginationColumns.join(","))
        .order(config.orderColumn, { ascending: false })
        .range(offset, offset + config.pageSize - 1),
    );

    offsetResults.push({
      offset,
      stats: result.stats,
      errors: result.errors,
    });
    logStatLine(`offset=${offset}`, result.stats);
  }

  const keysetRuns = [];
  for (let i = 0; i < config.repeats; i++) {
    keysetRuns.push(await runKeysetPass());
  }
  const keysetSummary = summarizeKeysetRuns(keysetRuns);

  for (const entry of keysetSummary) {
    logStatLine(`keyset page=${entry.page}`, entry.stats);
  }

  console.log(
    "note: keyset uses only created_at cursor; identical timestamps may repeat rows.",
  );
  console.log("");

  return {
    offsets: offsetResults,
    keyset: keysetSummary,
  };
}

async function runPayloadBench() {
  console.log("Payload size (select * vs slim columns)");

  const full = await timedQuery("payload_full", async () => {
    const result = await supabase
      .from(config.table)
      .select("*")
      .limit(config.payloadLimit);
    const sizeBytes = payloadSize(result.data);
    return { ...result, sizeBytes };
  });

  const slim = await timedQuery("payload_slim", async () => {
    const result = await supabase
      .from(config.table)
      .select(config.slimColumns.join(","))
      .limit(config.payloadLimit);
    const sizeBytes = payloadSize(result.data);
    return { ...result, sizeBytes };
  });

  logStatLine("full", full.stats, full.lastSizeBytes);
  logStatLine("slim", slim.stats, slim.lastSizeBytes);
  console.log(
    `size reduction: ${formatNumber(
      ratioValue(full.lastSizeBytes, slim.lastSizeBytes),
    )}x`,
  );
  console.log("");

  return {
    full,
    slim,
  };
}

async function runConcurrencyBench() {
  console.log("Concurrency performance");

  const results = [];
  for (const level of config.concurrencyLevels) {
    const runs = [];
    let errorCount = 0;

    for (let i = 0; i < config.repeats; i++) {
      const start = performance.now();
      const responses = await Promise.all(
        Array.from({ length: level }, () =>
          supabase
            .from(config.table)
            .select(config.paginationColumns.join(","))
            .order(config.orderColumn, { ascending: false })
            .limit(config.pageSize),
        ),
      );
      const duration = performance.now() - start;
      for (const response of responses) {
        if (response.error) errorCount += 1;
      }
      runs.push(duration);
    }

    const stats = summarizeDurations(runs);
    results.push({ concurrency: level, stats, errorCount });
    logStatLine(`concurrency=${level}`, stats);
  }

  console.log("");

  return results;
}

async function runExplainBench() {
  const dbUrl =
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.PG_CONNECTION_STRING;

  const explainFlag = process.env.BENCH_EXPLAIN;
  const allowExplain =
    explainFlag === "true" || (explainFlag !== "false" && dbUrl);

  if (!allowExplain || !dbUrl) {
    return { skipped: true };
  }

  console.log("Explain analyze (ORDER BY created_at DESC)");

  const table = quoteIdent(config.table);
  const orderColumn = quoteIdent(config.orderColumn);
  const limit = Math.max(1, config.pageSize);

  const sql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM ${table} ORDER BY ${orderColumn} DESC LIMIT ${limit}`;

  const client = new PgClient({
    connectionString: dbUrl,
    ssl: needsSsl(dbUrl) ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    const result = await client.query(sql);
    const planRoot = result.rows[0]["QUERY PLAN"][0];
    const nodeTypes = collectNodeTypes(planRoot?.Plan);
    const summary = {
      planningTimeMs: planRoot?.["Planning Time"] ?? null,
      executionTimeMs: planRoot?.["Execution Time"] ?? null,
      nodeTypes,
      hasSeqScan: nodeTypes.includes("Seq Scan"),
      hasIndexScan:
        nodeTypes.includes("Index Scan") || nodeTypes.includes("Index Only Scan"),
    };

    console.log(`planning: ${formatNumber(summary.planningTimeMs)} ms`);
    console.log(`execution: ${formatNumber(summary.executionTimeMs)} ms`);
    console.log(
      `scan: ${summary.hasIndexScan ? "index" : summary.hasSeqScan ? "seq" : "unknown"}`,
    );
    console.log("");

    return { sql, summary };
  } finally {
    await client.end();
  }
}

async function runKeysetPass() {
  const results = [];
  let cursorValue = null;

  for (let page = 0; page < config.keysetPages; page++) {
    const start = performance.now();
    let query = supabase
      .from(config.table)
      .select(config.paginationColumns.join(","))
      .order(config.orderColumn, { ascending: false })
      .order(config.idColumn, { ascending: false })
      .limit(config.pageSize);

    if (cursorValue) {
      query = query.lt(config.orderColumn, cursorValue);
    }

    const response = await query;
    const duration = performance.now() - start;
    const errorMessage = response.error?.message || null;

    results.push({
      page,
      ms: duration,
      error: errorMessage,
      rows: response.data?.length || 0,
    });

    if (errorMessage || !response.data || response.data.length === 0) {
      break;
    }

    const lastRow = response.data[response.data.length - 1];
    cursorValue = lastRow?.[config.orderColumn] ?? null;
  }

  return results;
}

function summarizeKeysetRuns(runs) {
  const byPage = new Map();

  for (const pass of runs) {
    for (const entry of pass) {
      if (!byPage.has(entry.page)) {
        byPage.set(entry.page, []);
      }
      byPage.get(entry.page).push(entry);
    }
  }

  const summary = [];
  for (const [page, entries] of byPage.entries()) {
    const durations = entries
      .filter((item) => !item.error)
      .map((item) => item.ms);
    summary.push({
      page,
      stats: summarizeDurations(durations),
      errors: entries.filter((item) => item.error).length,
    });
  }

  return summary.sort((a, b) => a.page - b.page);
}

async function timedQuery(label, fn) {
  const runs = [];
  let errors = 0;
  let lastCount = null;
  let lastSizeBytes = null;

  for (let i = 0; i < config.repeats; i++) {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    if (result?.error) {
      errors += 1;
    }

    if (typeof result?.count === "number") {
      lastCount = result.count;
    }

    if (typeof result?.sizeBytes === "number") {
      lastSizeBytes = result.sizeBytes;
    }

    runs.push({ ms: duration, error: result?.error?.message || null });
  }

  return {
    label,
    runs,
    errors,
    lastCount,
    lastSizeBytes,
    stats: summarizeDurations(
      runs.filter((run) => !run.error).map((run) => run.ms),
    ),
  };
}

function summarizeDurations(durations) {
  if (!durations.length) {
    return { avgMs: null, p50Ms: null, p95Ms: null };
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const avgMs = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  const p50Ms = percentile(sorted, 0.5);
  const p95Ms = percentile(sorted, 0.95);

  return { avgMs, p50Ms, p95Ms };
}

function percentile(values, p) {
  if (!values.length) return null;
  const index = Math.ceil(p * values.length) - 1;
  return values[Math.max(0, Math.min(index, values.length - 1))];
}

function payloadSize(data) {
  if (!data) return 0;
  return Buffer.byteLength(JSON.stringify(data), "utf8");
}

function ratioValue(a, b) {
  if (!a || !b) return null;
  return a / b;
}

function formatNumber(value) {
  if (value === null || value === undefined) return "n/a";
  return Number.isFinite(value) ? value.toFixed(2) : "n/a";
}

function logStatLine(label, stats, extraValue) {
  const extra =
    typeof extraValue === "number" ? ` (value: ${extraValue})` : "";
  console.log(
    `- ${label}: avg ${formatNumber(stats.avgMs)} ms, p50 ${formatNumber(
      stats.p50Ms,
    )} ms, p95 ${formatNumber(stats.p95Ms)} ms${extra}`,
  );
}

function parseIntEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseListEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseIntListEnv(name, fallback) {
  const values = parseListEnv(name, null);
  if (!values) return fallback;
  return values
    .map((entry) => Number.parseInt(entry, 10))
    .filter((value) => Number.isFinite(value));
}

function quoteIdent(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe identifier: ${value}`);
  }
  return `"${value}"`;
}

function needsSsl(connectionString) {
  return !(
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1") ||
    connectionString.includes("::1")
  );
}

function collectNodeTypes(plan) {
  const types = new Set();
  if (!plan) return [];

  const stack = [plan];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if (node["Node Type"]) {
      types.add(node["Node Type"]);
    }
    if (Array.isArray(node.Plans)) {
      for (const child of node.Plans) {
        stack.push(child);
      }
    }
  }

  return Array.from(types).sort();
}

main().catch((error) => {
  console.error("Benchmark failed:", error);
  process.exitCode = 1;
});
