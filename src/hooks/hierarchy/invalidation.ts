import type { QueryClient } from "@tanstack/react-query";

export function invalidateHierarchyForNode(
  queryClient: QueryClient,
  nodeId: string,
) {
  queryClient.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) &&
      q.queryKey[0] === "hierarchy" &&
      JSON.stringify(q.queryKey).includes(nodeId),
  });
}
