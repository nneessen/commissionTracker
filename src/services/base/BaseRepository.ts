// src/services/base/BaseRepository.ts
import { supabase } from './supabase';
import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';

export interface BaseEntity {
  id: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface FilterOptions {
  [key: string]: any;
}

export abstract class BaseRepository<T extends BaseEntity, CreateData = any, UpdateData = any> {
  protected client: SupabaseClient;
  protected tableName: string;

  constructor(tableName: string) {
    this.client = supabase;
    this.tableName = tableName;
  }

  /**
   * Create a new entity
   */
  async create(data: CreateData): Promise<T> {
    try {
      const dbData = this.transformToDB(data);

      const { data: result, error } = await this.client
        .from(this.tableName)
        .insert(dbData)
        .select()
        .single();

      if (error) {
        throw this.handleError(error, 'create');
      }

      return this.transformFromDB(result);
    } catch (error) {
      throw this.wrapError(error, 'create');
    }
  }

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw this.handleError(error, 'findById');
      }

      return data ? this.transformFromDB(data) : null;
    } catch (error) {
      throw this.wrapError(error, 'findById');
    }
  }

  /**
   * Find all entities with optional filters and pagination
   */
  async findAll(options?: QueryOptions, filters?: FilterOptions): Promise<T[]> {
    try {
      let query = this.client.from(this.tableName).select('*');

      // Apply filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      // Apply sorting
      if (options?.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.orderDirection === 'asc'
        });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw this.handleError(error, 'findAll');
      }

      return data?.map(item => this.transformFromDB(item)) || [];
    } catch (error) {
      throw this.wrapError(error, 'findAll');
    }
  }

  /**
   * Update an entity
   */
  async update(id: string, updates: UpdateData): Promise<T> {
    try {
      const dbData = this.transformToDB(updates, true);

      const { data, error } = await this.client
        .from(this.tableName)
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw this.handleError(error, 'update');
      }

      return this.transformFromDB(data);
    } catch (error) {
      throw this.wrapError(error, 'update');
    }
  }

  /**
   * Delete an entity
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw this.handleError(error, 'delete');
      }
    } catch (error) {
      throw this.wrapError(error, 'delete');
    }
  }

  /**
   * Count entities with optional filters
   */
  async count(filters?: FilterOptions): Promise<number> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      // Apply filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { count, error } = await query;

      if (error) {
        throw this.handleError(error, 'count');
      }

      return count || 0;
    } catch (error) {
      throw this.wrapError(error, 'count');
    }
  }

  /**
   * Check if an entity exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('id')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false; // Not found
        }
        throw this.handleError(error, 'exists');
      }

      return !!data;
    } catch (error) {
      throw this.wrapError(error, 'exists');
    }
  }

  /**
   * Batch create entities
   */
  async createMany(items: CreateData[]): Promise<T[]> {
    try {
      const dbData = items.map(item => this.transformToDB(item));

      const { data, error } = await this.client
        .from(this.tableName)
        .insert(dbData)
        .select();

      if (error) {
        throw this.handleError(error, 'createMany');
      }

      return data?.map(item => this.transformFromDB(item)) || [];
    } catch (error) {
      throw this.wrapError(error, 'createMany');
    }
  }

  /**
   * Handle PostgreSQL errors
   */
  protected handleError(error: PostgrestError, operation: string): Error {
    const message = `${this.tableName}.${operation} failed: ${error.message}`;
    console.error(message, error);

    // Create a more user-friendly error based on the error code
    if (error.code === '23505') {
      return new Error(`Duplicate entry found. Please use a unique value.`);
    }
    if (error.code === '23503') {
      return new Error(`Referenced record not found. Please check your data.`);
    }
    if (error.code === '23502') {
      return new Error(`Required field is missing. Please provide all required fields.`);
    }

    return new Error(message);
  }

  /**
   * Wrap any error with additional context
   */
  protected wrapError(error: unknown, operation: string): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error(`${this.tableName}.${operation} failed: ${String(error)}`);
  }

  /**
   * Transform database record to entity
   * Override in child classes for custom transformations
   */
  protected transformFromDB(dbRecord: any): T {
    return dbRecord as T;
  }

  /**
   * Transform entity to database record
   * Override in child classes for custom transformations
   */
  protected transformToDB(data: any, isUpdate = false): any {
    return data;
  }
}