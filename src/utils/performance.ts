// src/utils/performance.ts
// Performance monitoring utilities for tracking query timing and metrics

import {logger} from '../services/base/logger';

/**
 * Performance metric data
 */
export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  traceId?: string;
}

/**
 * Aggregated performance statistics
 */
export interface PerformanceStats {
  name: string;
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
}

/**
 * Performance monitoring service
 */
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 10000;
  private readonly slowThresholdMs = 1000;

  /**
   * Record a performance metric
   */
  record(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep metrics buffer size under control
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log slow operations
    if (metric.duration > this.slowThresholdMs) {
      logger.warn('Slow operation detected', {
        name: metric.name,
        duration: `${metric.duration}ms`,
        traceId: metric.traceId,
        metadata: metric.metadata,
      });
    }
  }

  /**
   * Get statistics for a specific operation
   */
  getStats(name: string): PerformanceStats | null {
    const filtered = this.metrics.filter(m => m.name === name);
    if (filtered.length === 0) return null;

    const durations = filtered.map(m => m.duration).sort((a, b) => a - b);
    const total = durations.reduce((sum, d) => sum + d, 0);

    return {
      name,
      count: filtered.length,
      totalDuration: total,
      avgDuration: total / filtered.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50Duration: this.percentile(durations, 0.5),
      p95Duration: this.percentile(durations, 0.95),
      p99Duration: this.percentile(durations, 0.99),
    };
  }

  /**
   * Get all statistics grouped by operation name
   */
  getAllStats(): PerformanceStats[] {
    const names = [...new Set(this.metrics.map(m => m.name))];
    return names
      .map(name => this.getStats(name))
      .filter(Boolean) as PerformanceStats[];
  }

  /**
   * Get recent slow operations
   */
  getSlowOperations(thresholdMs?: number): PerformanceMetric[] {
    const threshold = thresholdMs ?? this.slowThresholdMs;
    return this.metrics
      .filter(m => m.duration > threshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 100);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get summary report
   */
  getSummary(): {
    totalOperations: number;
    slowOperations: number;
    avgDuration: number;
    topSlowest: Array<{ name: string; avgDuration: number }>;
  } {
    const stats = this.getAllStats();
    const totalOps = this.metrics.length;
    const slowOps = this.metrics.filter(m => m.duration > this.slowThresholdMs).length;
    const avgDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalOps || 0;

    const topSlowest = stats
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10)
      .map(s => ({ name: s.name, avgDuration: s.avgDuration }));

    return {
      totalOperations: totalOps,
      slowOperations: slowOps,
      avgDuration,
      topSlowest,
    };
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Measure execution time of an async function
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const startTime = performance.now();
  const traceId = getCurrentTraceId();

  try {
    const result = await fn();
    const duration = performance.now() - startTime;

    performanceMonitor.record({
      name,
      duration,
      timestamp: new Date(),
      metadata,
      traceId,
    });

    logger.debug('Operation completed', {
      name,
      duration: `${duration.toFixed(2)}ms`,
      traceId,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    performanceMonitor.record({
      name: `${name}:error`,
      duration,
      timestamp: new Date(),
      metadata: { ...metadata, error: error instanceof Error ? error.message : String(error) },
      traceId,
    });

    throw error;
  }
}

/**
 * Measure execution time of a sync function
 */
export function measure<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, unknown>
): T {
  const startTime = performance.now();
  const traceId = getCurrentTraceId();

  try {
    const result = fn();
    const duration = performance.now() - startTime;

    performanceMonitor.record({
      name,
      duration,
      timestamp: new Date(),
      metadata,
      traceId,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    performanceMonitor.record({
      name: `${name}:error`,
      duration,
      timestamp: new Date(),
      metadata: { ...metadata, error: error instanceof Error ? error.message : String(error) },
      traceId,
    });

    throw error;
  }
}

/**
 * Decorator for measuring method performance
 */
export function Measure(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return measureAsync(metricName, () => originalMethod.apply(this, args), {
        class: target.constructor.name,
        method: propertyKey,
      });
    };

    return descriptor;
  };
}

/**
 * Timer for manual timing control
 */
export class Timer {
  private startTime: number;
  private endTime?: number;

  constructor(private name: string, private metadata?: Record<string, unknown>) {
    this.startTime = performance.now();
  }

  /**
   * Stop timer and record metric
   */
  stop(): number {
    this.endTime = performance.now();
    const duration = this.endTime - this.startTime;

    performanceMonitor.record({
      name: this.name,
      duration,
      timestamp: new Date(),
      metadata: this.metadata,
      traceId: getCurrentTraceId(),
    });

    return duration;
  }

  /**
   * Get elapsed time without stopping
   */
  elapsed(): number {
    return performance.now() - this.startTime;
  }
}

/**
 * Request tracing utilities
 */
let currentTraceId: string | undefined;

/**
 * Generate a unique trace ID
 */
export function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Set trace ID for current execution context
 */
export function setTraceId(traceId: string): void {
  currentTraceId = traceId;
}

/**
 * Get current trace ID
 */
export function getCurrentTraceId(): string | undefined {
  return currentTraceId;
}

/**
 * Clear trace ID
 */
export function clearTraceId(): void {
  currentTraceId = undefined;
}

/**
 * Execute function with trace ID
 */
export async function withTraceId<T>(
  traceId: string,
  fn: () => Promise<T>
): Promise<T> {
  const previousTraceId = currentTraceId;
  setTraceId(traceId);

  try {
    return await fn();
  } finally {
    if (previousTraceId) {
      setTraceId(previousTraceId);
    } else {
      clearTraceId();
    }
  }
}

/**
 * Database query performance tracking
 */
export const queryPerformance = {
  /**
   * Track query execution time
   */
  async trackQuery<T>(
    queryName: string,
    tableName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return measureAsync(`db:${tableName}.${queryName}`, fn, {
      table: tableName,
      query: queryName,
    });
  },

  /**
   * Get query statistics
   */
  getQueryStats(tableName?: string): PerformanceStats[] {
    const allStats = performanceMonitor.getAllStats();
    const dbStats = allStats.filter(s => s.name.startsWith('db:'));

    if (tableName) {
      return dbStats.filter(s => s.name.includes(`.${tableName}.`));
    }

    return dbStats;
  },

  /**
   * Get slow queries
   */
  getSlowQueries(thresholdMs = 500): PerformanceMetric[] {
    return performanceMonitor
      .getSlowOperations(thresholdMs)
      .filter(m => m.name.startsWith('db:'));
  },
};
