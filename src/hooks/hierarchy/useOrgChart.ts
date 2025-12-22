// src/hooks/hierarchy/useOrgChart.ts
// Phase 12A: Hook for fetching org chart visualization data

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/base/supabase';
import type {
  OrgChartNode,
  OrgChartScope,
  OrgChartRequest,
  FlatOrgChartNode,
} from '@/types/hierarchy.types';

export interface UseOrgChartOptions {
  scope?: OrgChartScope;
  scopeId?: string;
  includeMetrics?: boolean;
  maxDepth?: number;
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Fetch org chart data with nested structure
 */
async function fetchOrgChartData(
  params: OrgChartRequest
): Promise<OrgChartNode | null> {
  const { data, error } = await supabase.rpc('get_org_chart_data', {
    p_scope: params.scope ?? 'auto',
    p_scope_id: params.scopeId ?? null,
    p_include_metrics: params.includeMetrics ?? true,
    p_max_depth: params.maxDepth ?? 10,
  });

  if (error) {
    console.error('Error fetching org chart data:', error);
    throw new Error(error.message);
  }

  return data as OrgChartNode | null;
}

/**
 * Flatten org chart tree for list/table views
 */
export function flattenOrgChart(
  node: OrgChartNode,
  parentId?: string,
  depth: number = 0,
  path: string[] = []
): FlatOrgChartNode[] {
  const currentPath = [...path, node.id];
  const childCount = countDescendants(node);

  const flatNode: FlatOrgChartNode = {
    ...node,
    parentId,
    depth,
    path: currentPath,
    hasChildren: node.children.length > 0,
    childCount,
  };

  const result: FlatOrgChartNode[] = [flatNode];

  for (const child of node.children) {
    result.push(...flattenOrgChart(child, node.id, depth + 1, currentPath));
  }

  return result;
}

/**
 * Count all descendants of a node
 */
function countDescendants(node: OrgChartNode): number {
  let count = node.children.length;
  for (const child of node.children) {
    count += countDescendants(child);
  }
  return count;
}

/**
 * Find a node by ID in the tree
 */
export function findNodeById(
  root: OrgChartNode,
  id: string
): OrgChartNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

/**
 * Get path from root to a specific node
 */
export function getPathToNode(
  root: OrgChartNode,
  targetId: string,
  path: OrgChartNode[] = []
): OrgChartNode[] | null {
  const currentPath = [...path, root];
  if (root.id === targetId) return currentPath;

  for (const child of root.children) {
    const result = getPathToNode(child, targetId, currentPath);
    if (result) return result;
  }

  return null;
}

/**
 * Hook to fetch org chart data
 * Automatically determines scope based on user role if not specified
 */
export function useOrgChart(options: UseOrgChartOptions = {}) {
  const {
    scope = 'auto',
    scopeId,
    includeMetrics = true,
    maxDepth = 10,
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
  } = options;

  return useQuery({
    queryKey: ['org-chart', scope, scopeId, includeMetrics, maxDepth],
    queryFn: () =>
      fetchOrgChartData({
        scope,
        scopeId,
        includeMetrics,
        maxDepth,
      }),
    staleTime,
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to get flattened org chart for table/list views
 */
export function useFlatOrgChart(options: UseOrgChartOptions = {}) {
  const query = useOrgChart(options);

  const flatData = query.data ? flattenOrgChart(query.data) : [];

  return {
    ...query,
    flatData,
  };
}
