// src/services/workflows/__tests__/workflowService.test.ts
// Unit tests for WorkflowService and WorkflowRepository

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Supabase
vi.mock("../../base/supabase", () => {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  const mockAuth = {
    getUser: vi.fn(),
  };
  const mockFunctions = {
    invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
  };

  return {
    supabase: {
      from: mockFrom,
      rpc: mockRpc,
      auth: mockAuth,
      functions: mockFunctions,
    },
  };
});

vi.mock("../../base/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks are set up
import { WorkflowRepository } from "../WorkflowRepository";
import { workflowService } from "../workflowService";
import { supabase } from "../../base/supabase";

// ---------------------------------------------------------------------------
// Helper functions for mock setup
// ---------------------------------------------------------------------------

function createMockChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.is = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn();
  chain.maybeSingle = vi.fn();

  return chain;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockWorkflowRow = {
  id: "wf-1",
  name: "Test Workflow",
  description: "A test workflow",
  category: "general",
  trigger_type: "manual",
  status: "active",
  config: { trigger: { type: "manual" } },
  conditions: [],
  actions: [{ type: "send_email", order: 1, config: {} }],
  max_runs_per_day: 50,
  max_runs_per_recipient: null,
  cooldown_minutes: null,
  priority: 50,
  created_by: "user-123",
  last_modified_by: null,
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-01T00:00:00.000Z",
};

const mockWorkflowRunRow = {
  id: "run-1",
  workflow_id: "wf-1",
  trigger_source: "manual",
  status: "completed",
  started_at: "2025-01-01T00:00:00.000Z",
  completed_at: "2025-01-01T00:01:00.000Z",
  duration_ms: 60000,
  context: { triggeredBy: "user-123" },
  actions_executed: [],
  error: null,
};

const mockTemplateRow = {
  id: "tmpl-1",
  name: "Welcome Email Template",
  description: "Send a welcome email to new users",
  category: "onboarding",
  icon: "mail",
  workflow_config: {
    triggerType: "manual",
    actions: [{ type: "send_email", order: 1 }],
  },
  is_public: true,
  is_featured: false,
  created_by: "admin",
  usage_count: 10,
  created_at: "2025-01-01T00:00:00.000Z",
};

const mockEventTypeRow = {
  id: "evt-1",
  event_name: "user.created",
  category: "user",
  description: "Triggered when a new user is created",
  available_variables: { userId: "string", email: "string" },
  is_active: true,
  created_at: "2025-01-01T00:00:00.000Z",
};

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  user_metadata: { name: "Test User" },
};

// ---------------------------------------------------------------------------
// WorkflowRepository Tests
// ---------------------------------------------------------------------------

describe("WorkflowRepository", () => {
  let repository: WorkflowRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new WorkflowRepository();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("findWorkflows", () => {
    it("should return all workflows", async () => {
      const mockChain = createMockChain();
      mockChain.order.mockResolvedValue({
        data: [mockWorkflowRow],
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.findWorkflows();

      expect(supabase.from).toHaveBeenCalledWith("workflows");
      expect(result).toHaveLength(1);
      expect(result[0].triggerType).toBe("manual");
    });

    it("should filter by status when provided", async () => {
      const mockChain = createMockChain();
      // Order returns chain, then eq on that chain returns chain, then it resolves
      const orderResult = {
        ...mockChain,
        eq: vi.fn().mockResolvedValue({ data: [mockWorkflowRow], error: null }),
      };
      mockChain.order.mockReturnValue(orderResult);
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.findWorkflows("active");

      expect(orderResult.eq).toHaveBeenCalledWith("status", "active");
      expect(result).toHaveLength(1);
    });
  });

  describe("findByIdWithRelations", () => {
    it("should find workflow with relations", async () => {
      const mockChain = createMockChain();
      mockChain.single.mockResolvedValue({
        data: mockWorkflowRow,
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.findByIdWithRelations("wf-1");

      expect(mockChain.eq).toHaveBeenCalledWith("id", "wf-1");
      expect(result).toBeDefined();
      expect(result?.name).toBe("Test Workflow");
    });

    it("should return null when not found", async () => {
      const mockChain = createMockChain();
      mockChain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.findByIdWithRelations("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("createWorkflow", () => {
    it("should create a workflow", async () => {
      const mockChain = createMockChain();
      mockChain.single.mockResolvedValue({
        data: mockWorkflowRow,
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.createWorkflow({
        name: "Test Workflow",
        category: "general",
        trigger_type: "manual",
        status: "draft",
        config: {},
        conditions: [],
        actions: [],
        created_by: "user-123",
      });

      expect(supabase.from).toHaveBeenCalledWith("workflows");
      expect(mockChain.insert).toHaveBeenCalled();
      expect(result.triggerType).toBe("manual");
    });
  });

  describe("updateWorkflow", () => {
    it("should update a workflow", async () => {
      const mockChain = createMockChain();
      mockChain.single.mockResolvedValue({
        data: mockWorkflowRow,
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.updateWorkflow("wf-1", {
        name: "Updated Workflow",
      });

      expect(mockChain.update).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith("id", "wf-1");
      expect(result).toBeDefined();
    });
  });

  describe("deleteWorkflow", () => {
    it("should delete a workflow", async () => {
      const mockChain = createMockChain();
      mockChain.eq.mockResolvedValue({ error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      await repository.deleteWorkflow("wf-1");

      expect(mockChain.delete).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith("id", "wf-1");
    });
  });

  describe("findRuns", () => {
    it("should find workflow runs", async () => {
      const mockChain = createMockChain();
      mockChain.limit.mockResolvedValue({
        data: [mockWorkflowRunRow],
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.findRuns();

      expect(supabase.from).toHaveBeenCalledWith("workflow_runs");
      expect(result).toHaveLength(1);
      expect(result[0].workflowId).toBe("wf-1");
    });

    it("should filter by workflow ID", async () => {
      const mockChain = createMockChain();
      // order().limit() returns chain, then eq on that returns resolved value
      const limitResult = {
        ...mockChain,
        eq: vi.fn().mockResolvedValue({
          data: [mockWorkflowRunRow],
          error: null,
        }),
      };
      mockChain.limit.mockReturnValue(limitResult);
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.findRuns("wf-1", 10);

      expect(limitResult.eq).toHaveBeenCalledWith("workflow_id", "wf-1");
      expect(mockChain.limit).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(1);
    });
  });

  describe("createRun", () => {
    it("should create a workflow run", async () => {
      const mockChain = createMockChain();
      mockChain.single.mockResolvedValue({
        data: mockWorkflowRunRow,
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.createRun({
        workflow_id: "wf-1",
        trigger_source: "manual",
        status: "running",
        context: {},
      });

      expect(mockChain.insert).toHaveBeenCalled();
      expect(result.status).toBe("completed");
    });
  });

  describe("cancelRun", () => {
    it("should cancel a workflow run", async () => {
      const mockChain = createMockChain();
      mockChain.single.mockResolvedValue({
        data: { ...mockWorkflowRunRow, status: "cancelled" },
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.cancelRun("run-1");

      expect(mockChain.update).toHaveBeenCalled();
      expect(result.status).toBe("cancelled");
    });
  });

  describe("canWorkflowRun", () => {
    it("should check if workflow can run via RPC", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null,
      } as never);

      const result = await repository.canWorkflowRun("wf-1", "user-123");

      expect(supabase.rpc).toHaveBeenCalledWith("can_workflow_run", {
        p_workflow_id: "wf-1",
        p_recipient_id: "user-123",
      });
      expect(result).toBe(true);
    });

    it("should return true on RPC error", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { code: "500", message: "Error" },
      } as never);

      const result = await repository.canWorkflowRun("wf-1", "user-123");

      expect(result).toBe(true);
    });
  });

  describe("findTemplates", () => {
    it("should find workflow templates", async () => {
      const mockChain = createMockChain();
      mockChain.order.mockResolvedValue({
        data: [mockTemplateRow],
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.findTemplates();

      expect(supabase.from).toHaveBeenCalledWith("workflow_templates");
      expect(result).toHaveLength(1);
      expect(result[0].usageCount).toBe(10);
    });
  });

  describe("findAllEventTypes", () => {
    it("should find all event types", async () => {
      const mockChain = createMockChain();
      mockChain.order.mockResolvedValue({
        data: [mockEventTypeRow],
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.findAllEventTypes();

      expect(supabase.from).toHaveBeenCalledWith("trigger_event_types");
      expect(result).toHaveLength(1);
      expect(result[0].eventName).toBe("user.created");
    });
  });
});

// ---------------------------------------------------------------------------
// WorkflowService Tests
// ---------------------------------------------------------------------------

describe("WorkflowService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as never);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getWorkflows", () => {
    it("should get all workflows", async () => {
      const mockChain = createMockChain();
      mockChain.order.mockResolvedValue({
        data: [mockWorkflowRow],
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await workflowService.getWorkflows();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Test Workflow");
    });
  });

  describe("createWorkflow", () => {
    it("should create a workflow with form data", async () => {
      const mockChain = createMockChain();
      mockChain.single.mockResolvedValue({
        data: mockWorkflowRow,
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await workflowService.createWorkflow({
        name: "New Workflow",
        category: "general",
        triggerType: "manual",
        trigger: { type: "manual" },
        actions: [],
        settings: {
          maxRunsPerDay: 50,
          priority: 50,
        },
      });

      expect(result.name).toBe("Test Workflow");
      expect(mockChain.insert).toHaveBeenCalled();
    });

    it("should throw error when not authenticated", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      await expect(
        workflowService.createWorkflow({
          name: "Test",
          category: "general",
          triggerType: "manual",
          trigger: { type: "manual" },
          actions: [],
          settings: {},
        }),
      ).rejects.toThrow("User not authenticated");
    });
  });

  describe("updateWorkflow", () => {
    it("should update a workflow", async () => {
      const mockChain = createMockChain();
      mockChain.single.mockResolvedValue({
        data: mockWorkflowRow,
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await workflowService.updateWorkflow("wf-1", {
        name: "Updated Name",
      });

      expect(result).toBeDefined();
    });
  });

  describe("triggerWorkflow", () => {
    it("should trigger a workflow", async () => {
      const mockChain = createMockChain();
      // First call for findByIdWithRelations
      mockChain.single.mockResolvedValueOnce({
        data: mockWorkflowRow,
        error: null,
      });
      // Second call for createRun
      mockChain.single.mockResolvedValueOnce({
        data: mockWorkflowRunRow,
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null,
      } as never);
      // Mock functions.invoke to return a proper promise
      vi.mocked(supabase.functions.invoke).mockReturnValue(
        Promise.resolve({ data: {}, error: null }) as never,
      );

      const result = await workflowService.triggerWorkflow("wf-1");

      expect(result).toBeDefined();
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        "process-workflow",
        expect.any(Object),
      );
    });

    it("should throw error when workflow cannot run", async () => {
      const mockChain = createMockChain();
      mockChain.single.mockResolvedValue({
        data: mockWorkflowRow,
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: false,
        error: null,
      } as never);

      await expect(workflowService.triggerWorkflow("wf-1")).rejects.toThrow(
        "Workflow cannot run due to execution limits",
      );
    });
  });

  describe("getWorkflowStats", () => {
    it("should calculate workflow stats", async () => {
      const mockChain = createMockChain();
      mockChain.eq.mockResolvedValue({
        data: [
          { status: "completed", duration_ms: 1000, started_at: "2025-01-01" },
          { status: "completed", duration_ms: 2000, started_at: "2025-01-02" },
          { status: "failed", duration_ms: 500, started_at: "2025-01-03" },
        ],
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await workflowService.getWorkflowStats("wf-1");

      expect(result.totalRuns).toBe(3);
      expect(result.successfulRuns).toBe(2);
      expect(result.failedRuns).toBe(1);
      expect(result.averageDuration).toBeCloseTo(1166.67, 0);
    });
  });

  describe("createWorkflowFromTemplate", () => {
    it("should create workflow from template", async () => {
      // Need to track which table is being queried
      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const mockChain = createMockChain();
        callCount++;

        if (table === "workflow_templates") {
          if (callCount === 1) {
            // findTemplateById - select().eq().single()
            mockChain.single.mockResolvedValue({
              data: mockTemplateRow,
              error: null,
            });
          } else {
            // incrementTemplateUsage - update().eq()
            mockChain.eq.mockResolvedValue({ error: null });
          }
        } else if (table === "workflows") {
          // createWorkflow - insert().select().single()
          mockChain.single.mockResolvedValue({
            data: mockWorkflowRow,
            error: null,
          });
        }

        return mockChain as never;
      });

      const result = await workflowService.createWorkflowFromTemplate(
        "tmpl-1",
        "My New Workflow",
      );

      expect(result).toBeDefined();
    });

    it("should throw error when template not found", async () => {
      const mockChain = createMockChain();
      mockChain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      await expect(
        workflowService.createWorkflowFromTemplate("nonexistent", "Test"),
      ).rejects.toThrow("Template not found");
    });
  });

  describe("deleteWorkflow", () => {
    it("should delete a workflow", async () => {
      const mockChain = createMockChain();
      mockChain.eq.mockResolvedValue({ error: null });
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      await expect(
        workflowService.deleteWorkflow("wf-1"),
      ).resolves.not.toThrow();

      expect(mockChain.delete).toHaveBeenCalled();
    });
  });
});
