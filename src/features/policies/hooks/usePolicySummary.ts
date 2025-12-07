// src/features/policies/hooks/usePolicySummary.ts

import { Policy } from "../../../types/policy.types";
import { Commission } from "../../../types/commission.types";

interface PolicySummary {
  totalPolicies: number;
  activePolicies: number;
  pendingPolicies: number;
  totalAnnualPremium: number;
  totalPaidCommission: number;
  totalPendingCommission: number;
  expiringPolicies: Policy[];
  dateRangeLabel?: string;
}

export const usePolicySummary = (
  policies: Policy[],
  commissions: Commission[] = [],
  dateRangeLabel?: string,
): PolicySummary => {
  const activePolicies = policies.filter((p) => p.status === "active");

  const pendingPolicies = policies.filter((p) => p.status === "pending");

  const totalAnnualPremium = policies.reduce(
    (sum, p) => sum + (p.annualPremium || 0),
    0,
  );

  const policyIds = new Set(policies.map((p) => p.id));

  // Filter commissions for the current policies
  const relevantCommissions = commissions.filter(
    (c) => c.policyId && policyIds.has(c.policyId),
  );

  // Calculate actual commission amounts from database
  // Paid commissions: status = 'paid' or earned_amount > 0
  const totalPaidCommission = relevantCommissions
    .filter(
      (c) => c.status === "paid" || (c.earnedAmount && c.earnedAmount > 0),
    )
    .reduce((sum, c) => sum + (c.earnedAmount || 0), 0);

  // Pending commissions: status = 'pending' and amount > 0
  const totalPendingCommission = relevantCommissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + (c.amount || 0), 0);

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
    pendingPolicies: pendingPolicies.length,
    totalAnnualPremium,
    totalPaidCommission,
    totalPendingCommission,
    expiringPolicies,
    dateRangeLabel,
  };
};
