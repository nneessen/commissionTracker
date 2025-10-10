// src/types/database.ts
/**
 * Database transformation types for type-safe DB operations
 */

/**
 * Generic constraint for database records
 * All database records must have an id and timestamps
 */
export interface DbRecord {
  id: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

/**
 * Generic constraint for application domain models
 * All domain models must have an id and timestamps
 */
export interface DomainModel {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: unknown;
}

/**
 * Sort configuration for queries
 */
export interface SortConfig<T = unknown> {
  field: keyof T | string;
  direction: 'asc' | 'desc';
}

/**
 * Filter configuration for queries
 */
export interface FilterConfig {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in';
  value: string | number | boolean | string[] | number[];
}

/**
 * Query options for database operations
 */
export interface QueryOptions<T = unknown> {
  filters?: FilterConfig[];
  sort?: SortConfig<T>;
  limit?: number;
  offset?: number;
}

/**
 * Validation rule type
 */
export interface ValidationRule {
  field: string;
  message: string;
  validate: (value: unknown, data?: Record<string, unknown>) => boolean;
}

/**
 * Generic type for database transformation functions
 */
export type TransformFromDB<TDb extends DbRecord, TDomain extends DomainModel> = (
  dbRecord: TDb
) => TDomain;

export type TransformToDB<TDomain extends DomainModel, TDb extends DbRecord> = (
  data: Partial<TDomain>,
  isUpdate?: boolean
) => Partial<TDb>;
