// /home/nneessen/projects/commissionTracker/src/hooks/policies/index.ts

// Simple, single-purpose hooks for policy operations

// Query hooks
export { usePolicies } from './usePolicies'; // Legacy - will be deprecated
export { usePoliciesList } from './usePoliciesList';
export { usePoliciesView } from './usePoliciesView'; // Recommended for UI components

// Mutation hooks
export { useCreatePolicy } from './useCreatePolicy';
export { useUpdatePolicy } from './useUpdatePolicy';
export { useDeletePolicy } from './useDeletePolicy';