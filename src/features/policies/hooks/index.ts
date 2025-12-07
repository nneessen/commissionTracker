// src/features/policies/hooks/index.ts
// Policy hooks barrel export

// Query hooks (GET)
export { usePolicy } from './usePolicy';
export { usePolicies, usePoliciesPaginated } from './usePolicies';
export type { UsePoliciesOptions, UsePoliciesPaginatedOptions, SortConfig } from './usePolicies';

// Mutation hooks (POST/PATCH/DELETE)
export { useCreatePolicy } from './useCreatePolicy';
export { useUpdatePolicy } from './useUpdatePolicy';
export type { UpdatePolicyParams } from './useUpdatePolicy';
export { useDeletePolicy } from './useDeletePolicy';

// Calculation hooks
export { usePolicySummary } from './usePolicySummary';
