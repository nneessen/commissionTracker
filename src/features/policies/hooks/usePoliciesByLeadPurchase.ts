// src/features/policies/hooks/usePoliciesByLeadPurchase.ts
// Hook for fetching policies linked to a specific lead purchase

import { useQuery } from "@tanstack/react-query";
import { policyQueries } from "../queries";

/**
 * Fetch policies linked to a specific lead purchase
 * Used for ROI tracking display in LeadPurchaseDialog
 *
 * @param leadPurchaseId - Lead purchase UUID (or undefined/null to disable query)
 * @returns TanStack Query result with array of policies
 *
 * @example
 * const { data: policies = [], isLoading } = usePoliciesByLeadPurchase(purchaseId);
 */
export function usePoliciesByLeadPurchase(
  leadPurchaseId: string | null | undefined,
) {
  return useQuery({
    ...policyQueries.byLeadPurchase(leadPurchaseId!),
    enabled: !!leadPurchaseId,
  });
}
