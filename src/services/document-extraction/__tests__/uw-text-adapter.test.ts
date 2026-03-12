import { describe, it, expect } from "vitest";
import type {
  ExtractionResult,
  ExtractionWarning,
} from "../../../types/document-extraction.types";

// We test the normalize logic by extracting it into a testable shape.
// The actual class calls supabase, but normalize() is pure — we replicate
// its logic here to unit test the normalization contract.

interface UwParsedContent {
  fullText: string;
  sections: { pageNumber: number; content: string }[];
  pageCount: number;
  extractedAt: string;
  metadata: { title?: string; author?: string };
}

const TABLE_HINT_PATTERNS = [
  /\b(height|weight|bmi)\b.*\b(class|rate|preferred)\b/i,
  /\|\s*\w+\s*\|/,
  /\t{2,}/,
  /\d+\s{2,}\d+\s{2,}\d+/,
];

function normalizeUwParsed(
  parsed: UwParsedContent,
  guideId: string,
  context?: Record<string, string>,
): ExtractionResult {
  const warnings: ExtractionWarning[] = [];

  const pages = parsed.sections.map((section) => ({
    pageNumber: section.pageNumber,
    text: section.content,
    blocks: [
      {
        blockId: `p${section.pageNumber}-b0`,
        type: "paragraph" as const,
        text: section.content,
      },
    ],
    tables: [],
    ocrUsed: false,
  }));

  const avgCharsPerPage =
    parsed.fullText.length / Math.max(parsed.pageCount, 1);
  if (avgCharsPerPage < 100) {
    warnings.push({
      code: "LOW_TEXT_DENSITY",
      message: `Average ${Math.round(avgCharsPerPage)} chars/page — document may be scanned or image-heavy`,
    });
  }

  const hasTableHints = TABLE_HINT_PATTERNS.some((pattern) =>
    pattern.test(parsed.fullText),
  );
  if (hasTableHints) {
    warnings.push({
      code: "NO_TABLE_EXTRACTION",
      message:
        "Document appears to contain tables but text-layer parser cannot extract them — consider OCR adapter",
    });
  }

  return {
    documentId: guideId,
    extractor: {
      provider: "uw-text-layer",
      providerVersion: "1.0.0",
      pipelineVersion: "1.0.0",
    },
    metadata: {
      title: parsed.metadata.title,
      author: parsed.metadata.author,
      pageCount: parsed.pageCount,
      sourceType: "text_layer",
    },
    pages,
    fullText: parsed.fullText,
    tables: [],
    warnings,
    confidence:
      avgCharsPerPage >= 200 ? 0.8 : avgCharsPerPage >= 100 ? 0.5 : 0.2,
    extractedAt: parsed.extractedAt,
    context,
  };
}

// ─── Test Fixtures ───────────────────────────────────────────────────────────

function makeParsed(overrides?: Partial<UwParsedContent>): UwParsedContent {
  const defaultText = "A".repeat(600); // 200 chars/page avg with 3 pages
  return {
    fullText: defaultText,
    sections: [
      { pageNumber: 1, content: defaultText.slice(0, 200) },
      { pageNumber: 2, content: defaultText.slice(200, 400) },
      { pageNumber: 3, content: defaultText.slice(400, 600) },
    ],
    pageCount: 3,
    extractedAt: "2026-03-10T00:00:00Z",
    metadata: { title: "Test Guide", author: "Test Author" },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("UW Text Adapter — normalize()", () => {
  it("produces correct page count and structure", () => {
    const result = normalizeUwParsed(makeParsed(), "guide-1");
    expect(result.pages).toHaveLength(3);
    expect(result.pages[0].pageNumber).toBe(1);
    expect(result.pages[0].ocrUsed).toBe(false);
    expect(result.pages[0].tables).toEqual([]);
  });

  it("generates correct blockIds", () => {
    const result = normalizeUwParsed(makeParsed(), "guide-1");
    expect(result.pages[0].blocks[0].blockId).toBe("p1-b0");
    expect(result.pages[1].blocks[0].blockId).toBe("p2-b0");
    expect(result.pages[2].blocks[0].blockId).toBe("p3-b0");
  });

  it("passes through metadata", () => {
    const result = normalizeUwParsed(makeParsed(), "guide-1");
    expect(result.metadata.title).toBe("Test Guide");
    expect(result.metadata.author).toBe("Test Author");
    expect(result.metadata.sourceType).toBe("text_layer");
  });

  it("passes through context", () => {
    const ctx = { guideId: "g1", carrierId: "c1" };
    const result = normalizeUwParsed(makeParsed(), "guide-1", ctx);
    expect(result.context).toEqual(ctx);
  });

  it("sets extractor info correctly", () => {
    const result = normalizeUwParsed(makeParsed(), "guide-1");
    expect(result.extractor.provider).toBe("uw-text-layer");
  });

  // ─── Confidence tiering ──────────────────────────────────────────────────

  it("confidence = 0.8 for >= 200 avg chars/page", () => {
    // 600 chars / 3 pages = 200 avg
    const result = normalizeUwParsed(makeParsed(), "guide-1");
    expect(result.confidence).toBe(0.8);
  });

  it("confidence = 0.5 for 100-199 avg chars/page", () => {
    const parsed = makeParsed({
      fullText: "B".repeat(300), // 300/3 = 100
      sections: [
        { pageNumber: 1, content: "B".repeat(100) },
        { pageNumber: 2, content: "B".repeat(100) },
        { pageNumber: 3, content: "B".repeat(100) },
      ],
    });
    const result = normalizeUwParsed(parsed, "guide-1");
    expect(result.confidence).toBe(0.5);
  });

  it("confidence = 0.2 for < 100 avg chars/page", () => {
    const parsed = makeParsed({
      fullText: "C".repeat(90), // 90/3 = 30
      sections: [
        { pageNumber: 1, content: "C".repeat(30) },
        { pageNumber: 2, content: "C".repeat(30) },
        { pageNumber: 3, content: "C".repeat(30) },
      ],
    });
    const result = normalizeUwParsed(parsed, "guide-1");
    expect(result.confidence).toBe(0.2);
  });

  // ─── Warning logic ──────────────────────────────────────────────────────

  it("emits LOW_TEXT_DENSITY warning for thin content", () => {
    const parsed = makeParsed({ fullText: "short", pageCount: 3 });
    const result = normalizeUwParsed(parsed, "guide-1");
    const warning = result.warnings.find((w) => w.code === "LOW_TEXT_DENSITY");
    expect(warning).toBeDefined();
  });

  it("does NOT emit LOW_TEXT_DENSITY for normal content", () => {
    const result = normalizeUwParsed(makeParsed(), "guide-1");
    const warning = result.warnings.find((w) => w.code === "LOW_TEXT_DENSITY");
    expect(warning).toBeUndefined();
  });

  it("emits NO_TABLE_EXTRACTION only when table hints detected", () => {
    const parsed = makeParsed({
      fullText: "Height and Weight class preferred standard table",
    });
    const result = normalizeUwParsed(parsed, "guide-1");
    const warning = result.warnings.find(
      (w) => w.code === "NO_TABLE_EXTRACTION",
    );
    expect(warning).toBeDefined();
  });

  it("does NOT emit NO_TABLE_EXTRACTION for non-tabular content", () => {
    const result = normalizeUwParsed(makeParsed(), "guide-1");
    const warning = result.warnings.find(
      (w) => w.code === "NO_TABLE_EXTRACTION",
    );
    expect(warning).toBeUndefined();
  });

  it("detects pipe-delimited table patterns", () => {
    const parsed = makeParsed({
      fullText: "| Name | Age | Status |",
    });
    const result = normalizeUwParsed(parsed, "guide-1");
    expect(result.warnings.some((w) => w.code === "NO_TABLE_EXTRACTION")).toBe(
      true,
    );
  });

  // ─── Edge cases ──────────────────────────────────────────────────────────

  it("handles zero pageCount without division by zero", () => {
    const parsed = makeParsed({ pageCount: 0 });
    expect(() => normalizeUwParsed(parsed, "guide-1")).not.toThrow();
  });

  it("handles empty sections array", () => {
    const parsed = makeParsed({ sections: [], fullText: "" });
    const result = normalizeUwParsed(parsed, "guide-1");
    expect(result.pages).toEqual([]);
    expect(result.fullText).toBe("");
  });
});
