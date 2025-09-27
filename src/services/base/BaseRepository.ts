// src/services/base/BaseRepository.ts
import { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../supabase";

export interface BaseEntity {
  id: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
}

export interface FilterOptions {
  [key: string]: any;
}

export abstract class BaseRepository<
  T extends BaseEntity,
  TCreate = Omit<T, "id" | "created_at" | "updated_at">,
  TUpdate = Partial<TCreate>,
> {
  protected readonly client: SupabaseClient;
  protected readonly tableName: string;

  constructor(tableName: string) {
    this.client = supabase;
    this.tableName = tableName;
  }

  async findAll(options?: QueryOptions): Promise<T[]> {
    try {
      let query = this.client.from(this.tableName).select("*");

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 10) - 1,
        );
      }

      if (options?.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.ascending ?? false,
        });
      }

      const { data, error } = await query;

      if (error) {
        throw this.handleError(error, "findAll");
      }

      return data?.map(this.transformFromDB) || [];
    } catch (error) {
      throw this.wrapError(error, "findAll");
    }
  }

  async findById(id: string): Promise<T | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        throw this.handleError(error, "findById");
      }

      return data ? this.transformFromDB(data) : null;
    } catch (error) {
      throw this.wrapError(error, "findById");
    }
  }

  async findByFilters(
    filters: FilterOptions,
    options?: QueryOptions,
  ): Promise<T[]> {
    try {
      let query = this.client.from(this.tableName).select("*");

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      // Apply options
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.ascending ?? false,
        });
      }

      const { data, error } = await query;

      if (error) {
        throw this.handleError(error, "findByFilters");
      }

      return data?.map(this.transformFromDB) || [];
    } catch (error) {
      throw this.wrapError(error, "findByFilters");
    }
  }

  async create(data: TCreate): Promise<T> {
    try {
      const dbData = this.transformToDB(data);

      const { data: result, error } = await this.client
        .from(this.tableName)
        .insert([dbData])
        .select()
        .single();

      if (error) {
        throw this.handleError(error, "create");
      }

      return this.transformFromDB(result);
    } catch (error) {
      throw this.wrapError(error, "create");
    }
  }

  async update(id: string, data: TUpdate): Promise<T> {
    try {
      const dbData = this.transformToDB(data, true);

      const { data: result, error } = await this.client
        .from(this.tableName)
        .update(dbData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw this.handleError(error, "update");
      }

      return this.transformFromDB(result);
    } catch (error) {
      throw this.wrapError(error, "update");
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq("id", id);

      if (error) {
        throw this.handleError(error, "delete");
      }
    } catch (error) {
      throw this.wrapError(error, "delete");
    }
  }

  async count(filters?: FilterOptions): Promise<number> {
    try {
      let query = this.client
        .from(this.tableName)
        .select("*", { count: "exact", head: true });

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { count, error } = await query;

      if (error) {
        throw this.handleError(error, "count");
      }

      return count || 0;
    } catch (error) {
      throw this.wrapError(error, "count");
    }
  }

  protected abstract transformFromDB(dbRecord: any): T;
  protected abstract transformToDB(data: any, isUpdate?: boolean): any;

  protected handleError(error: PostgrestError, operation: string): Error {
    const message = `Database ${operation} failed: ${error.message}`;
    return new Error(message);
  }

  protected wrapError(error: any, operation: string): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error(`Unexpected error in ${operation}: ${String(error)}`);
  }
}

