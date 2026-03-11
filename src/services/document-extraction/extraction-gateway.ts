// src/services/document-extraction/extraction-gateway.ts
// Central gateway routing extraction requests to the appropriate adapter.
// All consumers call the gateway — never an adapter directly.

import type { ExtractionRequest } from "../../types/document-extraction.types";
import type { ExtractionAdapter, GatewayResult } from "./core/types";
import { UwTextAdapter } from "./adapters/uw-text-adapter";
import { TrainingRailwayAdapter } from "./adapters/training-railway-adapter";

class ExtractionGateway {
  private adapters: ExtractionAdapter[] | null = null;

  private getAdapters(): ExtractionAdapter[] {
    if (!this.adapters) {
      // Deferred construction — adapters are only instantiated on first use,
      // not at module load time. Import is static (ESM-safe) but construction
      // is lazy so pages that never call extract() pay no init cost.
      this.adapters = [new UwTextAdapter(), new TrainingRailwayAdapter()];
    }
    return this.adapters;
  }

  /** Register an additional adapter (e.g. PaddleOCR). */
  registerAdapter(adapter: ExtractionAdapter): void {
    const adapters = this.getAdapters();
    adapters.unshift(adapter); // Higher priority than defaults
  }

  /** Route a request to the first matching adapter and return the result. */
  async extract(request: ExtractionRequest): Promise<GatewayResult> {
    const adapters = this.getAdapters();
    const adapter = adapters.find((a) => a.canHandle(request));
    if (!adapter) {
      throw new Error(
        `[ExtractionGateway] No adapter found for mode="${request.mode}"`,
      );
    }

    console.debug(
      `[ExtractionGateway] Routing mode="${request.mode}" → adapter="${adapter.name}"`,
    );

    const start = performance.now();
    const result = await adapter.extract(request);
    const durationMs = Math.round(performance.now() - start);

    console.debug(
      `[ExtractionGateway] Completed in ${durationMs}ms — ${result.pages.length} pages, ${result.tables.length} tables, confidence=${result.confidence}`,
    );

    return { result, adapterUsed: adapter.name, durationMs };
  }
}

/** Singleton gateway instance. Adapters are lazily created on first extract(). */
export const extractionGateway = new ExtractionGateway();
