// src/services/expenses/expenseCategoryService.ts

import { supabase } from "../base/supabase";
import type {
  ExpenseCategory,
  CreateExpenseCategoryData,
  UpdateExpenseCategoryData,
} from "../../types/expense.types";

class ExpenseCategoryService {
  private readonly TABLE_NAME = "expense_categories";

  /**
   * Get all active categories for the current user
   */
  async getAll(): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch expense categories: ${error.message}`);
    }

    return (data || []) as ExpenseCategory[];
  }

  /**
   * Get all categories including inactive ones
   */
  async getAllIncludingInactive(): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      throw new Error(
        `Failed to fetch all expense categories: ${error.message}`,
      );
    }

    return (data || []) as ExpenseCategory[];
  }

  /**
   * Get a single category by ID
   */
  async getById(id: string): Promise<ExpenseCategory> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch category: ${error.message}`);
    }

    if (!data) {
      throw new Error("Category not found");
    }

    return data as ExpenseCategory;
  }

  /**
   * Create a new category
   */
  async create(
    categoryData: CreateExpenseCategoryData,
  ): Promise<ExpenseCategory> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .insert({
        ...categoryData,
        is_active: categoryData.is_active ?? true,
        sort_order: categoryData.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("A category with this name already exists");
      }
      throw new Error(`Failed to create category: ${error.message}`);
    }

    return data as ExpenseCategory;
  }

  /**
   * Update an existing category
   */
  async update(
    id: string,
    updates: UpdateExpenseCategoryData,
  ): Promise<ExpenseCategory> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("A category with this name already exists");
      }
      throw new Error(`Failed to update category: ${error.message}`);
    }

    return data as ExpenseCategory;
  }

  /**
   * Delete a category (soft delete by setting is_active to false)
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.TABLE_NAME)
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }

  /**
   * Hard delete a category (permanent delete)
   */
  async hardDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.TABLE_NAME)
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(
        `Failed to permanently delete category: ${error.message}`,
      );
    }
  }

  /**
   * Initialize default categories for a new user
   */
  async initializeDefaultCategories(): Promise<void> {
    const existingCategories = await this.getAll();

    if (existingCategories.length > 0) {
      // User already has categories
      return;
    }

    // Import the default categories constant
    const { DEFAULT_EXPENSE_CATEGORIES } =
      await import("../../types/expense.types");

    // Create all default categories
    const createPromises = DEFAULT_EXPENSE_CATEGORIES.map((category, index) =>
      this.create({
        name: category.name,
        description: category.description,
        is_active: true,
        sort_order: index,
      }),
    );

    try {
      await Promise.all(createPromises);
    } catch (error) {
      // Some categories might already exist, which is fine
      console.warn("Some default categories could not be created:", error);
    }
  }

  /**
   * Check if user has any categories
   */
  async hasCategories(): Promise<boolean> {
    const { count, error } = await supabase
      .from(this.TABLE_NAME)
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (error) {
      throw new Error(`Failed to check categories: ${error.message}`);
    }

    return (count ?? 0) > 0;
  }

  /**
   * Reorder categories
   */
  async reorderCategories(categoryIds: string[]): Promise<void> {
    const updates = categoryIds.map((id, index) => ({
      id,
      sort_order: index,
    }));

    // Update each category's sort order
    const updatePromises = updates.map(({ id, sort_order }) =>
      supabase.from(this.TABLE_NAME).update({ sort_order }).eq("id", id),
    );

    const results = await Promise.all(updatePromises);

    const failedUpdate = results.find((result) => result.error);
    if (failedUpdate?.error) {
      throw new Error(
        `Failed to reorder categories: ${failedUpdate.error.message}`,
      );
    }
  }

  /**
   * Restore a soft-deleted category
   */
  async restore(id: string): Promise<ExpenseCategory> {
    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .update({ is_active: true })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to restore category: ${error.message}`);
    }

    return data as ExpenseCategory;
  }
}

export const expenseCategoryService = new ExpenseCategoryService();

// Export the old functional API for backward compatibility if needed
export { expenseCategoryService as default };

// Legacy functional exports (for gradual migration)
export const getExpenseCategories = () => expenseCategoryService.getAll();
export const getAllExpenseCategories = () =>
  expenseCategoryService.getAllIncludingInactive();
export const createExpenseCategory = (data: CreateExpenseCategoryData) =>
  expenseCategoryService.create(data);
export const updateExpenseCategory = (
  id: string,
  data: UpdateExpenseCategoryData,
) => expenseCategoryService.update(id, data);
export const deleteExpenseCategory = (id: string) =>
  expenseCategoryService.delete(id);
export const reorderExpenseCategories = (ids: string[]) =>
  expenseCategoryService.reorderCategories(ids);
