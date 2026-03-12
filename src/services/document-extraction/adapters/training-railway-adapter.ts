// src/services/document-extraction/adapters/training-railway-adapter.ts
// Adapter wrapping the existing Railway PDF extractor API.
// Normalizes the PdfExtraction response into the canonical ExtractionResult.

import type {
  ExtractionRequest,
  ExtractionResult,
  CanonicalPage,
  CanonicalTable,
  CanonicalBlock,
  ExtractionWarning,
} from "../../../types/document-extraction.types";
import type { ExtractionAdapter } from "../core/types";
import type {
  PdfExtraction,
  ExtractionTable,
  Section,
  ExtractionPage,
} from "../../../features/training-modules/types/pdf-extraction.types";

/** Proxied through Vite dev server + Vercel rewrite to avoid CORS. */
const EXTRACTOR_URL = "/api/pdf-extract";

/** Default timeout for Railway API calls (2 minutes). */
const DEFAULT_TIMEOUT_MS = 120_000;

export class TrainingRailwayAdapter implements ExtractionAdapter {
  readonly name = "training-railway";

  canHandle(request: ExtractionRequest): boolean {
    return request.mode === "training_module";
  }

  async extract(request: ExtractionRequest): Promise<ExtractionResult> {
    if (request.source.type !== "file") {
      throw new Error(
        "[TrainingRailwayAdapter] Only file source is supported — Railway API requires FormData upload",
      );
    }

    const formData = new FormData();
    formData.append("file", request.source.file);
    formData.append("mode", "ocr_layout");
    formData.append("output_format", "training");

    // Enforce timeout — Railway is an external service that can hang
    const timeoutMs = request.options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(EXTRACTOR_URL, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(
          `[TrainingRailwayAdapter] Railway API timed out after ${timeoutMs}ms`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "unknown");
      throw new Error(
        `[TrainingRailwayAdapter] Railway API error ${response.status}: ${text}`,
      );
    }

    const extraction: PdfExtraction = await response.json();
    return this.normalize(extraction, request.context);
  }

  /** Convert Railway PdfExtraction → canonical ExtractionResult. */
  private normalize(
    raw: PdfExtraction,
    context?: Record<string, string>,
  ): ExtractionResult {
    const warnings: ExtractionWarning[] = [];

    // Normalize tables
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

    // Build a section lookup for page text assembly
    const sectionMap = new Map<string, Section>();
    for (const section of raw.sections ?? []) {
      sectionMap.set(section.section_id, section);
    }

    // Build canonical pages
    const pages: CanonicalPage[] = (raw.pages ?? []).map(
      (page: ExtractionPage) => {
        // Assemble page text from referenced sections
        const pageText = page.section_ids
          .map((sid) => sectionMap.get(sid)?.full_text ?? "")
          .filter(Boolean)
          .join("\n\n");

        // Build blocks from sections on this page
        const blocks: CanonicalBlock[] = page.section_ids.reduce<
          CanonicalBlock[]
        >((acc, sid) => {
          const section = sectionMap.get(sid);
          if (section) {
            acc.push({
              blockId: sid,
              type: "paragraph",
              text: section.full_text,
            });
          }
          return acc;
        }, []);

        // Tables on this page
        const pageTables = tables.filter(
          (t) => t.pageNumber === page.page_number,
        );

        return {
          pageNumber: page.page_number,
          text: pageText,
          blocks,
          tables: pageTables,
          ocrUsed: true, // Railway always uses OCR layout mode
        };
      },
    );

    // Assemble full text from all pages
    const fullText = pages.map((p) => p.text).join("\n\n");

    // Confidence: blend table confidence with section quality scores
    const tableConfidences = tables.map((t) => t.confidence);
    const sectionScores = (raw.sections ?? [])
      .filter((s) => !s.is_trivial)
      .map((s) => s.quality_score);
    const allScores = [...tableConfidences, ...sectionScores];
    const confidence =
      allScores.length > 0
        ? allScores.reduce((a, b) => a + b, 0) / allScores.length
        : 0.7;

    // Warn about trivial sections
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
        sourceType: "mixed", // Railway handles both text and scanned
      },
      pages,
      fullText,
      tables,
      warnings,
      confidence,
      extractedAt: new Date().toISOString(),
      context,
    };
  }
}
