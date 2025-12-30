// src/services/expenses/expenseTemplateService.test.ts

import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  ExpenseTemplate,
  RecurringFrequency,
} from "@/types/expense.types";

// Mock the repository and supabase before importing the service
vi.mock("./ExpenseTemplateRepository", () => ({
  ExpenseTemplateRepository: vi.fn().mockImplementation(() => ({
    findAllRaw: vi.fn(),
    findByIdRaw: vi.fn(),
    createRaw: vi.fn(),
    updateRaw: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock("../base/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user-id" } },
      }),
    },
    from: vi.fn(),
  },
}));

// Import after mocking
import { ExpenseTemplateServiceClass } from "./expenseTemplateService";
import { ExpenseTemplateRepository } from "./ExpenseTemplateRepository";

describe("ExpenseTemplateService", () => {
  // Mock template data
  const createMockTemplate = (
    overrides: Partial<ExpenseTemplate> = {},
  ): ExpenseTemplate => ({
    id: "template-1",
    user_id: "user-1",
    template_name: "Test Template",
    description: null,
    amount: 100,
    category: "office",
    expense_type: "business",
    is_tax_deductible: false,
    recurring_frequency: null,
    notes: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getGroupedByFrequency", () => {
    it("should correctly group templates with no frequency", async () => {
      const mockRepository = new ExpenseTemplateRepository();
      const service = new ExpenseTemplateServiceClass(mockRepository);

      const templateNoFrequency = createMockTemplate({
        id: "1",
        template_name: "No Frequency Template",
        recurring_frequency: null,
      });

      vi.spyOn(mockRepository, "findAllRaw").mockResolvedValue([
        templateNoFrequency,
      ]);

      const result = await service.getGroupedByFrequency();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.["No Frequency"]).toHaveLength(1);
      expect(result.data?.["No Frequency"]?.[0].id).toBe("1");
    });

    it("should correctly map biweekly to Bi-Weekly", async () => {
      const mockRepository = new ExpenseTemplateRepository();
      const service = new ExpenseTemplateServiceClass(mockRepository);

      const templateBiweekly = createMockTemplate({
        id: "2",
        template_name: "Biweekly Template",
        recurring_frequency: "biweekly",
      });

      vi.spyOn(mockRepository, "findAllRaw").mockResolvedValue([
        templateBiweekly,
      ]);

      const result = await service.getGroupedByFrequency();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.["Bi-Weekly"]).toHaveLength(1);
      expect(result.data?.["Bi-Weekly"]?.[0].id).toBe("2");
      // Should NOT have "Biweekly" key (the old buggy behavior)
      expect(result.data?.["Biweekly"]).toBeUndefined();
    });

    it("should correctly map semiannually to Semi-Annually", async () => {
      const mockRepository = new ExpenseTemplateRepository();
      const service = new ExpenseTemplateServiceClass(mockRepository);

      const templateSemiannually = createMockTemplate({
        id: "3",
        template_name: "Semiannual Template",
        recurring_frequency: "semiannually",
      });

      vi.spyOn(mockRepository, "findAllRaw").mockResolvedValue([
        templateSemiannually,
      ]);

      const result = await service.getGroupedByFrequency();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.["Semi-Annually"]).toHaveLength(1);
      expect(result.data?.["Semi-Annually"]?.[0].id).toBe("3");
      // Should NOT have "Semiannually" key (the old buggy behavior)
      expect(result.data?.["Semiannually"]).toBeUndefined();
    });

    it("should correctly map all frequency types", async () => {
      const mockRepository = new ExpenseTemplateRepository();
      const service = new ExpenseTemplateServiceClass(mockRepository);

      const frequencies: Array<{
        db: RecurringFrequency;
        display: string;
      }> = [
        { db: "daily", display: "Daily" },
        { db: "weekly", display: "Weekly" },
        { db: "biweekly", display: "Bi-Weekly" },
        { db: "monthly", display: "Monthly" },
        { db: "quarterly", display: "Quarterly" },
        { db: "semiannually", display: "Semi-Annually" },
        { db: "annually", display: "Annually" },
      ];

      const templates = frequencies.map((f, i) =>
        createMockTemplate({
          id: `${i}`,
          template_name: `${f.display} Template`,
          recurring_frequency: f.db,
        }),
      );

      vi.spyOn(mockRepository, "findAllRaw").mockResolvedValue(templates);

      const result = await service.getGroupedByFrequency();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      for (const freq of frequencies) {
        expect(result.data?.[freq.display]).toBeDefined();
        expect(result.data?.[freq.display]).toHaveLength(1);
      }
    });

    it("should remove empty groups from result", async () => {
      const mockRepository = new ExpenseTemplateRepository();
      const service = new ExpenseTemplateServiceClass(mockRepository);

      const templateMonthly = createMockTemplate({
        id: "1",
        recurring_frequency: "monthly",
      });

      vi.spyOn(mockRepository, "findAllRaw").mockResolvedValue([
        templateMonthly,
      ]);

      const result = await service.getGroupedByFrequency();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Should only have Monthly group
      expect(Object.keys(result.data || {})).toEqual(["Monthly"]);
      // Should not have empty groups
      expect(result.data?.["No Frequency"]).toBeUndefined();
      expect(result.data?.["Daily"]).toBeUndefined();
      expect(result.data?.["Weekly"]).toBeUndefined();
    });

    it("should handle empty template list", async () => {
      const mockRepository = new ExpenseTemplateRepository();
      const service = new ExpenseTemplateServiceClass(mockRepository);

      vi.spyOn(mockRepository, "findAllRaw").mockResolvedValue([]);

      const result = await service.getGroupedByFrequency();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it("should handle repository errors", async () => {
      const mockRepository = new ExpenseTemplateRepository();
      const service = new ExpenseTemplateServiceClass(mockRepository);

      vi.spyOn(mockRepository, "findAllRaw").mockRejectedValue(
        new Error("Database error"),
      );

      const result = await service.getGroupedByFrequency();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe("Database error");
    });

    it("should group multiple templates by same frequency", async () => {
      const mockRepository = new ExpenseTemplateRepository();
      const service = new ExpenseTemplateServiceClass(mockRepository);

      const templates = [
        createMockTemplate({
          id: "1",
          template_name: "Monthly Rent",
          recurring_frequency: "monthly",
        }),
        createMockTemplate({
          id: "2",
          template_name: "Monthly Internet",
          recurring_frequency: "monthly",
        }),
        createMockTemplate({
          id: "3",
          template_name: "Monthly Phone",
          recurring_frequency: "monthly",
        }),
      ];

      vi.spyOn(mockRepository, "findAllRaw").mockResolvedValue(templates);

      const result = await service.getGroupedByFrequency();

      expect(result.success).toBe(true);
      expect(result.data?.["Monthly"]).toHaveLength(3);
    });
  });

  describe("inherited method overrides", () => {
    describe("createMany", () => {
      it("should return error response (not implemented)", async () => {
        const mockRepository = new ExpenseTemplateRepository();
        const service = new ExpenseTemplateServiceClass(mockRepository);

        const result = await service.createMany([]);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.message).toContain("not implemented");
      });
    });

    describe("getPaginated", () => {
      it("should return error response (not implemented)", async () => {
        const mockRepository = new ExpenseTemplateRepository();
        const service = new ExpenseTemplateServiceClass(mockRepository);

        const result = await service.getPaginated(1, 10);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.message).toContain("not implemented");
      });
    });

    describe("exists", () => {
      it("should return true when template exists", async () => {
        const mockRepository = new ExpenseTemplateRepository();
        const service = new ExpenseTemplateServiceClass(mockRepository);

        vi.spyOn(mockRepository, "findByIdRaw").mockResolvedValue(
          createMockTemplate({ id: "123" }),
        );

        const result = await service.exists("123");

        expect(result).toBe(true);
      });

      it("should return false when template does not exist", async () => {
        const mockRepository = new ExpenseTemplateRepository();
        const service = new ExpenseTemplateServiceClass(mockRepository);

        vi.spyOn(mockRepository, "findByIdRaw").mockResolvedValue(null);

        const result = await service.exists("nonexistent");

        expect(result).toBe(false);
      });

      it("should return false on error", async () => {
        const mockRepository = new ExpenseTemplateRepository();
        const service = new ExpenseTemplateServiceClass(mockRepository);

        vi.spyOn(mockRepository, "findByIdRaw").mockRejectedValue(
          new Error("Database error"),
        );

        const result = await service.exists("123");

        expect(result).toBe(false);
      });
    });

    describe("count", () => {
      it("should return count of templates", async () => {
        const mockRepository = new ExpenseTemplateRepository();
        const service = new ExpenseTemplateServiceClass(mockRepository);

        vi.spyOn(mockRepository, "findAllRaw").mockResolvedValue([
          createMockTemplate({ id: "1" }),
          createMockTemplate({ id: "2" }),
          createMockTemplate({ id: "3" }),
        ]);

        const result = await service.count();

        expect(result).toBe(3);
      });

      it("should return 0 when no templates exist", async () => {
        const mockRepository = new ExpenseTemplateRepository();
        const service = new ExpenseTemplateServiceClass(mockRepository);

        vi.spyOn(mockRepository, "findAllRaw").mockResolvedValue([]);

        const result = await service.count();

        expect(result).toBe(0);
      });

      it("should return 0 on error", async () => {
        const mockRepository = new ExpenseTemplateRepository();
        const service = new ExpenseTemplateServiceClass(mockRepository);

        vi.spyOn(mockRepository, "findAllRaw").mockRejectedValue(
          new Error("Database error"),
        );

        const result = await service.count();

        expect(result).toBe(0);
      });
    });
  });
});
