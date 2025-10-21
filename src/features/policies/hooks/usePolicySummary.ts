// src/features/policies/hooks/usePolicySummary.ts

import { useMemo } from "react";
import { Policy } from "../../../types/policy.types";

interface PolicySummary {
  totalPolicies: number;
  activePolicies: number;
  totalAnnualPremium: number;
  totalExpectedCommission: number;
  averageCommissionRate: number;
  expiringPolicies: Policy[];
}

/**
 * Custom hook to calculate policy summary statistics
 * @param policies - Array of policies to analyze
 * @returns Summary object with calculated metrics
 */
export const usePolicySummary = (policies: Policy[]): PolicySummary => {
  return useMemo(() => {
    // Calculate summary stats
    const activePolicies = policies.filter((p) => p.status === "active");
    const totalAnnualPremium = policies.reduce(
      (sum, p) => sum + (p.annualPremium || 0),
      0,
    );
    const totalExpectedCommission = policies.reduce(
      (sum, p) =>
        sum + ((p.annualPremium || 0) * (p.commissionPercentage || 0)) / 100,
      0,
    );

    const averageCommissionRate =
      totalAnnualPremium > 0
        ? (totalExpectedCommission / totalAnnualPremium) * 100
        : 0;

    // Get expiring policies (within 30 days)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const now = new Date();

    const expiringPolicies = policies.filter((policy) => {
      if (!policy.expirationDate) return false;
      const expDate = new Date(policy.expirationDate).getTime();
      return expDate >= now.getTime() && expDate <= futureDate.getTime();
    });

    return {
      totalPolicies: policies.length,
      activePolicies: activePolicies.length,
      totalAnnualPremium,
      totalExpectedCommission,
      averageCommissionRate,
      expiringPolicies,
    };
  }, [policies]);
};
