// src/utils/cache.ts
// In-memory caching layer for database query results

import { logger } from '../services/base/logger';

export interface CacheOptions {
  ttlMs?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  onEvict?: (key: string, value: any) => void;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Simple in-memory cache with TTL and size limits
 */
export class Cache<T = any> {
  private store = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly maxSize: number;
  private readonly onEvict?: (key: string, value: T) => void;
  private hits = 0;
  private misses = 0;

  constructor(options: CacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000; // Default 5 minutes
    this.maxSize = options.maxSize ?? 1000; // Default 1000 entries
    this.onEvict = options.onEvict;
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hits++;

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttlMs?: number): void {
    // Enforce size limit
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evictLRU();
    }

    const expiresAt = Date.now() + (ttlMs ?? this.ttlMs);

    this.store.set(key, {
      value,
      expiresAt,
      accessCount: 0,
      lastAccessed: Date.now(),
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    const entry = this.store.get(key);
    if (entry && this.onEvict) {
      this.onEvict(key, entry.value);
    }
    return this.store.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    if (this.onEvict) {
      for (const [key, entry] of this.store) {
        this.onEvict(key, entry.value);
      }
    }
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0,
      maxSize: this.maxSize,
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.store) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.store.get(oldestKey);
      if (entry && this.onEvict) {
        this.onEvict(oldestKey, entry.value);
      }
      this.store.delete(oldestKey);
    }
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        if (this.onEvict) {
          this.onEvict(key, entry.value);
        }
        this.store.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

/**
 * Memoize async function with caching
 */
export function memoize<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    keyGenerator?: (...args: Parameters<T>) => string;
    ttlMs?: number;
    cache?: Cache<Awaited<ReturnType<T>>>;
  } = {}
): T {
  const cache = options.cache ?? new Cache<Awaited<ReturnType<T>>>({
    ttlMs: options.ttlMs,
  });

  const keyGenerator = options.keyGenerator ?? ((...args: any[]) => JSON.stringify(args));

  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);

    // Check cache first
    const cached = cache.get(key);
    if (cached !== undefined) {
      logger.debug('Cache hit', { function: fn.name, key });
      return cached;
    }

    // Execute function and cache result
    logger.debug('Cache miss', { function: fn.name, key });
    const result = await fn(...args);
    cache.set(key, result);

    return result;
  }) as T;
}

/**
 * Batch multiple requests into a single query
 */
export class DataLoader<K, V> {
  private queue: Array<{
    key: K;
    resolve: (value: V) => void;
    reject: (error: Error) => void;
  }> = [];
  private cache = new Map<K, Promise<V>>();
  private batchScheduled = false;

  constructor(
    private batchFn: (keys: K[]) => Promise<V[]>,
    private options: {
      maxBatchSize?: number;
      batchWindowMs?: number;
      cacheKeyFn?: (key: K) => string;
    } = {}
  ) {}

  /**
   * Load a single value by key
   */
  load(key: K): Promise<V> {
    const cacheKey = this.options.cacheKeyFn?.(key) ?? String(key);

    // Check cache
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    // Create promise and add to queue
    const promise = new Promise<V>((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      // Schedule batch if not already scheduled
      if (!this.batchScheduled) {
        this.batchScheduled = true;
        this.scheduleBatch();
      }
    });

    this.cache.set(key, promise);
    return promise;
  }

  /**
   * Load multiple values by keys
   */
  loadMany(keys: K[]): Promise<V[]> {
    return Promise.all(keys.map(key => this.load(key)));
  }

  /**
   * Clear cache for specific key
   */
  clear(key: K): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Schedule batch execution
   */
  private scheduleBatch(): void {
    const batchWindowMs = this.options.batchWindowMs ?? 10;

    setTimeout(() => {
      this.executeBatch();
    }, batchWindowMs);
  }

  /**
   * Execute batched requests
   */
  private async executeBatch(): Promise<void> {
    this.batchScheduled = false;

    const batch = this.queue.splice(0, this.options.maxBatchSize ?? 100);
    if (batch.length === 0) return;

    try {
      const keys = batch.map(item => item.key);
      const results = await this.batchFn(keys);

      // Resolve each promise with its result
      batch.forEach((item, index) => {
        const result = results[index];
        if (result !== undefined) {
          item.resolve(result);
        } else {
          item.reject(new Error(`No result for key: ${item.key}`));
        }
      });
    } catch (error) {
      // Reject all promises in batch
      batch.forEach(item => {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      });
    }

    // If there are more items in queue, schedule another batch
    if (this.queue.length > 0) {
      this.batchScheduled = true;
      this.scheduleBatch();
    }
  }
}

/**
 * Global cache instances for common use cases
 */
export const caches = {
  commissions: new Cache({ ttlMs: 5 * 60 * 1000, maxSize: 500 }), // 5 min
  policies: new Cache({ ttlMs: 10 * 60 * 1000, maxSize: 500 }), // 10 min
  carriers: new Cache({ ttlMs: 30 * 60 * 1000, maxSize: 100 }), // 30 min
  users: new Cache({ ttlMs: 15 * 60 * 1000, maxSize: 200 }), // 15 min
  compGuide: new Cache({ ttlMs: 60 * 60 * 1000, maxSize: 1000 }), // 1 hour
};

/**
 * Helper to invalidate related caches
 */
export function invalidateCaches(patterns: string[]): void {
  patterns.forEach(pattern => {
    const cache = (caches as any)[pattern];
    if (cache instanceof Cache) {
      cache.clear();
      logger.debug('Cache cleared', { pattern });
    }
  });
}
