#!/usr/bin/env npx tsx
/**
 * Benchmark Extraction Comparison Script
 *
 * Runs both text-layer and PaddleOCR adapters on the same guide(s)
 * and outputs a comparison report.
 *
 * Usage:
 *   npx tsx scripts/benchmark-extraction.ts <guide_id>
 *   npx tsx scripts/benchmark-extraction.ts --all
 *
 * Prerequisites:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 *   - PaddleOCR service running (local or remote)
 *   - PADDLEOCR_SERVICE_URL env var (default: http://localhost:8000)
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const PADDLE_URL = process.env.PADDLEOCR_SERVICE_URL || "http://localhost:8000";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface GuideRow {
  id: string;
  name: string;
  storage_path: string;
  file_size_bytes: number | null;
  parsing_status: string | null;
  parsed_content: string | null;
}

interface BenchmarkResult {
  guideId: string;
  guideName: string;
  fileSizeBytes: number | null;
  textLayer: AdapterResult | null;
  paddleOcr: AdapterResult | null;
}

interface AdapterResult {
  success: boolean;
  error?: string;
  durationMs: number;
  pageCount: number;
  sectionCount: number;
  characterCount: number;
  tableCount: number;
  confidence: number;
  warnings: string[];
  avgCharsPerPage: number;
}

// ─── Text-layer extraction (reads existing parsed_content from DB) ────────────

async function benchmarkTextLayer(guide: GuideRow): Promise<AdapterResult> {
  const start = performance.now();

  if (!guide.parsed_content || guide.parsing_status !== "completed") {
    return {
      success: false,
      error: `Guide not parsed (status: ${guide.parsing_status})`,
      durationMs: 0,
      pageCount: 0,
      sectionCount: 0,
      characterCount: 0,
      tableCount: 0,
      confidence: 0,
      warnings: [],
      avgCharsPerPage: 0,
    };
  }

  try {
    const parsed = JSON.parse(guide.parsed_content);
    const durationMs = Math.round(performance.now() - start);

    const pageCount = parsed.pageCount || 0;
    const sections = parsed.sections || [];
    const fullText = parsed.fullText || "";
    const avgCharsPerPage = pageCount > 0 ? fullText.length / pageCount : 0;

    return {
      success: true,
      durationMs,
      pageCount,
      sectionCount: sections.length,
      characterCount: fullText.length,
      tableCount: 0, // Text-layer doesn't extract tables
      confidence:
        avgCharsPerPage >= 200 ? 0.8 : avgCharsPerPage >= 100 ? 0.5 : 0.2,
      warnings: avgCharsPerPage < 100 ? ["LOW_TEXT_DENSITY"] : [],
      avgCharsPerPage: Math.round(avgCharsPerPage),
    };
  } catch (e) {
    return {
      success: false,
      error: `JSON parse error: ${e instanceof Error ? e.message : "unknown"}`,
      durationMs: Math.round(performance.now() - start),
      pageCount: 0,
      sectionCount: 0,
      characterCount: 0,
      tableCount: 0,
      confidence: 0,
      warnings: [],
      avgCharsPerPage: 0,
    };
  }
}

// ─── PaddleOCR extraction (downloads PDF, sends to OCR service) ───────────────

async function benchmarkPaddleOcr(guide: GuideRow): Promise<AdapterResult> {
  const start = performance.now();

  try {
    // Check if PaddleOCR service is available
    const healthRes = await fetch(`${PADDLE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);

    if (!healthRes || !healthRes.ok) {
      return {
        success: false,
        error: `PaddleOCR service unavailable at ${PADDLE_URL}`,
        durationMs: Math.round(performance.now() - start),
        pageCount: 0,
        sectionCount: 0,
        characterCount: 0,
        tableCount: 0,
        confidence: 0,
        warnings: [],
        avgCharsPerPage: 0,
      };
    }

    // Download PDF from Supabase storage
    const { data: blob, error: dlError } = await supabase.storage
      .from("underwriting-guides")
      .download(guide.storage_path);

    if (dlError || !blob) {
      throw new Error(`Storage download failed: ${dlError?.message}`);
    }

    // Send to PaddleOCR
    const formData = new FormData();
    formData.append(
      "file",
      new File([blob], guide.storage_path.split("/").pop() || "guide.pdf", {
        type: "application/pdf",
      }),
    );

    const ocrRes = await fetch(`${PADDLE_URL}/api/extract`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(300_000), // 5 min timeout for OCR
    });

    if (!ocrRes.ok) {
      const text = await ocrRes.text().catch(() => "unknown");
      throw new Error(`OCR service error ${ocrRes.status}: ${text}`);
    }

    const ocrData = await ocrRes.json();
    const durationMs = Math.round(performance.now() - start);

    const pages = ocrData.pages || [];
    const pageText = pages.map((p: { text: string }) => p.text).join("\n\n");
    const tables = ocrData.tables || [];
    const tableCount = tables.length;
    // Include table cell text in total character count
    const tableText = tables
      .map((t: { values: string[][] }) =>
        (t.values || []).map((row: string[]) => row.join(" ")).join("\n"),
      )
      .join("\n\n");
    const fullText = [pageText, tableText].filter(Boolean).join("\n\n");
    const pageCount = ocrData.page_count || pages.length;
    const avgCharsPerPage = pageCount > 0 ? fullText.length / pageCount : 0;

    // Compute confidence
    const blockConfs = pages.flatMap(
      (p: { blocks: { confidence: number }[] }) =>
        (p.blocks || []).map((b) => b.confidence),
    );
    const confidence =
      blockConfs.length > 0
        ? blockConfs.reduce((a: number, b: number) => a + b, 0) /
          blockConfs.length
        : 0.5;

    const warnings: string[] = [];
    if (avgCharsPerPage < 100) warnings.push("LOW_TEXT_DENSITY");
    if (tableCount === 0) warnings.push("NO_TABLES_DETECTED");

    return {
      success: true,
      durationMs,
      pageCount,
      sectionCount: pages.length,
      characterCount: fullText.length,
      tableCount,
      confidence: Math.round(confidence * 100) / 100,
      warnings,
      avgCharsPerPage: Math.round(avgCharsPerPage),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "unknown error",
      durationMs: Math.round(performance.now() - start),
      pageCount: 0,
      sectionCount: 0,
      characterCount: 0,
      tableCount: 0,
      confidence: 0,
      warnings: [],
      avgCharsPerPage: 0,
    };
  }
}

// ─── Reporting ────────────────────────────────────────────────────────────────

function printComparison(results: BenchmarkResult[]) {
  console.log("\n" + "═".repeat(80));
  console.log("  EXTRACTION BENCHMARK COMPARISON");
  console.log("═".repeat(80));

  for (const r of results) {
    console.log(`\n─── ${r.guideName} (${r.guideId}) ───`);
    console.log(
      `  File size: ${r.fileSizeBytes ? `${(r.fileSizeBytes / 1024).toFixed(0)} KB` : "unknown"}`,
    );

    const cols = ["Metric", "Text-Layer", "PaddleOCR", "Delta"];
    const rows = [
      [
        "Status",
        r.textLayer?.success ? "OK" : `FAIL: ${r.textLayer?.error}`,
        r.paddleOcr?.success ? "OK" : `FAIL: ${r.paddleOcr?.error}`,
        "",
      ],
      [
        "Duration",
        `${r.textLayer?.durationMs ?? "—"}ms`,
        `${r.paddleOcr?.durationMs ?? "—"}ms`,
        r.textLayer?.success && r.paddleOcr?.success
          ? `${r.paddleOcr!.durationMs - r.textLayer!.durationMs > 0 ? "+" : ""}${r.paddleOcr!.durationMs - r.textLayer!.durationMs}ms`
          : "",
      ],
      [
        "Pages",
        `${r.textLayer?.pageCount ?? "—"}`,
        `${r.paddleOcr?.pageCount ?? "—"}`,
        "",
      ],
      [
        "Sections",
        `${r.textLayer?.sectionCount ?? "—"}`,
        `${r.paddleOcr?.sectionCount ?? "—"}`,
        "",
      ],
      [
        "Characters",
        `${r.textLayer?.characterCount ?? "—"}`,
        `${r.paddleOcr?.characterCount ?? "—"}`,
        r.textLayer?.success && r.paddleOcr?.success
          ? `${r.paddleOcr!.characterCount - r.textLayer!.characterCount > 0 ? "+" : ""}${r.paddleOcr!.characterCount - r.textLayer!.characterCount}`
          : "",
      ],
      [
        "Tables",
        `${r.textLayer?.tableCount ?? "—"}`,
        `${r.paddleOcr?.tableCount ?? "—"}`,
        r.paddleOcr?.tableCount ? `+${r.paddleOcr.tableCount} (new)` : "",
      ],
      [
        "Confidence",
        `${((r.textLayer?.confidence ?? 0) * 100).toFixed(0)}%`,
        `${((r.paddleOcr?.confidence ?? 0) * 100).toFixed(0)}%`,
        "",
      ],
      [
        "Avg chars/pg",
        `${r.textLayer?.avgCharsPerPage ?? "—"}`,
        `${r.paddleOcr?.avgCharsPerPage ?? "—"}`,
        "",
      ],
    ];

    // Print table
    const widths = cols.map((c, i) =>
      Math.max(c.length, ...rows.map((row) => String(row[i]).length)),
    );
    const header = cols.map((c, i) => c.padEnd(widths[i])).join(" │ ");
    console.log(`  ${header}`);
    console.log(`  ${"─".repeat(header.length)}`);
    for (const row of rows) {
      console.log(
        `  ${row.map((cell, i) => String(cell).padEnd(widths[i])).join(" │ ")}`,
      );
    }

    if (r.textLayer?.warnings.length || r.paddleOcr?.warnings.length) {
      console.log(
        `  Warnings (text): ${r.textLayer?.warnings.join(", ") || "none"}`,
      );
      console.log(
        `  Warnings (OCR):  ${r.paddleOcr?.warnings.join(", ") || "none"}`,
      );
    }
  }

  console.log("\n" + "═".repeat(80));

  // Save JSON report
  const reportPath = path.join(
    process.cwd(),
    "tmp",
    `benchmark-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nFull report saved to: ${reportPath}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  let guides: GuideRow[];

  if (args.includes("--all")) {
    const { data, error } = await supabase
      .from("underwriting_guides")
      .select(
        "id, name, storage_path, file_size_bytes, parsing_status, parsed_content",
      )
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("Failed to fetch guides:", error?.message);
      process.exit(1);
    }
    guides = data;
    console.log(`Found ${guides.length} guides to benchmark`);
  } else if (args.length > 0) {
    const guideId = args[0];
    const { data, error } = await supabase
      .from("underwriting_guides")
      .select(
        "id, name, storage_path, file_size_bytes, parsing_status, parsed_content",
      )
      .eq("id", guideId)
      .single();

    if (error || !data) {
      console.error(`Guide ${guideId} not found:`, error?.message);
      process.exit(1);
    }
    guides = [data];
  } else {
    console.log("Usage:");
    console.log("  npx tsx scripts/benchmark-extraction.ts <guide_id>");
    console.log("  npx tsx scripts/benchmark-extraction.ts --all");
    process.exit(0);
  }

  const results: BenchmarkResult[] = [];

  for (const guide of guides) {
    console.log(`\nBenchmarking: ${guide.name}...`);

    const [textLayer, paddleOcr] = await Promise.all([
      benchmarkTextLayer(guide),
      benchmarkPaddleOcr(guide),
    ]);

    results.push({
      guideId: guide.id,
      guideName: guide.name,
      fileSizeBytes: guide.file_size_bytes,
      textLayer,
      paddleOcr,
    });
  }

  printComparison(results);
}

main().catch((e) => {
  console.error("Benchmark failed:", e);
  process.exit(1);
});
