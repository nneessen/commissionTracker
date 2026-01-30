// src/features/policies/hooks/index.ts
// Policy hooks barrel export

// Query hooks (GET)
export { usePolicy } from "./usePolicy";
export { usePolicies, usePoliciesPaginated } from "./usePolicies";
export type {
  UsePoliciesOptions,
  UsePoliciesPaginatedOptions,
  SortConfig,
} from "./usePolicies";
export { usePoliciesByLeadPurchase } from "./usePoliciesByLeadPurchase";
export { useUnlinkedRecentPolicies } from "./useUnlinkedRecentPolicies";

// Mutation hooks (POST/PATCH/DELETE)
export { useCreatePolicy } from "./useCreatePolicy";
export { useUpdatePolicy } from "./useUpdatePolicy";
export type { UpdatePolicyParams } from "./useUpdatePolicy";
export { useUpdatePolicyLeadSource } from "./useUpdatePolicyLeadSource";
export { useDeletePolicy, useCheckSharedClient } from "./useDeletePolicy";

// Calculation hooks
export { usePolicySummary } from "./usePolicySummary";

// Form hooks
export {
  usePolicyForm,
  createInitialFormData,
  validatePolicyForm,
} from "./usePolicyForm";
export type { UsePolicyFormOptions, UsePolicyFormReturn } from "./usePolicyForm";
export {
  usePolicyCommission,
  useUserContractLevel,
} from "./usePolicyCommission";
export type { UsePolicyCommissionOptions, UsePolicyCommissionReturn } from "./usePolicyCommission";
