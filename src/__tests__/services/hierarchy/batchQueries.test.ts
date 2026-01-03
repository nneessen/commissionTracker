// src/__tests__/services/hierarchy/batchQueries.test.ts
// Unit tests for batch query methods used in the N+1 fix

import { describe, it, expect, vi, beforeEach, Mock } from "vitest";

// Mock Supabase before imports
vi.mock("../../../services/base/supabase", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
  TABLES: {
    OVERRIDE_COMMISSIONS: "override_commissions",
    POLICIES: "policies",
    USER_PROFILES: "user_profiles",
  },
}));

import { supabase } from "../../../services/base/supabase";

// Create a mock query builder that chains methods
function createMockQueryBuilder(
  data: unknown[] = [],
  error: Error | null = null,
) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve({ data, error })),
  };
  // Make the builder thenable for async/await
  Object.defineProperty(builder, "then", {
    value: (
      resolve: (value: { data: unknown[]; error: Error | null }) => void,
    ) => Promise.resolve({ data, error }).then(resolve),
  });
  return builder;
}

describe("OverrideRepository.findByOverrideAndBaseAgentInRange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array for empty baseAgentIds", async () => {
    const { OverrideRepository } =
      await import("../../../services/overrides/OverrideRepository");
    const repo = new OverrideRepository();

    const result = await repo.findByOverrideAndBaseAgentInRange(
      "viewer-123",
      [],
      "2024-01-01",
    );

    expect(result).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("should handle single baseAgentId (backward compatible)", async () => {
    const mockData = [
      { base_agent_id: "agent-1", override_commission_amount: 100 },
    ];
    const mockBuilder = createMockQueryBuilder(mockData);
    (supabase.from as Mock).mockReturnValue(mockBuilder);

    const { OverrideRepository } =
      await import("../../../services/overrides/OverrideRepository");
    const repo = new OverrideRepository();

    const result = await repo.findByOverrideAndBaseAgentInRange(
      "viewer-123",
      "agent-1", // Single string, not array
      "2024-01-01",
    );

    expect(result).toEqual(mockData);
    expect(mockBuilder.in).toHaveBeenCalledWith("base_agent_id", ["agent-1"]);
  });

  it("should handle array of baseAgentIds (batch mode)", async () => {
    const mockData = [
      { base_agent_id: "agent-1", override_commission_amount: 100 },
      { base_agent_id: "agent-2", override_commission_amount: 200 },
      { base_agent_id: "agent-1", override_commission_amount: 50 },
    ];
    const mockBuilder = createMockQueryBuilder(mockData);
    (supabase.from as Mock).mockReturnValue(mockBuilder);

    const { OverrideRepository } =
      await import("../../../services/overrides/OverrideRepository");
    const repo = new OverrideRepository();

    const result = await repo.findByOverrideAndBaseAgentInRange(
      "viewer-123",
      ["agent-1", "agent-2", "agent-3"],
      "2024-01-01",
    );

    expect(result).toEqual(mockData);
    expect(mockBuilder.in).toHaveBeenCalledWith("base_agent_id", [
      "agent-1",
      "agent-2",
      "agent-3",
    ]);
  });

  it("should filter by override_agent_id and date range", async () => {
    const mockBuilder = createMockQueryBuilder([]);
    (supabase.from as Mock).mockReturnValue(mockBuilder);

    const { OverrideRepository } =
      await import("../../../services/overrides/OverrideRepository");
    const repo = new OverrideRepository();

    await repo.findByOverrideAndBaseAgentInRange(
      "viewer-123",
      ["agent-1"],
      "2024-01-01",
    );

    expect(mockBuilder.eq).toHaveBeenCalledWith(
      "override_agent_id",
      "viewer-123",
    );
    expect(mockBuilder.gte).toHaveBeenCalledWith("created_at", "2024-01-01");
    expect(mockBuilder.in).toHaveBeenCalledWith("status", ["earned", "paid"]);
  });
});

describe("HierarchyService.getViewerOverridesFromAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return { mtd: 0 } for single ID with empty results", async () => {
    const mockBuilder = createMockQueryBuilder([]);
    (supabase.from as Mock).mockReturnValue(mockBuilder);

    const { HierarchyService } =
      await import("../../../services/hierarchy/hierarchyService");
    const service = new HierarchyService();

    const result = await service.getViewerOverridesFromAgent(
      "viewer-123",
      "agent-1",
    );

    expect(result).toEqual({ mtd: 0 });
  });

  it("should return Map for array input", async () => {
    const mockData = [
      { base_agent_id: "agent-1", override_commission_amount: 100 },
      { base_agent_id: "agent-2", override_commission_amount: 200 },
      { base_agent_id: "agent-1", override_commission_amount: 50 },
    ];
    const mockBuilder = createMockQueryBuilder(mockData);
    (supabase.from as Mock).mockReturnValue(mockBuilder);

    const { HierarchyService } =
      await import("../../../services/hierarchy/hierarchyService");
    const service = new HierarchyService();

    const result = await service.getViewerOverridesFromAgent("viewer-123", [
      "agent-1",
      "agent-2",
    ]);

    expect(result).toBeInstanceOf(Map);
    const map = result as Map<string, number>;
    expect(map.get("agent-1")).toBe(150); // 100 + 50
    expect(map.get("agent-2")).toBe(200);
  });

  it("should return empty Map for empty array input", async () => {
    const { HierarchyService } =
      await import("../../../services/hierarchy/hierarchyService");
    const service = new HierarchyService();

    const result = await service.getViewerOverridesFromAgent("viewer-123", []);

    expect(result).toBeInstanceOf(Map);
    expect((result as Map<string, number>).size).toBe(0);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("should aggregate multiple overrides per agent correctly", async () => {
    const mockData = [
      { base_agent_id: "agent-1", override_commission_amount: "100.50" },
      { base_agent_id: "agent-1", override_commission_amount: "200.25" },
      { base_agent_id: "agent-1", override_commission_amount: "50.00" },
    ];
    const mockBuilder = createMockQueryBuilder(mockData);
    (supabase.from as Mock).mockReturnValue(mockBuilder);

    const { HierarchyService } =
      await import("../../../services/hierarchy/hierarchyService");
    const service = new HierarchyService();

    const result = await service.getViewerOverridesFromAgent("viewer-123", [
      "agent-1",
    ]);

    const map = result as Map<string, number>;
    expect(map.get("agent-1")).toBeCloseTo(350.75, 2);
  });

  it("should handle null/undefined override amounts gracefully", async () => {
    const mockData = [
      { base_agent_id: "agent-1", override_commission_amount: null },
      { base_agent_id: "agent-1", override_commission_amount: undefined },
      { base_agent_id: "agent-1", override_commission_amount: "100" },
    ];
    const mockBuilder = createMockQueryBuilder(mockData);
    (supabase.from as Mock).mockReturnValue(mockBuilder);

    const { HierarchyService } =
      await import("../../../services/hierarchy/hierarchyService");
    const service = new HierarchyService();

    const result = await service.getViewerOverridesFromAgent("viewer-123", [
      "agent-1",
    ]);

    const map = result as Map<string, number>;
    expect(map.get("agent-1")).toBe(100); // null and undefined treated as 0
  });
});

describe("PolicyRepository.findMetricsByUserIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array for empty userIds", async () => {
    const { PolicyRepository } =
      await import("../../../services/policies/PolicyRepository");
    const repo = new PolicyRepository();

    const result = await repo.findMetricsByUserIds([]);

    expect(result).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("should fetch policies for multiple users in single query", async () => {
    const mockData = [
      {
        user_id: "user-1",
        status: "active",
        annual_premium: 1000,
        created_at: "2024-01-15",
      },
      {
        user_id: "user-2",
        status: "active",
        annual_premium: 2000,
        created_at: "2024-01-20",
      },
      {
        user_id: "user-1",
        status: "pending",
        annual_premium: 500,
        created_at: "2024-01-25",
      },
    ];
    const mockBuilder = createMockQueryBuilder(mockData);
    (supabase.from as Mock).mockReturnValue(mockBuilder);

    const { PolicyRepository } =
      await import("../../../services/policies/PolicyRepository");
    const repo = new PolicyRepository();

    const result = await repo.findMetricsByUserIds(["user-1", "user-2"]);

    expect(result).toEqual(mockData);
    expect(mockBuilder.select).toHaveBeenCalledWith(
      "user_id, status, annual_premium, created_at",
    );
    expect(mockBuilder.in).toHaveBeenCalledWith("user_id", [
      "user-1",
      "user-2",
    ]);
  });

  it("should include created_at for date filtering", async () => {
    const mockData = [
      {
        user_id: "user-1",
        status: "active",
        annual_premium: 1000,
        created_at: "2024-01-15T10:00:00Z",
      },
    ];
    const mockBuilder = createMockQueryBuilder(mockData);
    (supabase.from as Mock).mockReturnValue(mockBuilder);

    const { PolicyRepository } =
      await import("../../../services/policies/PolicyRepository");
    const repo = new PolicyRepository();

    const result = await repo.findMetricsByUserIds(["user-1"]);

    expect(result[0]).toHaveProperty("created_at");
    expect(result[0].created_at).toBe("2024-01-15T10:00:00Z");
  });
});
