import { describe, it, expect } from "vitest";
import type {
  ExtractionResult,
  CanonicalTable,
} from "../../../types/document-extraction.types";
import type {
  PdfExtraction,
  Section,
  ExtractionPage,
  ExtractionTable,
} from "../../../features/training-modules/types/pdf-extraction.types";

// Replicate the normalize logic for unit testing (pure function).

function normalizeRailway(
  raw: PdfExtraction,
  context?: Record<string, string>,
): ExtractionResult {
  const warnings: { code: string; message: string; pageNumber?: number }[] = [];

  const tables: CanonicalTable[] = (raw.tables ?? []).map(
    (t: ExtractionTable) => ({
      tableId: t.table_id,
      pageNumber: t.page_number,
      tableIndex: t.table_index,
      rows: t.rows,
      cols: t.cols,
      values: t.values,
      confidence: t.confidence,
      sourceEngine: t.source_engine,
    }),
  );

  const sectionMap = new Map<string, Section>();
  for (const section of raw.sections ?? []) {
    sectionMap.set(section.section_id, section);
  }

  const pages = (raw.pages ?? []).map((page: ExtractionPage) => {
    const pageText = page.section_ids
      .map((sid) => sectionMap.get(sid)?.full_text ?? "")
      .filter(Boolean)
      .join("\n\n");

    const blocks = page.section_ids.reduce<
      { blockId: string; type: "paragraph"; text: string }[]
    >((acc, sid) => {
      const section = sectionMap.get(sid);
      if (section) {
        acc.push({ blockId: sid, type: "paragraph", text: section.full_text });
      }
      return acc;
    }, []);

    const pageTables = tables.filter((t) => t.pageNumber === page.page_number);

    return {
      pageNumber: page.page_number,
      text: pageText,
      blocks,
      tables: pageTables,
      ocrUsed: true,
    };
  });

  const fullText = pages.map((p) => p.text).join("\n\n");

  const tableConfidences = tables.map((t) => t.confidence);
  const sectionScores = (raw.sections ?? [])
    .filter((s) => !s.is_trivial)
    .map((s) => s.quality_score);
  const allScores = [...tableConfidences, ...sectionScores];
  const confidence =
    allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0.7;

  const trivialSections = (raw.sections ?? []).filter((s) => s.is_trivial);
  if (trivialSections.length > 0) {
    warnings.push({
      code: "TRIVIAL_SECTIONS",
      message: `${trivialSections.length} section(s) marked as trivial by extractor`,
    });
  }

  return {
    documentId: raw.document_id,
    extractor: {
      provider: "railway-ocr",
      providerVersion: raw.view_version,
      pipelineVersion: "1.0.0",
    },
    metadata: {
      title: raw.document_metadata?.title,
      pageCount: raw.page_count,
      sourceType: "mixed",
    },
    pages,
    fullText,
    tables,
    warnings,
    confidence,
    extractedAt: expect.any(String) as unknown as string,
    context,
  };
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeSection(id: string, overrides?: Partial<Section>): Section {
  return {
    section_id: id,
    header: `Section ${id}`,
    page_numbers: [1],
    full_text: `Content of section ${id}`,
    table_ids: [],
    key_points: [],
    quality_score: 0.85,
    is_trivial: false,
    ...overrides,
  };
}

function makeTable(overrides?: Partial<ExtractionTable>): ExtractionTable {
  return {
    table_id: "t1",
    page_number: 1,
    rows: 3,
    cols: 2,
    values: [
      ["A", "B"],
      ["1", "2"],
      ["3", "4"],
    ],
    confidence: 0.9,
    source_engine: "paddleocr",
    ...overrides,
  };
}

function makePage(num: number, sectionIds: string[]): ExtractionPage {
  return {
    page_number: num,
    section_ids: sectionIds,
    table_ids: [],
    key_points: [],
  };
}

function makeExtraction(overrides?: Partial<PdfExtraction>): PdfExtraction {
  const sections = [makeSection("s1"), makeSection("s2")];
  return {
    view_version: "2.0.0",
    document_id: "doc-1",
    page_count: 2,
    lessons: [],
    module_seed: {
      title: "Test",
      description: "Test module",
      tags: [],
      lesson_count: 0,
      lessons: [],
    },
    pages: [makePage(1, ["s1"]), makePage(2, ["s2"])],
    sections,
    tables: [],
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Training Railway Adapter — normalize()", () => {
  it("produces correct page structure from sections", () => {
    const result = normalizeRailway(makeExtraction());
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].pageNumber).toBe(1);
    expect(result.pages[0].text).toBe("Content of section s1");
    expect(result.pages[1].text).toBe("Content of section s2");
  });

  it("marks all pages as ocrUsed=true", () => {
    const result = normalizeRailway(makeExtraction());
    expect(result.pages.every((p) => p.ocrUsed)).toBe(true);
  });

  it("assembles fullText from all pages", () => {
    const result = normalizeRailway(makeExtraction());
    expect(result.fullText).toContain("Content of section s1");
    expect(result.fullText).toContain("Content of section s2");
  });

  it("uses section_id as blockId", () => {
    const result = normalizeRailway(makeExtraction());
    expect(result.pages[0].blocks[0].blockId).toBe("s1");
  });

  it("normalizes tables with correct field mapping", () => {
    const raw = makeExtraction({ tables: [makeTable()] });
    const result = normalizeRailway(raw);
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0]).toMatchObject({
      tableId: "t1",
      pageNumber: 1,
      rows: 3,
      cols: 2,
      confidence: 0.9,
      sourceEngine: "paddleocr",
    });
  });

  it("assigns tables to correct pages", () => {
    const table1 = makeTable({ table_id: "t1", page_number: 1 });
    const table2 = makeTable({ table_id: "t2", page_number: 2 });
    const raw = makeExtraction({ tables: [table1, table2] });
    const result = normalizeRailway(raw);
    expect(result.pages[0].tables).toHaveLength(1);
    expect(result.pages[0].tables[0].tableId).toBe("t1");
    expect(result.pages[1].tables).toHaveLength(1);
    expect(result.pages[1].tables[0].tableId).toBe("t2");
  });

  it("passes through context", () => {
    const ctx = { moduleId: "m1" };
    const result = normalizeRailway(makeExtraction(), ctx);
    expect(result.context).toEqual(ctx);
  });

  it("sets extractor info from view_version", () => {
    const result = normalizeRailway(makeExtraction());
    expect(result.extractor.provider).toBe("railway-ocr");
    expect(result.extractor.providerVersion).toBe("2.0.0");
  });

  // ─── Confidence blending ──────────────────────────────────────────────────

  it("blends table confidence with section quality_score", () => {
    const raw = makeExtraction({
      tables: [makeTable({ confidence: 0.9 })],
      sections: [makeSection("s1", { quality_score: 0.7, is_trivial: false })],
    });
    const result = normalizeRailway(raw);
    // (0.9 + 0.7) / 2 = 0.8
    expect(result.confidence).toBeCloseTo(0.8);
  });

  it("excludes trivial sections from confidence", () => {
    const raw = makeExtraction({
      tables: [],
      sections: [
        makeSection("s1", { quality_score: 0.9, is_trivial: false }),
        makeSection("s2", { quality_score: 0.1, is_trivial: true }),
      ],
    });
    const result = normalizeRailway(raw);
    // Only s1's 0.9 counts
    expect(result.confidence).toBeCloseTo(0.9);
  });

  it("defaults to 0.7 when no scores available", () => {
    const raw = makeExtraction({ tables: [], sections: [] });
    const result = normalizeRailway(raw);
    expect(result.confidence).toBe(0.7);
  });

  // ─── Warning logic ────────────────────────────────────────────────────────

  it("warns about trivial sections", () => {
    const raw = makeExtraction({
      sections: [
        makeSection("s1", { is_trivial: true }),
        makeSection("s2", { is_trivial: true }),
      ],
    });
    const result = normalizeRailway(raw);
    const warning = result.warnings.find((w) => w.code === "TRIVIAL_SECTIONS");
    expect(warning).toBeDefined();
    expect(warning!.message).toContain("2 section(s)");
  });

  it("does NOT warn when no trivial sections", () => {
    const result = normalizeRailway(makeExtraction());
    expect(result.warnings).toHaveLength(0);
  });

  // ─── Edge cases ──────────────────────────────────────────────────────────

  it("handles missing sections gracefully", () => {
    const raw = makeExtraction({ sections: undefined as unknown as Section[] });
    expect(() => normalizeRailway(raw)).not.toThrow();
  });

  it("handles missing pages gracefully", () => {
    const raw = makeExtraction({
      pages: undefined as unknown as ExtractionPage[],
    });
    const result = normalizeRailway(raw);
    expect(result.pages).toEqual([]);
  });

  it("skips blocks for unknown section references", () => {
    const raw = makeExtraction({
      sections: [makeSection("s1")],
      pages: [makePage(1, ["s1", "s_unknown"])],
    });
    const result = normalizeRailway(raw);
    // Only s1 gets a block, s_unknown is skipped
    expect(result.pages[0].blocks).toHaveLength(1);
    expect(result.pages[0].blocks[0].blockId).toBe("s1");
  });
});
