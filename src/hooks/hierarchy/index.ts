// src/hooks/hierarchy/index.ts

// TanStack Query hooks for hierarchy data fetching
export { useHierarchyTree } from './useHierarchyTree';
export { useMyDownlines } from './useMyDownlines';
export { useDownlinePerformance } from './useDownlinePerformance';
export { useMyHierarchyStats } from './useMyHierarchyStats';

// Mutation hooks for hierarchy management
export { useUpdateAgentHierarchy } from './useUpdateAgentHierarchy';

// Export types
export type { UseHierarchyTreeOptions } from './useHierarchyTree';
export type { UseMyDownlinesOptions } from './useMyDownlines';
export type { UseDownlinePerformanceOptions } from './useDownlinePerformance';
export type { UseMyHierarchyStatsOptions } from './useMyHierarchyStats';
