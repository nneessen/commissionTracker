// src/services/expenses/categories/ExpenseCategoryService.ts
import { ServiceResponse } from "../../base/BaseService";
import { ExpenseCategoryRepository } from "./ExpenseCategoryRepository";
import type {
  ExpenseCategory,
  CreateExpenseCategoryData,
  UpdateExpenseCategoryData,
} from "@/types/expense.types";

/**
 * Service for expense category business logic
 * Uses ExpenseCategoryRepository for data access
 */
class ExpenseCategoryServiceClass {
  private repository: ExpenseCategoryRepository;

  constructor() {
    this.repository = new ExpenseCategoryRepository();
  }

  /**
   * Get all active categories
   */
  async getAll(): Promise<ServiceResponse<ExpenseCategory[]>> {
    try {
      const categories = await this.repository.findActive();
      return { success: true, data: categories as ExpenseCategory[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get all categories including inactive
   */
  async getAllIncludingInactive(): Promise<ServiceResponse<ExpenseCategory[]>> {
    try {
      const categories = await this.repository.findAll();
      return { success: true, data: categories as ExpenseCategory[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get category by ID
   */
  async getById(id: string): Promise<ServiceResponse<ExpenseCategory>> {
    try {
      const category = await this.repository.findById(id);
      if (!category) {
        return { success: false, error: new Error("Category not found") };
      }
      return { success: true, data: category as ExpenseCategory };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Create a new category
   */
  async create(
    data: CreateExpenseCategoryData,
  ): Promise<ServiceResponse<ExpenseCategory>> {
    try {
      const category = await this.repository.create(data);
      return { success: true, data: category as ExpenseCategory };
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
   * Update a category
   */
  async update(
    id: string,
    data: UpdateExpenseCategoryData,
  ): Promise<ServiceResponse<ExpenseCategory>> {
    try {
      const category = await this.repository.update(id, data);
      return { success: true, data: category as ExpenseCategory };
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
   * Soft delete a category (set is_active to false)
   */
  async delete(id: string): Promise<ServiceResponse<void>> {
    try {
      await this.repository.softDelete(id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Hard delete a category (permanent)
   */
  async hardDelete(id: string): Promise<ServiceResponse<void>> {
    try {
      await this.repository.delete(id);
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
  async restore(id: string): Promise<ServiceResponse<ExpenseCategory>> {
    try {
      const category = await this.repository.restore(id);
      return { success: true, data: category as ExpenseCategory };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Check if user has any categories
   */
  async hasCategories(): Promise<ServiceResponse<boolean>> {
    try {
      const count = await this.repository.countActive();
      return { success: true, data: count > 0 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Reorder categories
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
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Initialize default categories for a new user
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
}

export const expenseCategoryService = new ExpenseCategoryServiceClass();
export { ExpenseCategoryServiceClass };
