// src/hooks/hierarchy/__tests__/hierarchyKeys.test.ts

import { describe, expect, it } from "vitest";
import { hierarchyKeys } from "../hierarchyKeys";

describe("hierarchyKeys", () => {
  it("builds downline keys with stable shape", () => {
    expect(hierarchyKeys.downline("root", 3, "filters")).toEqual([
      "hierarchy",
      "downline",
      { rootId: "root", depth: 3, filtersHash: "filters" },
    ]);
  });

  it("builds agency tree keys with depth", () => {
    expect(hierarchyKeys.agencyTree("agency", 2)).toEqual([
      "hierarchy",
      "agencyTree",
      { rootAgencyId: "agency", depth: 2 },
    ]);
  });

  it("builds rollup keys with range and filters", () => {
    expect(
      hierarchyKeys.rollup(
        "root",
        { start: "2025-01-01", end: "2025-01-31" },
        "stats",
      ),
    ).toEqual([
      "hierarchy",
      "rollup",
      {
        rootId: "root",
        range: { start: "2025-01-01", end: "2025-01-31" },
        filtersHash: "stats",
      },
    ]);
  });
});
