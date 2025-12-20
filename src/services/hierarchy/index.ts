// src/services/hierarchy/index.ts
// Barrel exports for hierarchy module

export { hierarchyService, HierarchyService } from "./hierarchyService";
export { HierarchyRepository } from "./HierarchyRepository";
export type {
  HierarchyBaseEntity,
  DirectReportProfile,
} from "./HierarchyRepository";

// NOTE: Policy, Commission, and Override types have been moved to their respective repositories:
// - PolicyMetricRow, PolicyWithRelations -> src/services/policies/PolicyRepository.ts
// - CommissionMetricRow, CommissionWithPolicy -> src/services/commissions/CommissionRepository.ts
// - OverrideMetricRow -> src/services/overrides/OverrideRepository.ts
