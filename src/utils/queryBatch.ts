// src/utils/queryBatch.ts
// Utilities for batching database queries to reduce N+1 problems

import { supabase } from '../services/base/supabase';
import { logger } from '../services/base/logger';

/**
 * Batch load items by IDs from a table
 */
export async function batchLoadByIds<T>(
  tableName: string,
  ids: string[],
  options: {
    idColumn?: string;
    select?: string;
  } = {}
): Promise<Map<string, T>> {
  if (ids.length === 0) {
    return new Map();
  }

  const idColumn = options.idColumn ?? 'id';
  const select = options.select ?? '*';

  const { data, error } = await supabase
    .from(tableName)
    .select(select)
    .in(idColumn, ids);

  if (error) {
    logger.error(`Batch load failed for ${tableName}`, error);
    throw error;
  }

  // Create map for O(1) lookups
  const resultMap = new Map<string, T>();
  (data || []).forEach((item: any) => {
    resultMap.set(item[idColumn], item as T);
  });

  return resultMap;
}

/**
 * Batch load items with a foreign key
 */
export async function batchLoadByForeignKey<T>(
  tableName: string,
  foreignKeyColumn: string,
  foreignKeyValues: string[],
  options: {
    select?: string;
    orderBy?: { column: string; ascending?: boolean };
  } = {}
): Promise<Map<string, T[]>> {
  if (foreignKeyValues.length === 0) {
    return new Map();
  }

  const select = options.select ?? '*';

  let query = supabase
    .from(tableName)
    .select(select)
    .in(foreignKeyColumn, foreignKeyValues);

  if (options.orderBy) {
    query = query.order(options.orderBy.column, {
      ascending: options.orderBy.ascending ?? false,
    });
  }

  const { data, error } = await query;

  if (error) {
    logger.error(`Batch load by FK failed for ${tableName}`, error);
    throw error;
  }

  // Group by foreign key
  const resultMap = new Map<string, T[]>();
  (data || []).forEach((item: any) => {
    const key = item[foreignKeyColumn];
    if (!resultMap.has(key)) {
      resultMap.set(key, []);
    }
    resultMap.get(key)!.push(item as T);
  });

  return resultMap;
}

/**
 * Execute multiple queries in parallel
 */
export async function parallelQueries<T extends Record<string, any>>(
  queries: Record<keyof T, () => Promise<any>>
): Promise<T> {
  const keys = Object.keys(queries) as Array<keyof T>;
  const promises = keys.map(key => queries[key]());

  const results = await Promise.all(promises);

  const resultObj = {} as T;
  keys.forEach((key, index) => {
    resultObj[key] = results[index];
  });

  return resultObj;
}

/**
 * Batch update multiple records
 */
export async function batchUpdate<T>(
  tableName: string,
  updates: Array<{ id: string; data: Partial<T> }>,
  options: {
    chunkSize?: number;
  } = {}
): Promise<void> {
  const chunkSize = options.chunkSize ?? 50;

  // Split into chunks to avoid overwhelming the database
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);

    // Execute updates in parallel within chunk
    await Promise.all(
      chunk.map(({ id, data }) =>
        supabase
          .from(tableName)
          .update(data as any)
          .eq('id', id)
      )
    );
  }

  logger.debug('Batch update completed', {
    table: tableName,
    count: updates.length,
  });
}

/**
 * Batch insert multiple records
 */
export async function batchInsert<T>(
  tableName: string,
  records: T[],
  options: {
    chunkSize?: number;
    onConflict?: string;
  } = {}
): Promise<void> {
  if (records.length === 0) return;

  const chunkSize = options.chunkSize ?? 100;

  // Split into chunks
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);

    const { error } = await supabase.from(tableName).insert(chunk as any);

    if (error) {
      logger.error(`Batch insert failed for ${tableName}`, error);
      throw error;
    }
  }

  logger.debug('Batch insert completed', {
    table: tableName,
    count: records.length,
  });
}

/**
 * Optimize query with proper indexing hints
 */
export interface QueryOptimizations {
  useIndex?: string;
  limit?: number;
  offset?: number;
  distinctOn?: string;
}

/**
 * Build optimized query with common patterns
 */
export function buildOptimizedQuery(
  tableName: string,
  optimizations: QueryOptimizations = {}
) {
  let query = supabase.from(tableName).select('*');

  if (optimizations.limit) {
    query = query.limit(optimizations.limit);
  }

  if (optimizations.offset) {
    query = query.range(
      optimizations.offset,
      optimizations.offset + (optimizations.limit ?? 10) - 1
    );
  }

  return query;
}

/**
 * Aggregate multiple queries into a single compound query
 */
export async function compoundQuery<T>(
  queries: Array<{
    table: string;
    select: string;
    filters?: Record<string, any>;
  }>
): Promise<T[]> {
  // Execute all queries in parallel
  const results = await Promise.all(
    queries.map(({ table, select, filters }) => {
      let query = supabase.from(table).select(select);

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      return query;
    })
  );

  // Combine results
  const combined: any[] = [];
  results.forEach(({ data }) => {
    if (data) {
      combined.push(...data);
    }
  });

  return combined as T[];
}
