// src/services/analytics/leadVendorHeatService.ts
// Pure-function service for computing vendor heat scores from per-vendor metrics.
// The SQL RPC does the heavy lifting (timing calculations, agent counts).
// This service scores and classifies.

import type {
  VendorHeatMetrics,
  VendorHeatScore,
  HeatLevel,
  TrendDirection,
} from "@/types/lead-purchase.types";

// ============================================================================
// SCORING COMPONENTS (sum to 100 max)
// ============================================================================

/**
 * Time-to-first-sale (max 25 pts):
 * How quickly do leads from this vendor convert to a first sale?
 * Median days: <=7d = 25pts, 14d = 20pts, 30d = 12pts, 60d = 5pts, 90+d = 0pts
 */
function scoreTimeToFirstSale(medianDays: number): number {
  if (medianDays < 0) return 0; // no data
  if (medianDays <= 7) return 25;
  if (medianDays <= 14) return 20;
  if (medianDays <= 21) return 16;
  if (medianDays <= 30) return 12;
  if (medianDays <= 45) return 8;
  if (medianDays <= 60) return 5;
  if (medianDays <= 90) return 2;
  return 0;
}

/**
 * Inter-sale cadence (max 20 pts):
 * For packs with multiple sales, how tight is the gap between consecutive sales?
 * <=7d = 20pts, 14d = 16pts, 30d = 10pts, 60d = 4pts, 90+d = 0pts
 */
function scoreInterSaleCadence(avgDaysBetween: number): number {
  if (avgDaysBetween < 0) return 5; // no data (packs have <=1 sale) — neutral
  if (avgDaysBetween <= 7) return 20;
  if (avgDaysBetween <= 14) return 16;
  if (avgDaysBetween <= 21) return 13;
  if (avgDaysBetween <= 30) return 10;
  if (avgDaysBetween <= 45) return 7;
  if (avgDaysBetween <= 60) return 4;
  if (avgDaysBetween <= 90) return 2;
  return 0;
}

/**
 * Active agent ratio (max 15 pts):
 * Of agents who purchased leads in last 30 days, what % have made sales?
 * 100% = 15pts, 50% = 7.5pts, 0% = 0pts
 * Also factors in whether anyone purchased at all recently.
 */
function scoreActiveAgentRatio(purchased: number, sold: number): number {
  if (purchased === 0) return 0; // nobody buying from this vendor recently
  const ratio = sold / purchased;
  return Math.min(15, Math.round(ratio * 15 * 10) / 10);
}

/**
 * Pack efficiency (max 15 pts):
 * Average policies sold per lead pack. More policies per pack = better quality leads.
 * >=3 = 15pts, 2 = 12pts, 1.5 = 10pts, 1 = 7pts, 0.5 = 3pts, 0 = 0pts
 */
function scorePackEfficiency(avgPoliciesPerPack: number): number {
  if (avgPoliciesPerPack >= 3) return 15;
  if (avgPoliciesPerPack >= 2) return 12;
  if (avgPoliciesPerPack >= 1.5) return 10;
  if (avgPoliciesPerPack >= 1) return 7;
  if (avgPoliciesPerPack >= 0.5) return 3;
  if (avgPoliciesPerPack > 0) return 1;
  return 0;
}

/**
 * Recency (max 15 pts):
 * Days since last policy sale linked to this vendor.
 * 0-7d = 15pts, 14d = 12pts, 30d = 8pts, 60d = 3pts, 90+d = 0pts
 */
function scoreRecency(daysSinceLastSale: number): number {
  if (daysSinceLastSale <= 7) return 15;
  if (daysSinceLastSale <= 14) return 12;
  if (daysSinceLastSale <= 21) return 10;
  if (daysSinceLastSale <= 30) return 8;
  if (daysSinceLastSale <= 45) return 5;
  if (daysSinceLastSale <= 60) return 3;
  if (daysSinceLastSale <= 90) return 1;
  return 0;
}

/**
 * Freshness of activity (max 10 pts):
 * What % of the vendor's 90-day sales happened in the last 30 days?
 * Measures whether activity is front-loaded (recent) or back-loaded (cooling off).
 * >50% in last 30d = 10pts, ~33% = 5pts (even distribution), <20% = 2pts
 */
function scoreFreshness(salesLast30d: number, salesLast90d: number): number {
  if (salesLast90d === 0) return 0;
  const ratio = salesLast30d / salesLast90d;
  // 33% is expected even distribution (30/90 days). Above that = accelerating.
  if (ratio >= 0.6) return 10;
  if (ratio >= 0.5) return 9;
  if (ratio >= 0.4) return 7;
  if (ratio >= 0.33) return 5; // even
  if (ratio >= 0.2) return 3;
  if (ratio > 0) return 1;
  return 0;
}

// ============================================================================
// VOLUME DAMPENING
// ============================================================================

/** Dampen scores for vendors with insufficient data */
function applyDampening(
  score: number,
  totalPacks90d: number,
  packsWithSales: number,
): number {
  // No packs at all in 90 days → heavily dampened
  if (totalPacks90d === 0) return Math.round(score * 0.1);
  // Very few packs, none with sales → noisy signal
  if (totalPacks90d < 3 && packsWithSales === 0) return Math.round(score * 0.2);
  // Few packs → moderate dampening
  if (totalPacks90d < 3) return Math.round(score * 0.5);
  if (totalPacks90d < 5) return Math.round(score * 0.7);
  // No packs with sales but decent volume → cap score
  if (packsWithSales === 0) return Math.min(score, 15);
  return score;
}

// ============================================================================
// CLASSIFICATION
// ============================================================================

/** Determine heat level from score */
export function getHeatLevel(score: number): HeatLevel {
  if (score >= 75) return "hot";
  if (score >= 55) return "warming";
  if (score >= 35) return "neutral";
  if (score >= 15) return "cooling";
  return "cold";
}

/**
 * Trend direction: is the vendor accelerating or cooling?
 * Based on freshness ratio (last 30d vs last 90d)
 */
export function getTrendDirection(
  salesLast30d: number,
  salesLast90d: number,
): TrendDirection {
  if (salesLast90d === 0) return "right"; // no data = flat
  const ratio = salesLast30d / salesLast90d;
  if (ratio >= 0.5) return "up"; // >50% of 90d sales in last 30d = accelerating
  if (ratio >= 0.4) return "up-right";
  if (ratio >= 0.25) return "right"; // even-ish
  if (ratio >= 0.1) return "down-right";
  return "down"; // <10% in last 30d = cooling off fast
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/** Heat level color classes */
export function getHeatColor(level: HeatLevel): string {
  switch (level) {
    case "hot":
      return "text-red-500";
    case "warming":
      return "text-orange-500";
    case "neutral":
      return "text-zinc-400";
    case "cooling":
      return "text-sky-400";
    case "cold":
      return "text-blue-500";
  }
}

/** Heat level background for badges */
export function getHeatBgColor(level: HeatLevel): string {
  switch (level) {
    case "hot":
      return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
    case "warming":
      return "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800";
    case "neutral":
      return "bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-700";
    case "cooling":
      return "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800";
    case "cold":
      return "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800";
  }
}

/** Trend arrow character */
export function getTrendArrow(trend: TrendDirection): string {
  switch (trend) {
    case "up":
      return "\u2191";
    case "up-right":
      return "\u2197";
    case "right":
      return "\u2192";
    case "down-right":
      return "\u2198";
    case "down":
      return "\u2193";
  }
}

// ============================================================================
// MAIN COMPUTATION
// ============================================================================

/**
 * Calculate heat scores for all vendors from per-vendor metrics.
 */
export function calculateVendorHeatScores(
  metrics: VendorHeatMetrics[],
): Map<string, VendorHeatScore> {
  const results = new Map<string, VendorHeatScore>();

  for (const m of metrics) {
    const timeToFirstSaleScore = scoreTimeToFirstSale(m.medianDaysToFirstSale);
    const interSaleCadenceScore = scoreInterSaleCadence(m.avgDaysBetweenSales);
    const activeAgentScore = scoreActiveAgentRatio(
      m.agentsPurchased30d,
      m.agentsWithSales30d,
    );
    const packEfficiencyScore = scorePackEfficiency(m.avgPoliciesPerPack);
    const recencyScore = scoreRecency(m.daysSinceLastSale);
    const freshnessScore = scoreFreshness(m.salesLast30d, m.salesLast90d);

    const rawScore =
      timeToFirstSaleScore +
      interSaleCadenceScore +
      activeAgentScore +
      packEfficiencyScore +
      recencyScore +
      freshnessScore;

    const score = Math.min(
      100,
      applyDampening(rawScore, m.totalPacks90d, m.packsWithSales),
    );
    const level = getHeatLevel(score);
    const trend = getTrendDirection(m.salesLast30d, m.salesLast90d);

    results.set(m.vendorId, {
      vendorId: m.vendorId,
      score,
      level,
      trend,
      medianDaysToFirstSale: m.medianDaysToFirstSale,
      avgDaysBetweenSales: m.avgDaysBetweenSales,
      agentSalesRatio30d: `${m.agentsWithSales30d}/${m.agentsPurchased30d}`,
      avgPoliciesPerPack: Math.round(m.avgPoliciesPerPack * 100) / 100,
      daysSinceLastSale: m.daysSinceLastSale,
      salesLast30d: m.salesLast30d,
      totalPacks90d: m.totalPacks90d,
      breakdown: {
        timeToFirstSale: timeToFirstSaleScore,
        interSaleCadence: interSaleCadenceScore,
        activeAgentRatio: Math.round(activeAgentScore * 10) / 10,
        packEfficiency: packEfficiencyScore,
        recency: recencyScore,
        freshness: freshnessScore,
      },
    });
  }

  return results;
}
