// src/hooks/hierarchy/index.ts

// TanStack Query hooks for hierarchy data fetching
export { useHierarchyTree } from "./useHierarchyTree";
export { useMyDownlines } from "./useMyDownlines";
export { useDownlinePerformance } from "./useDownlinePerformance";
export { useAllDownlinePerformance } from "./useAllDownlinePerformance";
export { useMyHierarchyStats } from "./useMyHierarchyStats";

// Phase 12A: Org chart visualization
export {
  useOrgChart,
  useFlatOrgChart,
  flattenOrgChart,
  findNodeById,
  getPathToNode,
} from "./useOrgChart";

// Agent detail hooks
export { useAgentDetails } from "./useAgentDetails";
export { useAgentPolicies } from "./useAgentPolicies";
export { useAgentCommissions } from "./useAgentCommissions";
export { useAgentOverrides } from "./useAgentOverrides";
export { useTeamComparison } from "./useTeamComparison";
export { useUplineProfile } from "./useUplineProfile";

// Mutation hooks for hierarchy management
export { useUpdateAgentHierarchy } from "./useUpdateAgentHierarchy";

// Invitation system hooks
export {
  useReceivedInvitations,
  useSentInvitations,
  useInvitationStats,
  useSendInvitation,
  useAcceptInvitation,
  useDenyInvitation,
  useCancelInvitation,
  invitationKeys,
} from "./useInvitations";

// Export types
export type { UseHierarchyTreeOptions } from "./useHierarchyTree";
export type { UseMyDownlinesOptions } from "./useMyDownlines";
export type { UseDownlinePerformanceOptions } from "./useDownlinePerformance";
export type { UseAllDownlinePerformanceOptions } from "./useAllDownlinePerformance";
export type { UseMyHierarchyStatsOptions } from "./useMyHierarchyStats";
export type { UseAgentDetailsOptions } from "./useAgentDetails";
export type { UseAgentPoliciesOptions } from "./useAgentPolicies";
export type { UseAgentCommissionsOptions } from "./useAgentCommissions";
export type { UseAgentOverridesOptions } from "./useAgentOverrides";
export type { UseTeamComparisonOptions } from "./useTeamComparison";
export type { UseOrgChartOptions } from "./useOrgChart";
export type { UseUplineProfileOptions } from "./useUplineProfile";
