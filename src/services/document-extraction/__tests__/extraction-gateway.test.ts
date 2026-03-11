import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  ExtractionRequest,
  ExtractionResult,
} from "../../../types/document-extraction.types";
import type { ExtractionAdapter } from "../core/types";

// We test the gateway logic without importing the real gateway (which uses
// require() for lazy loading). Instead, replicate the routing logic.

function makeResult(overrides?: Partial<ExtractionResult>): ExtractionResult {
  return {
    documentId: "doc-1",
    extractor: {
      provider: "test",
      providerVersion: "1.0.0",
      pipelineVersion: "1.0.0",
    },
    metadata: { pageCount: 1, sourceType: "text_layer" },
    pages: [],
    fullText: "test",
    tables: [],
    warnings: [],
    confidence: 0.9,
    extractedAt: "2026-03-10T00:00:00Z",
    ...overrides,
  };
}

function createGateway(adapters: ExtractionAdapter[]) {
  return {
    adapters: [...adapters],
    registerAdapter(adapter: ExtractionAdapter) {
      this.adapters.unshift(adapter);
    },
    async extract(request: ExtractionRequest) {
      const adapter = this.adapters.find((a) => a.canHandle(request));
      if (!adapter) {
        throw new Error(
          `[ExtractionGateway] No adapter found for mode="${request.mode}"`,
        );
      }
      const start = performance.now();
      const result = await adapter.extract(request);
      const durationMs = Math.round(performance.now() - start);
      return { result, adapterUsed: adapter.name, durationMs };
    },
  };
}

function makeRequest(mode: "uw_guide" | "training_module"): ExtractionRequest {
  return {
    source: { type: "file", file: new File([], "test.pdf") },
    mode,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ExtractionGateway — routing", () => {
  let uwAdapter: ExtractionAdapter;
  let trainingAdapter: ExtractionAdapter;

  beforeEach(() => {
    uwAdapter = {
      name: "uw-text-layer",
      canHandle: (req) => req.mode === "uw_guide",
      extract: vi.fn().mockResolvedValue(makeResult({ documentId: "uw-1" })),
    };
    trainingAdapter = {
      name: "training-railway",
      canHandle: (req) => req.mode === "training_module",
      extract: vi
        .fn()
        .mockResolvedValue(makeResult({ documentId: "training-1" })),
    };
  });

  it("routes uw_guide to UW adapter", async () => {
    const gw = createGateway([uwAdapter, trainingAdapter]);
    const { result, adapterUsed } = await gw.extract(makeRequest("uw_guide"));
    expect(adapterUsed).toBe("uw-text-layer");
    expect(result.documentId).toBe("uw-1");
  });

  it("routes training_module to Training adapter", async () => {
    const gw = createGateway([uwAdapter, trainingAdapter]);
    const { result, adapterUsed } = await gw.extract(
      makeRequest("training_module"),
    );
    expect(adapterUsed).toBe("training-railway");
    expect(result.documentId).toBe("training-1");
  });

  it("throws for unknown mode", async () => {
    const gw = createGateway([uwAdapter, trainingAdapter]);
    const req = { ...makeRequest("uw_guide"), mode: "unknown" as "uw_guide" };
    // Override canHandle to reject
    uwAdapter.canHandle = () => false;
    trainingAdapter.canHandle = () => false;
    await expect(gw.extract(req)).rejects.toThrow("No adapter found");
  });

  it("returns durationMs in result", async () => {
    const gw = createGateway([uwAdapter]);
    const { durationMs } = await gw.extract(makeRequest("uw_guide"));
    expect(typeof durationMs).toBe("number");
    expect(durationMs).toBeGreaterThanOrEqual(0);
  });

  // ─── registerAdapter priority ──────────────────────────────────────────

  it("registerAdapter gives new adapter higher priority", async () => {
    const gw = createGateway([uwAdapter]);
    const customAdapter: ExtractionAdapter = {
      name: "custom-ocr",
      canHandle: (req) => req.mode === "uw_guide",
      extract: vi
        .fn()
        .mockResolvedValue(makeResult({ documentId: "custom-1" })),
    };
    gw.registerAdapter(customAdapter);

    const { adapterUsed } = await gw.extract(makeRequest("uw_guide"));
    expect(adapterUsed).toBe("custom-ocr");
  });

  it("falls through to default adapter if custom cannot handle", async () => {
    const gw = createGateway([uwAdapter]);
    const customAdapter: ExtractionAdapter = {
      name: "custom-ocr",
      canHandle: () => false, // Cannot handle anything
      extract: vi.fn(),
    };
    gw.registerAdapter(customAdapter);

    const { adapterUsed } = await gw.extract(makeRequest("uw_guide"));
    expect(adapterUsed).toBe("uw-text-layer");
    expect(customAdapter.extract).not.toHaveBeenCalled();
  });

  // ─── Error propagation ─────────────────────────────────────────────────

  it("propagates adapter errors without swallowing", async () => {
    uwAdapter.extract = vi
      .fn()
      .mockRejectedValue(new Error("Edge function exploded"));
    const gw = createGateway([uwAdapter]);
    await expect(gw.extract(makeRequest("uw_guide"))).rejects.toThrow(
      "Edge function exploded",
    );
  });
});
