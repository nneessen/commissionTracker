export const hierarchyKeys = {
  all: ["hierarchy"] as const,

  downline: (rootId: string, depth?: number, filtersHash?: string) =>
    [...hierarchyKeys.all, "downline", { rootId, depth, filtersHash }] as const,

  agencyTree: (rootAgencyId: string, depth?: number) =>
    [...hierarchyKeys.all, "agencyTree", { rootAgencyId, depth }] as const,

  rollup: (
    rootId: string,
    range?: { start: string; end: string },
    filtersHash?: string,
  ) =>
    [...hierarchyKeys.all, "rollup", { rootId, range, filtersHash }] as const,
};
