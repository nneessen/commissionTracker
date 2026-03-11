import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  ExtractionResult,
  ExtractionFeatures,
} from "@/types/document-extraction.types";
import type { GatewayResult } from "@/services/document-extraction";

// Mock the extraction gateway
vi.mock("@/services/document-extraction", () => ({
  extractionGateway: {
    extract: vi.fn(),
  },
}));

// Import after mock setup
import { extractionGateway } from "@/services/document-extraction";
import type { ParseGuideInput, ParseGatewayResult } from "../useParseGuide";

const mockExtract = vi.mocked(extractionGateway.extract);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeExtractionResult(
  overrides?: Partial<ExtractionResult>,
): ExtractionResult {
  return {
    documentId: "guide-abc",
    extractor: {
      provider: "uw-text-layer",
      providerVersion: "1.0.0",
      pipelineVersion: "1.0.0",
    },
    metadata: { pageCount: 5, sourceType: "text_layer" },
    pages: [
      {
        pageNumber: 1,
        text: "Section 1 content",
        blocks: [
          { blockId: "p1-b0", type: "paragraph", text: "Section 1 content" },
        ],
        tables: [],
        ocrUsed: false,
      },
      {
        pageNumber: 2,
        text: "Section 2 content",
        blocks: [
          { blockId: "p2-b0", type: "paragraph", text: "Section 2 content" },
        ],
        tables: [],
        ocrUsed: false,
      },
      {
        pageNumber: 3,
        text: "Section 3",
        blocks: [{ blockId: "p3-b0", type: "paragraph", text: "Section 3" }],
        tables: [],
        ocrUsed: false,
      },
    ],
    fullText: "Section 1 content\nSection 2 content\nSection 3",
    tables: [],
    warnings: [],
    confidence: 0.8,
    extractedAt: "2026-03-10T00:00:00Z",
    ...overrides,
  };
}

function makeGatewayResult(
  resultOverrides?: Partial<ExtractionResult>,
  durationMs = 1234,
  adapterUsed = "uw-text-layer",
): GatewayResult {
  return {
    result: makeExtractionResult(resultOverrides),
    adapterUsed,
    durationMs,
  };
}

/**
 * Extract the mutationFn logic for unit testing without React Query wrappers.
 * Mirrors the exact logic inside useParseGuide's mutationFn.
 */
async function executeParseMutation(
  input: ParseGuideInput,
): Promise<ParseGatewayResult> {
  const features: ExtractionFeatures | undefined = input.useOcr
    ? { ocr: true, tables: true, layout: true }
    : undefined;

  const request = {
    source: {
      type: "storage_path" as const,
      bucket: "underwriting-guides",
      path: input.storagePath,
    },
    mode: "uw_guide" as const,
    features,
    context: { guideId: input.guideId },
  };

  const { result, adapterUsed, durationMs } =
    await extractionGateway.extract(request);

  return {
    pageCount: result.metadata.pageCount,
    sectionCount: result.pages.length,
    characterCount: result.fullText.length,
    tableCount: result.tables.length,
    durationMs,
    adapterUsed,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useParseGuide — mutationFn logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("constructs correct ExtractionRequest for text-layer (default)", async () => {
    mockExtract.mockResolvedValue(makeGatewayResult());

    await executeParseMutation({
      guideId: "guide-abc",
      storagePath: "imo-123/guides/file.pdf",
    });

    expect(mockExtract).toHaveBeenCalledOnce();
    expect(mockExtract).toHaveBeenCalledWith({
      source: {
        type: "storage_path",
        bucket: "underwriting-guides",
        path: "imo-123/guides/file.pdf",
      },
      mode: "uw_guide",
      features: undefined,
      context: { guideId: "guide-abc" },
    });
  });

  it("constructs ExtractionRequest with OCR features when useOcr=true", async () => {
    mockExtract.mockResolvedValue(
      makeGatewayResult(undefined, 3000, "paddle-ocr"),
    );

    await executeParseMutation({
      guideId: "guide-ocr",
      storagePath: "imo-123/guides/scanned.pdf",
      useOcr: true,
    });

    expect(mockExtract).toHaveBeenCalledWith(
      expect.objectContaining({
        features: { ocr: true, tables: true, layout: true },
      }),
    );
  });

  it("maps GatewayResult to ParseGatewayResult correctly", async () => {
    mockExtract.mockResolvedValue(
      makeGatewayResult(
        {
          metadata: { pageCount: 12, sourceType: "text_layer" },
          pages: Array.from({ length: 8 }, (_, i) => ({
            pageNumber: i + 1,
            text: `Page ${i + 1} text`,
            blocks: [
              {
                blockId: `p${i + 1}-b0`,
                type: "paragraph" as const,
                text: `Page ${i + 1} text`,
              },
            ],
            tables: [],
            ocrUsed: false,
          })),
          fullText: "A".repeat(5000),
        },
        2500,
      ),
    );

    const result = await executeParseMutation({
      guideId: "guide-xyz",
      storagePath: "path/to/file.pdf",
    });

    expect(result).toEqual({
      pageCount: 12,
      sectionCount: 8,
      characterCount: 5000,
      tableCount: 0,
      durationMs: 2500,
      adapterUsed: "uw-text-layer",
    });
  });

  it("includes tableCount from OCR result", async () => {
    mockExtract.mockResolvedValue(
      makeGatewayResult(
        {
          tables: [
            {
              tableId: "t1",
              pageNumber: 1,
              rows: 3,
              cols: 4,
              values: [],
              confidence: 0.9,
              sourceEngine: "paddleocr",
            },
            {
              tableId: "t2",
              pageNumber: 2,
              rows: 5,
              cols: 2,
              values: [],
              confidence: 0.85,
              sourceEngine: "paddleocr",
            },
          ],
        },
        4000,
        "paddle-ocr",
      ),
    );

    const result = await executeParseMutation({
      guideId: "guide-tables",
      storagePath: "path/to/tables.pdf",
      useOcr: true,
    });

    expect(result.tableCount).toBe(2);
    expect(result.adapterUsed).toBe("paddle-ocr");
  });

  it("propagates gateway errors", async () => {
    mockExtract.mockRejectedValue(
      new Error("[UwTextAdapter] Edge function error: timeout"),
    );

    await expect(
      executeParseMutation({
        guideId: "guide-fail",
        storagePath: "path/to/file.pdf",
      }),
    ).rejects.toThrow("[UwTextAdapter] Edge function error: timeout");
  });

  it("returns sectionCount=0 for empty pages array", async () => {
    mockExtract.mockResolvedValue(
      makeGatewayResult(
        {
          metadata: { pageCount: 0, sourceType: "text_layer" },
          pages: [],
          fullText: "",
        },
        100,
      ),
    );

    const result = await executeParseMutation({
      guideId: "guide-empty",
      storagePath: "path/to/empty.pdf",
    });

    expect(result.sectionCount).toBe(0);
    expect(result.characterCount).toBe(0);
    expect(result.pageCount).toBe(0);
  });

  it("handles single-page document", async () => {
    mockExtract.mockResolvedValue(
      makeGatewayResult(
        {
          metadata: { pageCount: 1, sourceType: "text_layer" },
          pages: [
            {
              pageNumber: 1,
              text: "Only page",
              blocks: [
                { blockId: "p1-b0", type: "paragraph", text: "Only page" },
              ],
              tables: [],
              ocrUsed: false,
            },
          ],
          fullText: "Only page",
        },
        50,
      ),
    );

    const result = await executeParseMutation({
      guideId: "guide-single",
      storagePath: "one-pager.pdf",
    });

    expect(result).toEqual({
      pageCount: 1,
      sectionCount: 1,
      characterCount: 9,
      tableCount: 0,
      durationMs: 50,
      adapterUsed: "uw-text-layer",
    });
  });

  it("propagates RLS ownership check failure from adapter", async () => {
    mockExtract.mockRejectedValue(
      new Error(
        "[UwTextAdapter] Guide guide-stolen not found or not accessible — RLS blocked",
      ),
    );

    await expect(
      executeParseMutation({
        guideId: "guide-stolen",
        storagePath: "not/yours.pdf",
      }),
    ).rejects.toThrow("RLS blocked");
  });
});

// ─── Helper function tests ────────────────────────────────────────────────────

describe("useParseGuide — helper functions", () => {
  let isGuideParsed: (s: string | null) => boolean;
  let isParsingInProgress: (s: string | null) => boolean;
  let hasParsingFailed: (s: string | null) => boolean;

  beforeEach(async () => {
    const mod = await import("../useParseGuide");
    isGuideParsed = mod.isGuideParsed;
    isParsingInProgress = mod.isParsingInProgress;
    hasParsingFailed = mod.hasParsingFailed;
  });

  it("isGuideParsed returns true only for 'completed'", () => {
    expect(isGuideParsed("completed")).toBe(true);
    expect(isGuideParsed("processing")).toBe(false);
    expect(isGuideParsed("failed")).toBe(false);
    expect(isGuideParsed(null)).toBe(false);
  });

  it("isParsingInProgress returns true only for 'processing'", () => {
    expect(isParsingInProgress("processing")).toBe(true);
    expect(isParsingInProgress("completed")).toBe(false);
    expect(isParsingInProgress(null)).toBe(false);
  });

  it("hasParsingFailed returns true only for 'failed'", () => {
    expect(hasParsingFailed("failed")).toBe(true);
    expect(hasParsingFailed("completed")).toBe(false);
    expect(hasParsingFailed(null)).toBe(false);
  });
});
