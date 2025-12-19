// src/features/reports/utils/reportDataTransformers.ts

import type { ReportSection } from "../../../types/reports.types";

/**
 * Creates a stable initial date range for report filters
 */
export function getInitialDateRange(): { startDate: Date; endDate: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  return {
    startDate: today,
    endDate: endDate,
  };
}

/**
 * Parse a currency string or number to a numeric value
 */
export function parseCurrency(value: string | number): number {
  if (typeof value === "number") return value;
  return parseFloat(value.replace(/[$,]/g, "")) || 0;
}

/**
 * Chart data type for commission aging visualization
 */
export interface AgingChartDataPoint {
  bucket: string;
  atRisk: number;
  earned: number;
  riskLevel: string;
}

/**
 * Extract chart data from commission aging table section
 */
export function getAgingChartData(
  section: ReportSection,
): AgingChartDataPoint[] {
  if (!section.tableData) return [];
  return section.tableData.rows.map((row) => ({
    bucket: String(row[0]),
    atRisk: parseCurrency(row[2]),
    earned: 0, // Aging table doesn't have earned column
    riskLevel: String(row[3]),
  }));
}

/**
 * Chart data type for client tier visualization
 */
export interface TierChartDataPoint {
  tier: string;
  count: number;
}

/**
 * Extract chart data from client tier table section
 */
export function getTierChartData(section: ReportSection): TierChartDataPoint[] {
  if (!section.tableData) return [];
  return section.tableData.rows.map((row) => ({
    tier: String(row[0])
      .replace(/^.*Tier\s*/, "")
      .replace(/\s*-.*$/, "")
      .trim()
      .charAt(0),
    count: typeof row[1] === "number" ? row[1] : parseInt(String(row[1])) || 0,
  }));
}

/**
 * Client tier descriptions for drill-down context
 */
export const TIER_DESCRIPTIONS: Record<string, string> = {
  A: "High-value clients with $10K+ total premium",
  B: "Growth clients with $5K-$10K total premium",
  C: "Standard clients with $2K-$5K total premium",
  D: "Entry-level clients with less than $2K total premium",
};
