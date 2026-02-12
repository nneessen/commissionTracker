// src/hooks/lead-purchases/index.ts
export * from "./useLeadVendors";
export * from "./useLeadPurchases";

// Re-export heat display utilities for use in feature components
export {
  getHeatColor,
  getHeatBgColor,
  getTrendArrow,
} from "@/services/analytics";
