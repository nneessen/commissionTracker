// src/services/expenses/categories/ExpenseCategoryService.ts
import { BaseService, type ServiceResponse } from "../../base/BaseService";
import { ExpenseCategoryRepository } from "./ExpenseCategoryRepository";
import type {
  ExpenseCategory,
  CreateExpenseCategoryData,
  UpdateExpenseCategoryData,
} from "@/types/expense.types";

type ExpenseCategoryEntity = ExpenseCategory;

/**
 * Service for expense category business logic
 * Extends BaseService for standard CRUD operations
 */
export class ExpenseCategoryService extends BaseService<
  ExpenseCategoryEntity,
  CreateExpenseCategoryData,
  UpdateExpenseCategoryData
> {
  constructor(repository: ExpenseCategoryRepository) {
    super(repository);
  }

  /**
   * Initialize validation rules
   */
  protected initializeValidationRules(): void {
    this.validationRules = [
      {
        field: "name",
        validate: (value) =>
          typeof value === "string" && value.trim().length > 0,
        message: "Category name is required",
      },
      {
        field: "name",
        validate: (value) => {
          if (typeof value !== "string") return true; // Handled by previous rule
          return value.trim().length <= 100;
        },
        message: "Category name must be 100 characters or less",
      },
      {
        field: "description",
        validate: (value) => {
          if (value === undefined || value === null) return true; // Optional
          if (typeof value !== "string") return false;
          return value.length <= 500;
        },
        message: "Description must be 500 characters or less",
      },
      {
        field: "is_active",
        validate: (value) => {
          if (value === undefined || value === null) return true; // Optional
          return typeof value === "boolean";
        },
        message: "is_active must be a boolean value",
      },
      {
        field: "sort_order",
        validate: (value) => {
          if (value === undefined || value === null) return true; // Optional
          const num = Number(value);
          if (isNaN(num)) return false;
          if (!Number.isInteger(num)) return false;
          return num >= 0;
        },
        message: "sort_order must be a non-negative integer",
      },
    ];
  }

  /**
   * Override getAll to return only active categories
   * Ordered by sort_order and name
   */
  async getAll(): Promise<ServiceResponse<ExpenseCategoryEntity[]>> {
    try {
      const repo = this.repository as ExpenseCategoryRepository;
      const categories = await repo.findActive();
      return { success: true, data: categories as ExpenseCategoryEntity[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Override create to handle unique constraint errors
   */
  async create(
    data: CreateExpenseCategoryData,
  ): Promise<ServiceResponse<ExpenseCategoryEntity>> {
    try {
      return await super.create(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("23505") || message.includes("unique")) {
        return {
          success: false,
          error: new Error("A category with this name already exists"),
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error : new Error(message),
      };
    }
  }

  /**
   * Override update to handle unique constraint errors
   */
  async update(
    id: string,
    data: UpdateExpenseCategoryData,
  ): Promise<ServiceResponse<ExpenseCategoryEntity>> {
    try {
      return await super.update(id, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("23505") || message.includes("unique")) {
        return {
          success: false,
          error: new Error("A category with this name already exists"),
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error : new Error(message),
      };
    }
  }

  /**
   * Override delete to use soft delete (set is_active to false)
   */
  async delete(id: string): Promise<ServiceResponse<void>> {
    try {
      const repo = this.repository as ExpenseCategoryRepository;
      await repo.softDelete(id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  // ============================================================================
  // BUSINESS LOGIC METHODS
  // ============================================================================

  /**
   * Get all categories including inactive
   * Ordered by sort_order and name
   */
  async getAllIncludingInactive(): Promise<
    ServiceResponse<ExpenseCategoryEntity[]>
  > {
    try {
      const repo = this.repository as ExpenseCategoryRepository;
      const categories = await repo.findAll();
      return { success: true, data: categories as ExpenseCategoryEntity[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Hard delete a category (permanent)
   * Use with caution - this cannot be undone
   */
  async hardDelete(id: string): Promise<ServiceResponse<void>> {
    try {
      const repo = this.repository as ExpenseCategoryRepository;
      await repo.delete(id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Restore a soft-deleted category
   */
  async restore(id: string): Promise<ServiceResponse<ExpenseCategoryEntity>> {
    try {
      const repo = this.repository as ExpenseCategoryRepository;
      const category = await repo.restore(id);
      return { success: true, data: category as ExpenseCategoryEntity };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Check if user has any active categories
   */
  async hasCategories(): Promise<ServiceResponse<boolean>> {
    try {
      const repo = this.repository as ExpenseCategoryRepository;
      const count = await repo.countActive();
      return { success: true, data: count > 0 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Reorder categories by updating sort_order
   * @param categoryIds - Array of category IDs in desired order
   */
  async reorder(categoryIds: string[]): Promise<ServiceResponse<void>> {
    try {
      const repo = this.repository as ExpenseCategoryRepository;
      const updates = categoryIds.map((id, index) => ({
        id,
        sort_order: index,
      }));
      await repo.updateSortOrders(updates);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Initialize default categories for a new user
   * Only creates defaults if user has no existing categories
   */
  async initializeDefaults(): Promise<ServiceResponse<void>> {
    try {
      const hasResult = await this.hasCategories();
      if (hasResult.success && hasResult.data) {
        // User already has categories
        return { success: true };
      }

      // Import the default categories constant
      const { DEFAULT_EXPENSE_CATEGORIES } =
        await import("@/types/expense.types");

      // Create all default categories
      const createPromises = DEFAULT_EXPENSE_CATEGORIES.map((category, index) =>
        this.create({
          name: category.name,
          description: category.description,
          is_active: true,
          sort_order: index,
        }),
      );

      await Promise.allSettled(createPromises);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  // ============================================================================
  // INHERITED FROM BaseService (no code needed):
  // ============================================================================
  // - getById(id: string): Promise<ServiceResponse<ExpenseCategoryEntity>>
  // - createMany(items: CreateExpenseCategoryData[]): Promise<ServiceResponse<ExpenseCategoryEntity[]>>
  // - getPaginated(page, pageSize, filters?, orderBy?, orderDirection?): Promise<ServiceResponse<ListResponse<ExpenseCategoryEntity>>>
  // - exists(id: string): Promise<boolean>
  // - count(filters?): Promise<number>
}

// Singleton instance
const expenseCategoryRepository = new ExpenseCategoryRepository();
export const expenseCategoryService = new ExpenseCategoryService(
  expenseCategoryRepository,
);

// Export class for testing
export { ExpenseCategoryService as ExpenseCategoryServiceClass };
