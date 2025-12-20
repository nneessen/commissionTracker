// src/services/analytics/segmentationService.ts

import { Policy } from "../../types";
import { parseLocalDate } from "../../lib/date";

/**
 * Client Segmentation Service
 *
 * Segments clients by value, identifies cross-sell opportunities,
 * and calculates lifetime value metrics.
 */

export type ClientValueTier = "high" | "medium" | "low";

export interface ClientSegment {
  clientId: string;
  clientName: string;
  tier: ClientValueTier;
  totalPolicies: number;
  totalPremium: number;
  avgPremium: number;
  states: string[];
  products: string[];
  firstPolicyDate: Date;
  latestPolicyDate: Date;
  monthsAsClient: number;
  crossSellOpportunity: boolean;
  crossSellScore: number; // 0-100
}

export interface ClientSegmentationSummary {
  highValue: ClientSegment[];
  mediumValue: ClientSegment[];
  lowValue: ClientSegment[];
  totalClients: number;
  highValueCount: number;
  mediumValueCount: number;
  lowValueCount: number;
  avgPremiumByTier: Record<ClientValueTier, number>;
  totalPremiumByTier: Record<ClientValueTier, number>;
}

export interface CrossSellOpportunity {
  clientId: string;
  clientName: string;
  currentPolicies: number;
  currentProducts: string[];
  totalPremium: number;
  missingProducts: string[];
  opportunityScore: number; // 0-100
  recommendedProducts: string[];
  estimatedValue: number;
}

export interface ClientLifetimeValue {
  clientId: string;
  clientName: string;
  lifetimeValue: number;
  activePolicies: number;
  totalPolicies: number;
  avgPolicyValue: number;
  retentionRate: number; // %
  estimatedFutureValue: number;
  riskScore: number; // 0-100 (higher = more risk)
}

/**
 * Segment clients by value tier
 * Uses Pareto principle: top 20% = high, next 30% = medium, rest = low
 */
export function segmentClientsByValue(
  policies: Policy[],
): ClientSegmentationSummary {
  // Group policies by client
  const clientMap = new Map<string, Policy[]>();

  policies.forEach((policy) => {
    const clientKey = policy.client?.name || "unknown";
    if (!clientMap.has(clientKey)) {
      clientMap.set(clientKey, []);
    }
    clientMap.get(clientKey)!.push(policy);
  });

  // Calculate client metrics
  const clientSegments: ClientSegment[] = [];

  clientMap.forEach((clientPolicies, clientId) => {
    const totalPolicies = clientPolicies.length;
    const totalPremium = clientPolicies.reduce(
      (sum, p) => sum + (p.annualPremium || 0),
      0,
    );
    const avgPremium = totalPolicies > 0 ? totalPremium / totalPolicies : 0;

    // Get unique states and products
    const states = [
      ...new Set(clientPolicies.map((p) => p.client?.state).filter(Boolean)),
    ];
    const products = [...new Set(clientPolicies.map((p) => p.product))];

    // Calculate client tenure
    const policyDates = clientPolicies.map((p) =>
      parseLocalDate(p.effectiveDate),
    );
    const firstPolicyDate = new Date(
      Math.min(...policyDates.map((d) => d.getTime())),
    );
    const latestPolicyDate = new Date(
      Math.max(...policyDates.map((d) => d.getTime())),
    );
    const monthsAsClient = Math.floor(
      (new Date().getTime() - firstPolicyDate.getTime()) /
        (1000 * 60 * 60 * 24 * 30),
    );

    // Cross-sell opportunity: client has 1 policy but could have more
    const crossSellOpportunity = totalPolicies < 3;
    const crossSellScore = calculateCrossSellScore(clientPolicies);

    const clientName = clientPolicies[0]?.client?.name || "Unknown";

    clientSegments.push({
      clientId,
      clientName,
      tier: "low", // Will be assigned later
      totalPolicies,
      totalPremium,
      avgPremium,
      states: states as string[],
      products,
      firstPolicyDate,
      latestPolicyDate,
      monthsAsClient,
      crossSellOpportunity,
      crossSellScore,
    });
  });

  // Sort by total premium (descending)
  clientSegments.sort((a, b) => b.totalPremium - a.totalPremium);

  // Assign tiers using Pareto principle
  const totalClients = clientSegments.length;
  const highValueThreshold = Math.floor(totalClients * 0.2); // Top 20%
  const mediumValueThreshold = Math.floor(totalClients * 0.5); // Next 30% (20% + 30% = 50%)

  clientSegments.forEach((segment, index) => {
    if (index < highValueThreshold) {
      segment.tier = "high";
    } else if (index < mediumValueThreshold) {
      segment.tier = "medium";
    } else {
      segment.tier = "low";
    }
  });

  // Calculate summary statistics
  const highValue = clientSegments.filter((c) => c.tier === "high");
  const mediumValue = clientSegments.filter((c) => c.tier === "medium");
  const lowValue = clientSegments.filter((c) => c.tier === "low");

  const avgPremiumByTier: Record<ClientValueTier, number> = {
    high:
      highValue.reduce((sum, c) => sum + c.avgPremium, 0) /
      (highValue.length || 1),
    medium:
      mediumValue.reduce((sum, c) => sum + c.avgPremium, 0) /
      (mediumValue.length || 1),
    low:
      lowValue.reduce((sum, c) => sum + c.avgPremium, 0) /
      (lowValue.length || 1),
  };

  const totalPremiumByTier: Record<ClientValueTier, number> = {
    high: highValue.reduce((sum, c) => sum + c.totalPremium, 0),
    medium: mediumValue.reduce((sum, c) => sum + c.totalPremium, 0),
    low: lowValue.reduce((sum, c) => sum + c.totalPremium, 0),
  };

  return {
    highValue,
    mediumValue,
    lowValue,
    totalClients,
    highValueCount: highValue.length,
    mediumValueCount: mediumValue.length,
    lowValueCount: lowValue.length,
    avgPremiumByTier,
    totalPremiumByTier,
  };
}

/**
 * Calculate cross-sell opportunities
 * Identifies clients with potential for additional policies
 */
export function calculateCrossSellOpportunities(
  policies: Policy[],
): CrossSellOpportunity[] {
  const allProducts = [
    "whole_life",
    "term",
    "universal_life",
    "indexed_universal_life",
    "accidental",
    "final_expense",
    "annuity",
  ];

  // Group policies by client
  const clientMap = new Map<string, Policy[]>();

  policies.forEach((policy) => {
    const clientKey = policy.client?.name || "unknown";
    if (!clientMap.has(clientKey)) {
      clientMap.set(clientKey, []);
    }
    clientMap.get(clientKey)!.push(policy);
  });

  const opportunities: CrossSellOpportunity[] = [];

  clientMap.forEach((clientPolicies, clientId) => {
    const currentProducts = [...new Set(clientPolicies.map((p) => p.product))];

    const missingProducts = allProducts.filter(
      (p) => !currentProducts.includes(p as any),
    );

    // Only consider if client has less than all products
    if (missingProducts.length > 0) {
      const totalPremium = clientPolicies.reduce(
        (sum, p) => sum + (p.annualPremium || 0),
        0,
      );
      const avgPremium =
        clientPolicies.length > 0 ? totalPremium / clientPolicies.length : 0;

      // Calculate opportunity score based on:
      // 1. Current client value (higher value = higher score)
      // 2. Number of missing products
      // 3. Client tenure (longer = higher score)
      const valueScore = Math.min(40, (totalPremium / 10000) * 40); // Max 40 points
      const productScore = (missingProducts.length / allProducts.length) * 40; // Max 40 points
      const tenureMonths = Math.floor(
        (new Date().getTime() -
          parseLocalDate(clientPolicies[0].effectiveDate).getTime()) /
          (1000 * 60 * 60 * 24 * 30),
      );
      const tenureScore = Math.min(20, (tenureMonths / 12) * 20); // Max 20 points for 1+ year

      const opportunityScore = Math.min(
        100,
        Math.round(valueScore + productScore + tenureScore),
      );

      // Recommend products based on current holdings
      const recommendedProducts = getRecommendedProducts(
        currentProducts,
        missingProducts,
      );

      // Estimate value based on current average
      const estimatedValue = avgPremium * recommendedProducts.length;

      const clientName = clientPolicies[0]?.client?.name || "Unknown";

      opportunities.push({
        clientId,
        clientName,
        currentPolicies: clientPolicies.length,
        currentProducts,
        totalPremium,
        missingProducts,
        opportunityScore,
        recommendedProducts,
        estimatedValue,
      });
    }
  });

  // Sort by opportunity score (descending)
  return opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

/**
 * Calculate client lifetime value
 */
export function getClientLifetimeValue(
  policies: Policy[],
): ClientLifetimeValue[] {
  // Group policies by client
  const clientMap = new Map<string, Policy[]>();

  policies.forEach((policy) => {
    const clientKey = policy.client?.name || "unknown";
    if (!clientMap.has(clientKey)) {
      clientMap.set(clientKey, []);
    }
    clientMap.get(clientKey)!.push(policy);
  });

  const lifetimeValues: ClientLifetimeValue[] = [];

  clientMap.forEach((clientPolicies, clientId) => {
    const totalPolicies = clientPolicies.length;
    const activePolicies = clientPolicies.filter(
      (p) => p.status === "active",
    ).length;
    const lifetimeValue = clientPolicies.reduce(
      (sum, p) => sum + (p.annualPremium || 0),
      0,
    );
    const avgPolicyValue =
      totalPolicies > 0 ? lifetimeValue / totalPolicies : 0;
    const retentionRate =
      totalPolicies > 0 ? (activePolicies / totalPolicies) * 100 : 0;

    // Estimate future value based on retention and average policy value
    // Assumes client will maintain current retention rate and add 1 policy per year
    const estimatedFutureValue =
      retentionRate > 50
        ? lifetimeValue + avgPolicyValue * (retentionRate / 100) * 3 // 3 years projection
        : lifetimeValue * 0.5; // Conservative if low retention

    // Calculate risk score (0-100, higher = more risk)
    const lapsedPolicies = clientPolicies.filter(
      (p) => p.status === "lapsed",
    ).length;
    const cancelledPolicies = clientPolicies.filter(
      (p) => p.status === "cancelled",
    ).length;
    const riskScore =
      totalPolicies > 0
        ? Math.round(
            ((lapsedPolicies + cancelledPolicies) / totalPolicies) * 100,
          )
        : 0;

    const clientName = clientPolicies[0]?.client?.name || "Unknown";

    lifetimeValues.push({
      clientId,
      clientName,
      lifetimeValue,
      activePolicies,
      totalPolicies,
      avgPolicyValue,
      retentionRate,
      estimatedFutureValue,
      riskScore,
    });
  });

  // Sort by lifetime value (descending)
  return lifetimeValues.sort((a, b) => b.lifetimeValue - a.lifetimeValue);
}

/**
 * Helper: Calculate cross-sell score for a client
 */
function calculateCrossSellScore(clientPolicies: Policy[]): number {
  const hasMultiplePolicies = clientPolicies.length > 1;
  const allActive = clientPolicies.every((p) => p.status === "active");
  const highValue = clientPolicies.some((p) => (p.annualPremium || 0) > 5000);

  let score = 0;
  if (!hasMultiplePolicies) score += 40; // Higher score for single-policy clients
  if (allActive) score += 30;
  if (highValue) score += 20; // Reduced from 30 to prevent overflow

  return Math.min(100, score);
}

/**
 * Helper: Get recommended products based on current holdings
 */
function getRecommendedProducts(
  currentProducts: string[],
  missingProducts: string[],
): string[] {
  // Simple recommendation logic:
  // - If has term, recommend whole_life
  // - If has whole_life, recommend annuity
  // - If has neither, recommend term (most common)

  const recommendations: string[] = [];

  if (
    currentProducts.includes("term") &&
    missingProducts.includes("whole_life")
  ) {
    recommendations.push("whole_life");
  }

  if (
    currentProducts.includes("whole_life") &&
    missingProducts.includes("annuity")
  ) {
    recommendations.push("annuity");
  }

  if (recommendations.length === 0 && missingProducts.includes("term")) {
    recommendations.push("term");
  }

  // Add up to 2 more from missing products
  const remaining = missingProducts.filter((p) => !recommendations.includes(p));
  recommendations.push(...remaining.slice(0, 2));

  return recommendations;
}
