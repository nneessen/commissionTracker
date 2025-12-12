// src/services/observability/MetricsService.ts
// Metrics collection and aggregation service

import {logger} from '../base/logger';
import {performanceMonitor} from '../../utils/performance';
import {QueryClient} from '@tanstack/react-query';

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

/**
 * Metric data point
 */
export interface MetricPoint {
  name: string;
  type: MetricType;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

/**
 * Application health status
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  metrics: {
    cache: {
      size: number;
      stale: number;
      fetching: number;
    };
    performance: {
      avgResponseTime: number;
      slowOperations: number;
      totalOperations: number;
    };
    errors: {
      count: number;
      rate: number;
    };
  };
}

/**
 * Metrics collection service
 */
class MetricsService {
  private metrics: MetricPoint[] = [];
  private readonly maxMetrics = 10000;
  private startTime = Date.now();
  private errorCount = 0;
  private readonly errorWindow = 60000; // 1 minute
  private recentErrors: Date[] = [];
  private queryClient?: QueryClient;

  /**
   * Set the QueryClient instance for cache metrics
   */
  setQueryClient(client: QueryClient): void {
    this.queryClient = client;
  }

  /**
   * Record a counter metric (monotonically increasing)
   */
  incrementCounter(name: string, value = 1, tags?: Record<string, string>): void {
    this.record({
      name,
      type: MetricType.COUNTER,
      value,
      timestamp: new Date(),
      tags,
    });
  }

  /**
   * Record a gauge metric (point-in-time value)
   */
  recordGauge(name: string, value: number, tags?: Record<string, string>): void {
    this.record({
      name,
      type: MetricType.GAUGE,
      value,
      timestamp: new Date(),
      tags,
    });
  }

  /**
   * Record a histogram value (distribution)
   */
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
    this.record({
      name,
      type: MetricType.HISTOGRAM,
      value,
      timestamp: new Date(),
      tags,
    });
  }

  /**
   * Record an error
   */
  recordError(error: Error, _context?: Record<string, unknown>): void {
    this.errorCount++;
    this.recentErrors.push(new Date());

    // Clean old errors
    const cutoff = Date.now() - this.errorWindow;
    this.recentErrors = this.recentErrors.filter(d => d.getTime() > cutoff);

    logger.error('Error recorded in metrics', error instanceof Error ? error : new Error(String(error)));

    this.incrementCounter('errors.total', 1, {
      type: error.name,
      message: error.message.substring(0, 100),
    });
  }

  /**
   * Get health status
   */
  getHealthStatus(): HealthStatus {
    const perfSummary = performanceMonitor.getSummary();
    const errorRate = this.recentErrors.length / (this.errorWindow / 1000); // errors per second

    // Get cache stats from TanStack Query
    const queryCache = this.queryClient?.getQueryCache();
    const queries = queryCache?.getAll() || [];

    const cacheStats = {
      size: queries.length,
      stale: queries.filter(q => q.isStale()).length,
      fetching: queries.filter(q => q.state.fetchStatus === 'fetching').length,
    };

    // Determine overall health
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (errorRate > 1 || perfSummary.slowOperations > 10) {
      status = 'degraded';
    }
    if (errorRate > 5 || perfSummary.slowOperations > 50) {
      status = 'unhealthy';
    }

    return {
      status,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      metrics: {
        cache: cacheStats,
        performance: {
          avgResponseTime: perfSummary.avgDuration,
          slowOperations: perfSummary.slowOperations,
          totalOperations: perfSummary.totalOperations,
        },
        errors: {
          count: this.errorCount,
          rate: errorRate,
        },
      },
    };
  }

  /**
   * Get all metrics
   */
  getMetrics(options?: {
    name?: string;
    type?: MetricType;
    since?: Date;
    limit?: number;
  }): MetricPoint[] {
    let filtered = this.metrics;

    if (options?.name) {
      filtered = filtered.filter(m => m.name === options.name);
    }

    if (options?.type) {
      filtered = filtered.filter(m => m.type === options.type);
    }

    if (options?.since) {
      filtered = filtered.filter(m => m.timestamp >= options.since!);
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(name: string, windowMs = 60000): {
    sum: number;
    avg: number;
    min: number;
    max: number;
    count: number;
  } {
    const cutoff = new Date(Date.now() - windowMs);
    const filtered = this.metrics.filter(
      m => m.name === name && m.timestamp >= cutoff
    );

    if (filtered.length === 0) {
      return { sum: 0, avg: 0, min: 0, max: 0, count: 0 };
    }

    const values = filtered.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      sum,
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.errorCount = 0;
    this.recentErrors = [];
  }

  /**
   * Record a metric
   */
  private record(metric: MetricPoint): void {
    this.metrics.push(metric);

    // Keep buffer size under control
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    logger.debug('Metric recorded', {
      name: metric.name,
      type: metric.type,
      value: metric.value,
      tags: metric.tags,
    });
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];
    const metricsByName = new Map<string, MetricPoint[]>();

    // Group by name
    this.metrics.forEach(m => {
      if (!metricsByName.has(m.name)) {
        metricsByName.set(m.name, []);
      }
      metricsByName.get(m.name)!.push(m);
    });

    // Format each metric
    metricsByName.forEach((points, name) => {
      const type = points[0].type;
      const metricName = name.replace(/[^a-zA-Z0-9_]/g, '_');

      lines.push(`# TYPE ${metricName} ${type}`);

      points.forEach(point => {
        const tags = point.tags
          ? Object.entries(point.tags)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',')
          : '';

        const labelStr = tags ? `{${tags}}` : '';
        lines.push(`${metricName}${labelStr} ${point.value} ${point.timestamp.getTime()}`);
      });

      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Get metrics summary for dashboard
   */
  getDashboardSummary(): {
    health: HealthStatus;
    topMetrics: Array<{ name: string; value: number; trend: 'up' | 'down' | 'stable' }>;
    recentAlerts: Array<{ severity: 'warning' | 'critical'; message: string; timestamp: Date }>;
  } {
    const health = this.getHealthStatus();
    const alerts: Array<{ severity: 'warning' | 'critical'; message: string; timestamp: Date }> = [];

    // Generate alerts based on metrics
    if (health.metrics.errors.rate > 1) {
      alerts.push({
        severity: health.metrics.errors.rate > 5 ? 'critical' : 'warning',
        message: `High error rate: ${health.metrics.errors.rate.toFixed(2)}/sec`,
        timestamp: new Date(),
      });
    }

    if (health.metrics.performance.slowOperations > 10) {
      alerts.push({
        severity: health.metrics.performance.slowOperations > 50 ? 'critical' : 'warning',
        message: `${health.metrics.performance.slowOperations} slow operations detected`,
        timestamp: new Date(),
      });
    }

    // Top metrics (most recent values)
    const topMetrics = [
      { name: 'Cached Queries', value: health.metrics.cache.size, trend: 'stable' as const },
      { name: 'Avg Response Time', value: health.metrics.performance.avgResponseTime, trend: 'stable' as const },
      { name: 'Error Rate', value: health.metrics.errors.rate, trend: 'stable' as const },
    ];

    return { health, topMetrics, recentAlerts: alerts };
  }
}

/**
 * Global metrics service instance
 */
export const metricsService = new MetricsService();
