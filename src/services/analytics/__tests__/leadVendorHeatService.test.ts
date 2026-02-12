import { describe, it, expect } from "vitest";
import {
  calculateVendorHeatScores,
  getHeatLevel,
  getTrendDirection,
} from "../leadVendorHeatService";
import type { VendorHeatMetrics } from "@/types/lead-purchase.types";

function makeMetrics(
  overrides: Partial<VendorHeatMetrics> = {},
): VendorHeatMetrics {
  return {
    vendorId: "test-vendor-1",
    medianDaysToFirstSale: 10,
    avgDaysToFirstSale: 12,
    packsWithSales: 5,
    avgDaysBetweenSales: 14,
    agentsPurchased30d: 4,
    agentsWithSales30d: 2,
    avgPoliciesPerPack: 1.5,
    daysSinceLastSale: 5,
    salesLast30d: 8,
    salesLast90d: 15,
    totalPacks90d: 10,
    totalLeads90d: 100,
    totalPoliciesAllTime: 30,
    ...overrides,
  };
}

describe("leadVendorHeatService", () => {
  describe("calculateVendorHeatScores", () => {
    it("returns a Map keyed by vendorId", () => {
      const result = calculateVendorHeatScores([makeMetrics()]);
      expect(result).toBeInstanceOf(Map);
      expect(result.has("test-vendor-1")).toBe(true);
    });

    it("handles empty input", () => {
      const result = calculateVendorHeatScores([]);
      expect(result.size).toBe(0);
    });

    it("score never exceeds 100", () => {
      // Max everything: fast first sale, tight cadence, all agents sell, high efficiency, very recent, fresh
      const maxMetrics = makeMetrics({
        medianDaysToFirstSale: 3,
        avgDaysBetweenSales: 3,
        agentsPurchased30d: 5,
        agentsWithSales30d: 5,
        avgPoliciesPerPack: 5,
        daysSinceLastSale: 1,
        salesLast30d: 20,
        salesLast90d: 25,
        totalPacks90d: 10,
        packsWithSales: 8,
      });
      const result = calculateVendorHeatScores([maxMetrics]);
      expect(result.get("test-vendor-1")!.score).toBeLessThanOrEqual(100);
    });

    it("handles all-zero metrics", () => {
      const zeroMetrics = makeMetrics({
        medianDaysToFirstSale: -1,
        avgDaysToFirstSale: -1,
        packsWithSales: 0,
        avgDaysBetweenSales: -1,
        agentsPurchased30d: 0,
        agentsWithSales30d: 0,
        avgPoliciesPerPack: 0,
        daysSinceLastSale: 999,
        salesLast30d: 0,
        salesLast90d: 0,
        totalPacks90d: 0,
        totalLeads90d: 0,
        totalPoliciesAllTime: 0,
      });
      const result = calculateVendorHeatScores([zeroMetrics]);
      const score = result.get("test-vendor-1")!;
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.level).toBe("cold");
    });

    it("negative medianDaysToFirstSale yields 0 for time-to-first-sale component", () => {
      const metrics = makeMetrics({ medianDaysToFirstSale: -5 });
      const result = calculateVendorHeatScores([metrics]);
      expect(result.get("test-vendor-1")!.breakdown.timeToFirstSale).toBe(0);
    });

    it("applies volume dampening for low pack count", () => {
      const fewPacks = makeMetrics({ totalPacks90d: 2, packsWithSales: 1 });
      const manyPacks = makeMetrics({ totalPacks90d: 10, packsWithSales: 5 });
      const fewResult = calculateVendorHeatScores([fewPacks]);
      const manyResult = calculateVendorHeatScores([manyPacks]);
      // Same underlying metrics but few packs should be dampened
      expect(fewResult.get("test-vendor-1")!.score).toBeLessThan(
        manyResult.get("test-vendor-1")!.score,
      );
    });

    it("zero packs in 90d heavily dampens score", () => {
      const metrics = makeMetrics({ totalPacks90d: 0 });
      const result = calculateVendorHeatScores([metrics]);
      // With 0 packs, dampening factor is 0.1
      expect(result.get("test-vendor-1")!.score).toBeLessThanOrEqual(10);
    });
  });

  describe("scoreActiveAgentRatio cap", () => {
    it("caps at 15 even when sold > purchased", () => {
      // sold=6 > purchased=4 → ratio=1.5 → uncapped would be 22.5
      const metrics = makeMetrics({
        agentsPurchased30d: 4,
        agentsWithSales30d: 6,
        totalPacks90d: 10,
        packsWithSales: 8,
      });
      const result = calculateVendorHeatScores([metrics]);
      expect(
        result.get("test-vendor-1")!.breakdown.activeAgentRatio,
      ).toBeLessThanOrEqual(15);
    });

    it("returns 0 when no agents purchased", () => {
      const metrics = makeMetrics({
        agentsPurchased30d: 0,
        agentsWithSales30d: 0,
      });
      const result = calculateVendorHeatScores([metrics]);
      expect(result.get("test-vendor-1")!.breakdown.activeAgentRatio).toBe(0);
    });
  });

  describe("getHeatLevel", () => {
    it("classifies score >= 75 as hot", () => {
      expect(getHeatLevel(75)).toBe("hot");
      expect(getHeatLevel(100)).toBe("hot");
    });

    it("classifies score 55-74 as warming", () => {
      expect(getHeatLevel(55)).toBe("warming");
      expect(getHeatLevel(74)).toBe("warming");
    });

    it("classifies score 35-54 as neutral", () => {
      expect(getHeatLevel(35)).toBe("neutral");
      expect(getHeatLevel(54)).toBe("neutral");
    });

    it("classifies score 15-34 as cooling", () => {
      expect(getHeatLevel(15)).toBe("cooling");
      expect(getHeatLevel(34)).toBe("cooling");
    });

    it("classifies score < 15 as cold", () => {
      expect(getHeatLevel(14)).toBe("cold");
      expect(getHeatLevel(0)).toBe("cold");
    });
  });

  describe("getTrendDirection", () => {
    it("returns 'right' when no 90d sales", () => {
      expect(getTrendDirection(0, 0)).toBe("right");
    });

    it("returns 'up' when >50% of 90d sales in last 30d", () => {
      expect(getTrendDirection(10, 15)).toBe("up");
    });

    it("returns 'down' when <10% of 90d sales in last 30d", () => {
      expect(getTrendDirection(1, 20)).toBe("down");
    });

    it("returns 'right' for even distribution (~25-40%)", () => {
      expect(getTrendDirection(3, 10)).toBe("right");
    });
  });

  describe("component score boundaries", () => {
    it("time-to-first-sale: 7d = 25pts, 14d = 20pts, 90+d = 0pts", () => {
      const at7 = calculateVendorHeatScores([
        makeMetrics({ medianDaysToFirstSale: 7 }),
      ]);
      const at14 = calculateVendorHeatScores([
        makeMetrics({ medianDaysToFirstSale: 14 }),
      ]);
      const at91 = calculateVendorHeatScores([
        makeMetrics({ medianDaysToFirstSale: 91 }),
      ]);
      expect(at7.get("test-vendor-1")!.breakdown.timeToFirstSale).toBe(25);
      expect(at14.get("test-vendor-1")!.breakdown.timeToFirstSale).toBe(20);
      expect(at91.get("test-vendor-1")!.breakdown.timeToFirstSale).toBe(0);
    });

    it("recency: 7d = 15pts, 999d = 0pts", () => {
      const recent = calculateVendorHeatScores([
        makeMetrics({ daysSinceLastSale: 7 }),
      ]);
      const old = calculateVendorHeatScores([
        makeMetrics({ daysSinceLastSale: 999 }),
      ]);
      expect(recent.get("test-vendor-1")!.breakdown.recency).toBe(15);
      expect(old.get("test-vendor-1")!.breakdown.recency).toBe(0);
    });

    it("pack efficiency: >=3 = 15pts, 0 = 0pts", () => {
      const high = calculateVendorHeatScores([
        makeMetrics({ avgPoliciesPerPack: 3 }),
      ]);
      const zero = calculateVendorHeatScores([
        makeMetrics({ avgPoliciesPerPack: 0 }),
      ]);
      expect(high.get("test-vendor-1")!.breakdown.packEfficiency).toBe(15);
      expect(zero.get("test-vendor-1")!.breakdown.packEfficiency).toBe(0);
    });

    it("freshness: 60%+ ratio = 10pts, 0 sales = 0pts", () => {
      const fresh = calculateVendorHeatScores([
        makeMetrics({ salesLast30d: 8, salesLast90d: 10 }),
      ]);
      const noSales = calculateVendorHeatScores([
        makeMetrics({ salesLast30d: 0, salesLast90d: 0 }),
      ]);
      expect(fresh.get("test-vendor-1")!.breakdown.freshness).toBe(10);
      expect(noSales.get("test-vendor-1")!.breakdown.freshness).toBe(0);
    });
  });
});
