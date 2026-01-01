// src/services/analytics/segmentationService.ts

import { Policy } from "../../types";
import { parseLocalDate } from "../../lib/date";

/**
 * Client Segmentation Service
 *
 * Segments clients by value, identifies renewal opportunities,
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

export type RenewalRiskLevel = "high" | "medium" | "low";

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

export interface PolicyChargebackRisk {
  policyId: string;
  clientName: string;
  product: string;
  annualPremium: number;
  effectiveDate: string;
  monthsInContestability: number;
  riskLevel: RenewalRiskLevel;
}

/**
 * Calculate top chargeback risk policies
 * Returns the 5 highest premium policies still in contestability period (24 months)
 * These represent the most money at risk if the policy lapses
 */
export function calculatePolicyChargebackRisk(
  policies: Policy[],
  limit: number = 5,
): PolicyChargebackRisk[] {
  const now = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const CONTESTABILITY_MONTHS = 24;

  const atRiskPolicies: PolicyChargebackRisk[] = [];

  policies.forEach((policy) => {
    // Only active policies in contestability period
    if (policy.status !== "active") return;

    const effectiveDate = parseLocalDate(policy.effectiveDate);
    const monthsSinceEffective = Math.floor(
      (now.getTime() - effectiveDate.getTime()) / (DAY_MS * 30),
    );

    if (monthsSinceEffective < CONTESTABILITY_MONTHS) {
      let riskLevel: RenewalRiskLevel = "low";
      if (monthsSinceEffective < 6) {
        riskLevel = "high";
      } else if (monthsSinceEffective < 12) {
        riskLevel = "medium";
      }

      atRiskPolicies.push({
        policyId: policy.id,
        clientName: policy.client?.name || "Unknown",
        product: policy.product,
        annualPremium: policy.annualPremium || 0,
        effectiveDate: policy.effectiveDate,
        monthsInContestability: monthsSinceEffective,
        riskLevel,
      });
    }
  });

  // Sort by premium descending (highest risk first) and take top N
  return atRiskPolicies
    .sort((a, b) => b.annualPremium - a.annualPremium)
    .slice(0, limit);
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
