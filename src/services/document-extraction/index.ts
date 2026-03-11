// src/services/document-extraction/index.ts
// Barrel export for the document extraction service boundary.
// Only the gateway and types are public — adapter classes are internal.

export { extractionGateway } from "./extraction-gateway";
export type { ExtractionAdapter, GatewayResult } from "./core/types";
