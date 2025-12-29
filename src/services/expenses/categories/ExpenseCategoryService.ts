// src/services/expenses/categories/ExpenseCategoryService.ts
import { BaseService, type ServiceResponse } from "../../base/BaseService";
import { ExpenseCategoryRepository } from "./ExpenseCategoryRepository";
import type {
  ExpenseCategory,
  CreateExpenseCategoryData,
  UpdateExpenseCategoryData,
  DEFAULT_EXPENSE_CATEGORIES,
} from "@/types/expense.types";

/**
 * Service for expense category business logic
 * Extends BaseService for standard CRUD operations
 */
export class ExpenseCategoryService extends BaseService<
  ExpenseCategory,
  CreateExpenseCategoryData,
  UpdateExpenseCategoryData
> {
  // Override repository type for type-safe access to custom methods
  declare protected repository: ExpenseCategoryRepository;

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
        validate: (value) => {
          if (typeof value !== "string") return false;
          const trimmed = value.trim();
          // Remove control characters and check length
          // eslint-disable-next-line no-control-regex
          const sanitized = trimmed.replace(/[\x00-\x1F\x7F]/g, "");
          return sanitized.length > 0 && sanitized.length <= 100;
        },
        message:
          "Category name is required, must be 100 characters or less, and cannot contain control characters",
      },
      {
        field: "description",
        validate: (value) => {
          if (value === undefined || value === null) return true; // Optional
          if (typeof value !== "string") return false;
          // Use trim().length for consistency with name validation
          const trimmed = (value as string).trim();
          // Remove control characters
          // eslint-disable-next-line no-control-regex
          const sanitized = trimmed.replace(/[\x00-\x1F\x7F]/g, "");
          return sanitized.length <= 500;
        },
        message:
          "Description must be 500 characters or less and cannot contain control characters",
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
          // Add reasonable upper bound to prevent integer overflow
          return num >= 0 && num < 10000;
        },
        message: "sort_order must be a non-negative integer between 0 and 9999",
      },
    ];
  }

  /**
   * Helper method to normalize errors
   */
  private normalizeError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }

  /**
   * Override getAll to return only active categories
   * Ordered by sort_order and name
   */
  async getAll(): Promise<ServiceResponse<ExpenseCategory[]>> {
    try {
      const categories = await this.repository.findActive();
      return { success: true, data: categories };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  /**
   * Override create to handle unique constraint errors
   * FIX: Check ServiceResponse.success instead of try-catch
   */
  async create(
    data: CreateExpenseCategoryData,
  ): Promise<ServiceResponse<ExpenseCategory>> {
    // Call parent create (which returns ServiceResponse)
    const result = await super.create(data);

    // If creation failed, check if it's a unique constraint violation
    if (!result.success && result.error) {
      const message = result.error.message;
      if (message.includes("23505") || message.includes("unique")) {
        return {
          success: false,
          error: new Error("A category with this name already exists"),
        };
      }
    }

    return result;
  }

  /**
   * Override update to handle unique constraint errors
   * FIX: Check ServiceResponse.success instead of try-catch
   */
  async update(
    id: string,
    data: UpdateExpenseCategoryData,
  ): Promise<ServiceResponse<ExpenseCategory>> {
    // Call parent update (which returns ServiceResponse)
    const result = await super.update(id, data);

    // If update failed, check if it's a unique constraint violation
    if (!result.success && result.error) {
      const message = result.error.message;
      if (message.includes("23505") || message.includes("unique")) {
        return {
          success: false,
          error: new Error("A category with this name already exists"),
        };
      }
    }

    return result;
  }

  /**
   * Override delete to use soft delete (set is_active to false)
   */
  async delete(id: string): Promise<ServiceResponse<void>> {
    try {
      await this.repository.softDelete(id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
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
  async getAllIncludingInactive(): Promise<ServiceResponse<ExpenseCategory[]>> {
    try {
      const categories = await this.repository.findAll();
      return { success: true, data: categories };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  /**
   * Hard delete a category (permanent)
   * Use with caution - this cannot be undone
   */
  async hardDelete(id: string): Promise<ServiceResponse<void>> {
    try {
      await this.repository.delete(id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  /**
   * Restore a soft-deleted category
   */
  async restore(id: string): Promise<ServiceResponse<ExpenseCategory>> {
    try {
      const category = await this.repository.restore(id);
      return { success: true, data: category };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  /**
   * Check if user has any active categories
   */
  async hasActiveCategories(): Promise<ServiceResponse<boolean>> {
    try {
      const count = await this.repository.countActive();
      return { success: true, data: count > 0 };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  /**
   * Reorder categories by updating sort_order
   * @param categoryIds - Array of category IDs in desired order
   */
  async reorder(categoryIds: string[]): Promise<ServiceResponse<void>> {
    try {
      const updates = categoryIds.map((id, index) => ({
        id,
        sort_order: index,
      }));
      await this.repository.updateSortOrders(updates);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  /**
   * Initialize default categories for a new user
   * Only creates defaults if user has no existing categories
   * FIX: Use createMany for better performance and atomicity
   */
  async initializeDefaults(
    defaults: typeof DEFAULT_EXPENSE_CATEGORIES,
  ): Promise<ServiceResponse<void>> {
    try {
      // Check if user already has categories
      const hasResult = await this.hasActiveCategories();
      if (hasResult.success && hasResult.data) {
        // User already has categories, skip initialization
        return { success: true };
      }

      // Prepare all category data
      const categoryData: CreateExpenseCategoryData[] = defaults.map(
        (category, index) => ({
          name: category.name,
          description: category.description,
          is_active: true,
          sort_order: index,
        }),
      );

      // Use createMany for batch creation (more efficient)
      const result = await this.createMany(categoryData);

      // Return success even if some categories failed (e.g., duplicates)
      // The important thing is that the user has some defaults
      return result.success
        ? { success: true }
        : {
            success: false,
            error: new Error(
              "Failed to initialize default categories: " +
                (result.error?.message || "Unknown error"),
            ),
          };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }
}

// Singleton instance
const expenseCategoryRepository = new ExpenseCategoryRepository();
export const expenseCategoryService = new ExpenseCategoryService(
  expenseCategoryRepository,
);

// Export class for testing
export { ExpenseCategoryService as ExpenseCategoryServiceClass };
