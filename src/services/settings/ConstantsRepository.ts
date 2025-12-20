// src/services/settings/ConstantsRepository.ts

import { BaseRepository } from "../base/BaseRepository";
import type { Tables, TablesUpdate } from "../../types/database.types";

// Database types
type ConstantsRow = Tables<"constants">;
type ConstantsUpdate = TablesUpdate<"constants">;

// Entity type (key-value pairs)
interface ConstantEntity {
  id: string;
  key: string;
  value: number;
  category: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * ConstantsRepository
 *
 * Data access layer for the constants table.
 * Constants are stored as key-value pairs.
 */
export class ConstantsRepository extends BaseRepository<
  ConstantEntity,
  Partial<ConstantEntity>,
  Partial<ConstantEntity>
> {
  constructor() {
    super("constants");
  }

  /**
   * Transform database record to entity
   */
  protected transformFromDB(dbRecord: Record<string, unknown>): ConstantEntity {
    const row = dbRecord as unknown as ConstantsRow;
    return {
      id: row.id,
      key: row.key,
      value: row.value,
      category: row.category,
      description: row.description,
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || "",
    };
  }

  /**
   * Transform entity to database record
   */
  protected transformToDB(
    data: Partial<ConstantEntity>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (data.key !== undefined) result.key = data.key;
    if (data.value !== undefined) result.value = data.value;
    if (data.category !== undefined) result.category = data.category;
    if (data.description !== undefined) result.description = data.description;

    return result;
  }

  // ---------------------------------------------------------------------------
  // CUSTOM READ OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Find a constant by its key
   */
  async findByKey(key: string): Promise<ConstantEntity | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("key", key)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw this.handleError(error, "findByKey");
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Get all constants as key-value pairs
   */
  async getAllAsKeyValue(): Promise<Record<string, number>> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("key, value");

    if (error) {
      throw this.handleError(error, "getAllAsKeyValue");
    }

    const result: Record<string, number> = {};
    if (data) {
      for (const row of data) {
        result[row.key] = row.value;
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // CUSTOM WRITE OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Update a constant by its key
   */
  async updateByKey(key: string, value: number): Promise<void> {
    const updateData: ConstantsUpdate = {
      value,
      updated_at: new Date().toISOString(),
    };

    const { error } = await this.client
      .from(this.tableName)
      .update(updateData)
      .eq("key", key);

    if (error) {
      throw this.handleError(error, "updateByKey");
    }
  }

  /**
   * Upsert a constant by key
   */
  async upsertByKey(
    key: string,
    value: number,
    options?: { category?: string; description?: string },
  ): Promise<ConstantEntity> {
    const { data, error } = await this.client
      .from(this.tableName)
      .upsert(
        {
          key,
          value,
          category: options?.category ?? null,
          description: options?.description ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      )
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "upsertByKey");
    }

    return this.transformFromDB(data);
  }

  /**
   * Update multiple constants at once
   */
  async updateMultiple(
    updates: Array<{ key: string; value: number }>,
  ): Promise<void> {
    const promises = updates.map(({ key, value }) =>
      this.updateByKey(key, value),
    );

    await Promise.all(promises);
  }
}

// Singleton instance
export const constantsRepository = new ConstantsRepository();
