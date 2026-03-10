const SESSION_QUERY_VERSION = "v2";

export const underwritingQueryKeys = {
  all: ["underwriting"] as const,
  conditions: () => [...underwritingQueryKeys.all, "conditions"] as const,
  guides: (imoId: string) =>
    [...underwritingQueryKeys.all, "guides", imoId] as const,
  guide: (guideId: string) =>
    [...underwritingQueryKeys.all, "guide", guideId] as const,
  decisionTrees: (imoId: string) =>
    [...underwritingQueryKeys.all, "decision-trees", imoId] as const,
  decisionTree: (treeId: string) =>
    [...underwritingQueryKeys.all, "decision-tree", treeId] as const,
  sessions: (userId: string) =>
    [
      ...underwritingQueryKeys.all,
      "session-history",
      SESSION_QUERY_VERSION,
      "user",
      userId,
    ] as const,
  sessionsPaginated: (
    userId: string,
    page: number,
    pageSize: number,
    search: string,
  ) =>
    [
      ...underwritingQueryKeys.sessions(userId),
      { page, pageSize, search },
    ] as const,
  session: (sessionId: string) =>
    [
      ...underwritingQueryKeys.all,
      "session-detail",
      SESSION_QUERY_VERSION,
      sessionId,
    ] as const,
  agencySessions: (imoId: string | null | undefined, agencyId: string) =>
    [
      ...underwritingQueryKeys.all,
      "session-history",
      SESSION_QUERY_VERSION,
      "agency",
      imoId || "no-imo",
      agencyId,
    ] as const,
  agencySessionsPaginated: (
    imoId: string | null | undefined,
    agencyId: string,
    page: number,
    pageSize: number,
    search: string,
  ) =>
    [
      ...underwritingQueryKeys.agencySessions(imoId, agencyId),
      { page, pageSize, search },
    ] as const,
  featureEnabled: (agencyId: string) =>
    [...underwritingQueryKeys.all, "feature-enabled", agencyId] as const,
};
