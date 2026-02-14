// src/services/analytics/leadVendorHeatService.ts
// Pure-function service for computing heat scores.
// V1: speed-based vendor scores (kept for backward compat)
// V2: conversion + ROI focused pack/vendor scores

import type {
  VendorHeatMetrics,
  VendorHeatScore,
  PackHeatMetrics,
  HeatScoreV2,
  HeatLevel,
  TrendDirection,
} from "@/types/lead-purchase.types";

// ============================================================================
// V1 SCORING COMPONENTS (sum to 100 max) — kept for existing vendor overview
// ============================================================================

function scoreTimeToFirstSale(medianDays: number): number {
  if (medianDays < 0) return 0;
  if (medianDays <= 7) return 25;
  if (medianDays <= 14) return 20;
  if (medianDays <= 21) return 16;
  if (medianDays <= 30) return 12;
  if (medianDays <= 45) return 8;
  if (medianDays <= 60) return 5;
  if (medianDays <= 90) return 2;
  return 0;
}

function scoreInterSaleCadence(avgDaysBetween: number): number {
  if (avgDaysBetween < 0) return 5;
  if (avgDaysBetween <= 7) return 20;
  if (avgDaysBetween <= 14) return 16;
  if (avgDaysBetween <= 21) return 13;
  if (avgDaysBetween <= 30) return 10;
  if (avgDaysBetween <= 45) return 7;
  if (avgDaysBetween <= 60) return 4;
  if (avgDaysBetween <= 90) return 2;
  return 0;
}

function scoreActiveAgentRatio(purchased: number, sold: number): number {
  if (purchased === 0) return 0;
  const ratio = sold / purchased;
  return Math.min(15, Math.round(ratio * 15 * 10) / 10);
}

function scorePackEfficiency(avgPoliciesPerPack: number): number {
  if (avgPoliciesPerPack >= 3) return 15;
  if (avgPoliciesPerPack >= 2) return 12;
  if (avgPoliciesPerPack >= 1.5) return 10;
  if (avgPoliciesPerPack >= 1) return 7;
  if (avgPoliciesPerPack >= 0.5) return 3;
  if (avgPoliciesPerPack > 0) return 1;
  return 0;
}

function scoreRecencyV1(daysSinceLastSale: number): number {
  if (daysSinceLastSale <= 7) return 15;
  if (daysSinceLastSale <= 14) return 12;
  if (daysSinceLastSale <= 21) return 10;
  if (daysSinceLastSale <= 30) return 8;
  if (daysSinceLastSale <= 45) return 5;
  if (daysSinceLastSale <= 60) return 3;
  if (daysSinceLastSale <= 90) return 1;
  return 0;
}

function scoreFreshnessV1(salesLast30d: number, salesLast90d: number): number {
  if (salesLast90d === 0) return 0;
  const ratio = salesLast30d / salesLast90d;
  if (ratio >= 0.6) return 10;
  if (ratio >= 0.5) return 9;
  if (ratio >= 0.4) return 7;
  if (ratio >= 0.33) return 5;
  if (ratio >= 0.2) return 3;
  if (ratio > 0) return 1;
  return 0;
}

function applyDampening(
  score: number,
  totalPacks90d: number,
  packsWithSales: number,
): number {
  if (totalPacks90d === 0) return Math.round(score * 0.1);
  if (totalPacks90d < 3 && packsWithSales === 0) return Math.round(score * 0.2);
  if (totalPacks90d < 3) return Math.round(score * 0.5);
  if (totalPacks90d < 5) return Math.round(score * 0.7);
  if (packsWithSales === 0) return Math.min(score, 15);
  return score;
}

// ============================================================================
// CLASSIFICATION (shared V1/V2)
// ============================================================================

export function getHeatLevel(score: number): HeatLevel {
  if (score >= 75) return "hot";
  if (score >= 55) return "warming";
  if (score >= 35) return "neutral";
  if (score >= 15) return "cooling";
  return "cold";
}

export function getTrendDirection(
  salesLast30d: number,
  salesLast90d: number,
): TrendDirection {
  if (salesLast90d === 0) return "right";
  const ratio = salesLast30d / salesLast90d;
  if (ratio >= 0.5) return "up";
  if (ratio >= 0.4) return "up-right";
  if (ratio >= 0.25) return "right";
  if (ratio >= 0.1) return "down-right";
  return "down";
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

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
// V1 COMPUTATION (existing vendor-level speed-based)
// ============================================================================

/**
 * Calculate heat scores for all vendors from per-vendor metrics (V1 speed-based).
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
    const recencyScore = scoreRecencyV1(m.daysSinceLastSale);
    const freshnessScore = scoreFreshnessV1(m.salesLast30d, m.salesLast90d);

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

// ============================================================================
// V2 SCORING COMPONENTS — Conversion + ROI focused (sum to 100 max)
// ============================================================================

/** Conversion Rate (max 25 pts) */
function scoreConversionRate(leadCount: number, policiesSold: number): number {
  if (leadCount === 0) return 0;
  const rate = (policiesSold / leadCount) * 100;
  if (rate >= 20) return 25;
  if (rate >= 15) return 22;
  if (rate >= 10) return 18;
  if (rate >= 7) return 14;
  if (rate >= 5) return 10;
  if (rate >= 3) return 6;
  if (rate >= 1) return 3;
  return 0;
}

/** ROI (max 20 pts) */
function scoreRoi(totalCost: number, commissionEarned: number): number {
  if (totalCost === 0) return 0;
  const roi = ((commissionEarned - totalCost) / totalCost) * 100;
  if (roi >= 200) return 20;
  if (roi >= 100) return 17;
  if (roi >= 50) return 14;
  if (roi >= 0) return 10;
  if (roi >= -25) return 6;
  if (roi >= -50) return 3;
  return 0;
}

/** Premium per Lead (max 15 pts) */
function scorePremiumPerLead(totalPremium: number, leadCount: number): number {
  if (leadCount === 0) return 0;
  const ppl = totalPremium / leadCount;
  if (ppl >= 500) return 15;
  if (ppl >= 300) return 13;
  if (ppl >= 200) return 11;
  if (ppl >= 100) return 8;
  if (ppl >= 50) return 5;
  if (ppl >= 25) return 3;
  return 0;
}

/** Recency (max 15 pts) */
function scoreRecencyV2(daysSinceLastSale: number): number {
  if (daysSinceLastSale <= 7) return 15;
  if (daysSinceLastSale <= 14) return 12;
  if (daysSinceLastSale <= 21) return 10;
  if (daysSinceLastSale <= 30) return 8;
  if (daysSinceLastSale <= 45) return 5;
  if (daysSinceLastSale <= 60) return 3;
  if (daysSinceLastSale <= 90) return 1;
  return 0;
}

/** Velocity (max 15 pts): sales_last_30d relative to expected rate based on pack age */
function scoreVelocity(
  salesLast30d: number,
  daysSincePurchase: number,
  leadCount: number,
): number {
  if (leadCount === 0 || daysSincePurchase === 0) return 0;
  // Expected: if pack is 30d old with 10 leads, ~1 sale is baseline
  const expectedMonthlyRate = Math.max(leadCount * 0.05, 0.5); // 5% conversion/month baseline
  const ratio = salesLast30d / expectedMonthlyRate;
  if (ratio >= 3) return 15;
  if (ratio >= 2) return 13;
  if (ratio >= 1.5) return 11;
  if (ratio >= 1) return 8;
  if (ratio >= 0.5) return 5;
  if (ratio > 0) return 3;
  return 0;
}

/** Agent Consistency (max 10 pts): for pack-level, 10 if any sales, 0 if none */
function scoreAgentConsistency(policiesSold: number): number {
  return policiesSold > 0 ? 10 : 0;
}

/** Dampen V2 scores for packs with too few leads */
function applyPackDampening(score: number, leadCount: number, policiesSold: number): number {
  if (leadCount < 5 && policiesSold === 0) return Math.round(score * 0.3);
  if (leadCount < 5) return Math.round(score * 0.6);
  if (leadCount < 10) return Math.round(score * 0.8);
  return score;
}

// ============================================================================
// V2 PACK-LEVEL COMPUTATION
// ============================================================================

/**
 * Calculate V2 heat scores for individual packs.
 */
export function calculatePackHeatScores(
  metrics: PackHeatMetrics[],
): Map<string, HeatScoreV2> {
  const results = new Map<string, HeatScoreV2>();

  for (const m of metrics) {
    const conversionScore = scoreConversionRate(m.leadCount, m.policiesSold);
    const roiScore = scoreRoi(m.totalCost, m.commissionEarned);
    const premiumScore = scorePremiumPerLead(m.totalPremium, m.leadCount);
    const recencyScore = scoreRecencyV2(m.daysSinceLastSale);
    const velocityScore = scoreVelocity(m.salesLast30d, m.daysSincePurchase, m.leadCount);
    const consistencyScore = scoreAgentConsistency(m.policiesSold);

    const rawScore =
      conversionScore + roiScore + premiumScore + recencyScore + velocityScore + consistencyScore;

    const score = Math.min(100, applyPackDampening(rawScore, m.leadCount, m.policiesSold));
    const level = getHeatLevel(score);
    // Trend for packs: based on recent velocity
    const trend: TrendDirection =
      m.salesLast30d >= 2
        ? "up"
        : m.salesLast30d === 1
          ? "up-right"
          : m.daysSinceLastSale <= 30
            ? "right"
            : m.daysSinceLastSale <= 60
              ? "down-right"
              : "down";

    results.set(m.packId, {
      id: m.packId,
      score,
      level,
      trend,
      breakdown: {
        conversionRate: conversionScore,
        roi: roiScore,
        premiumPerLead: premiumScore,
        recency: recencyScore,
        velocity: velocityScore,
        agentConsistency: consistencyScore,
      },
    });
  }

  return results;
}

// ============================================================================
// V2 VENDOR-LEVEL COMPUTATION (aggregates packs per vendor)
// ============================================================================

/**
 * Calculate V2 heat scores aggregated per vendor from pack metrics.
 */
export function calculateVendorHeatScoresV2(
  metrics: PackHeatMetrics[],
): Map<string, HeatScoreV2> {
  // Group packs by vendor
  const vendorPacks = new Map<string, PackHeatMetrics[]>();
  for (const m of metrics) {
    const existing = vendorPacks.get(m.vendorId) || [];
    existing.push(m);
    vendorPacks.set(m.vendorId, existing);
  }

  const results = new Map<string, HeatScoreV2>();

  for (const [vendorId, packs] of vendorPacks) {
    // Aggregate metrics across all packs for this vendor
    const totalLeads = packs.reduce((s, p) => s + p.leadCount, 0);
    const totalPolicies = packs.reduce((s, p) => s + p.policiesSold, 0);
    const totalCost = packs.reduce((s, p) => s + p.totalCost, 0);
    const totalCommission = packs.reduce((s, p) => s + p.commissionEarned, 0);
    const totalPremium = packs.reduce((s, p) => s + p.totalPremium, 0);
    const minDaysSinceLastSale = Math.min(...packs.map((p) => p.daysSinceLastSale));
    const totalSalesLast30d = packs.reduce((s, p) => s + p.salesLast30d, 0);
    const avgDaysSincePurchase =
      packs.reduce((s, p) => s + p.daysSincePurchase, 0) / packs.length;
    const packsWithSales = packs.filter((p) => p.policiesSold > 0).length;

    const conversionScore = scoreConversionRate(totalLeads, totalPolicies);
    const roiScore = scoreRoi(totalCost, totalCommission);
    const premiumScore = scorePremiumPerLead(totalPremium, totalLeads);
    const recencyScore = scoreRecencyV2(minDaysSinceLastSale);
    const velocityScore = scoreVelocity(totalSalesLast30d, avgDaysSincePurchase, totalLeads);
    // Agent consistency at vendor level: % of packs with at least 1 sale
    const consistencyRatio = packs.length > 0 ? packsWithSales / packs.length : 0;
    const consistencyScore = Math.round(consistencyRatio * 10);

    const rawScore =
      conversionScore + roiScore + premiumScore + recencyScore + velocityScore + consistencyScore;

    // Vendor-level dampening based on total pack count
    let score = rawScore;
    if (packs.length < 3 && totalPolicies === 0) score = Math.round(score * 0.3);
    else if (packs.length < 3) score = Math.round(score * 0.6);
    else if (packs.length < 5) score = Math.round(score * 0.8);
    score = Math.min(100, score);

    const level = getHeatLevel(score);
    const trend: TrendDirection =
      totalSalesLast30d >= 3
        ? "up"
        : totalSalesLast30d >= 1
          ? "up-right"
          : minDaysSinceLastSale <= 30
            ? "right"
            : minDaysSinceLastSale <= 60
              ? "down-right"
              : "down";

    results.set(vendorId, {
      id: vendorId,
      score,
      level,
      trend,
      breakdown: {
        conversionRate: conversionScore,
        roi: roiScore,
        premiumPerLead: premiumScore,
        recency: recencyScore,
        velocity: velocityScore,
        agentConsistency: consistencyScore,
      },
    });
  }

  return results;
}
