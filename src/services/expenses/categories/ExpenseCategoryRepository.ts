// src/services/expenses/categories/ExpenseCategoryRepository.ts
import { BaseRepository, BaseEntity } from "../../base/BaseRepository";
import type {
  ExpenseCategory,
  CreateExpenseCategoryData,
  UpdateExpenseCategoryData,
} from "@/types/expense.types";

type ExpenseCategoryBaseEntity = ExpenseCategory & BaseEntity;

/**
 * Repository for expense_categories data access
 * Extends BaseRepository for standard CRUD operations
 */
/**
 * Repository for user_expense_categories data access (user's custom categories only)
 * Note: Global categories are in global_expense_categories table (read-only)
 * Use get_all_expense_categories() RPC to get combined list
 */
export class ExpenseCategoryRepository extends BaseRepository<
  ExpenseCategoryBaseEntity,
  CreateExpenseCategoryData,
  UpdateExpenseCategoryData
> {
  constructor() {
    super("user_expense_categories");
  }

  /**
   * Transform database record to entity
   */
  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): ExpenseCategoryBaseEntity {
    return {
      id: dbRecord.id as string,
      user_id: dbRecord.user_id as string,
      name: dbRecord.name as string,
      description: (dbRecord.description as string) || null,
      is_active: (dbRecord.is_active as boolean) ?? true,
      sort_order: (dbRecord.sort_order as number) || 0,
      created_at: dbRecord.created_at
        ? new Date(dbRecord.created_at as string)
        : new Date(),
      updated_at: dbRecord.updated_at
        ? new Date(dbRecord.updated_at as string)
        : new Date(),
    } as ExpenseCategoryBaseEntity;
  }

  /**
   * Transform entity to database record
   */
  protected transformToDB(
    data: CreateExpenseCategoryData | UpdateExpenseCategoryData,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if ("name" in data && data.name !== undefined) result.name = data.name;
    if ("description" in data && data.description !== undefined) {
      result.description = data.description || null;
    }
    if ("is_active" in data && data.is_active !== undefined) {
      result.is_active = data.is_active;
    }
    if ("sort_order" in data && data.sort_order !== undefined) {
      result.sort_order = data.sort_order;
    }

    return result;
  }

  /**
   * Override create to set defaults
   */
  async create(
    data: CreateExpenseCategoryData,
  ): Promise<ExpenseCategoryBaseEntity> {
    const createData = {
      ...data,
      is_active: data.is_active ?? true,
      sort_order: data.sort_order ?? 0,
    };

    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(this.transformToDB(createData))
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "create");
    }

    return this.transformFromDB(result);
  }

  /**
   * Find all active categories ordered by sort_order and name
   */
  async findActive(): Promise<ExpenseCategoryBaseEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      throw this.handleError(error, "findActive");
    }

    return data?.map((item) => this.transformFromDB(item)) || [];
  }

  /**
   * Find all categories including inactive
   */
  async findAll(): Promise<ExpenseCategoryBaseEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      throw this.handleError(error, "findAll");
    }

    return data?.map((item) => this.transformFromDB(item)) || [];
  }

  /**
   * Soft delete (set is_active to false)
   */
  async softDelete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      throw this.handleError(error, "softDelete");
    }
  }

  /**
   * Restore a soft-deleted category
   */
  async restore(id: string): Promise<ExpenseCategoryBaseEntity> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ is_active: true })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "restore");
    }

    return this.transformFromDB(data);
  }

  /**
   * Count active categories
   */
  async countActive(): Promise<number> {
    const { count, error } = await this.client
      .from(this.tableName)
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (error) {
      throw this.handleError(error, "countActive");
    }

    return count ?? 0;
  }

  /**
   * Update sort orders for multiple categories
   */
  async updateSortOrders(
    updates: Array<{ id: string; sort_order: number }>,
  ): Promise<void> {
    const updatePromises = updates.map(({ id, sort_order }) =>
      this.client.from(this.tableName).update({ sort_order }).eq("id", id),
    );

    const results = await Promise.all(updatePromises);

    const failedUpdate = results.find((result) => result.error);
    if (failedUpdate?.error) {
      throw this.handleError(failedUpdate.error, "updateSortOrders");
    }
  }
}
