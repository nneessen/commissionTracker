// src/features/policies/hooks/useUnlinkedRecentPolicies.ts
// Hook for fetching recent policies not linked to any lead purchase

import { useQuery } from "@tanstack/react-query";
import { policyQueries } from "../queries";

/**
 * Fetch recent policies (last 90 days) that are NOT linked to any lead purchase
 * Only returns the current user's policies
 * Used for the policy selector in LeadPurchaseDialog
 */
export function useUnlinkedRecentPolicies(userId: string | undefined) {
  return useQuery({
    ...policyQueries.unlinkedRecent(userId ?? ""),
    enabled: !!userId,
  });
}
