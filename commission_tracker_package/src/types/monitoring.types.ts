// src/types/monitoring.types.ts
// Types for monitoring, metrics, and health checks

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version?: string;
  checks: {
    database: HealthCheck;
    cache: HealthCheck;
    performance: HealthCheck;
  };
}

/**
 * Individual health check
 */
export interface HealthCheck {
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  timestamp: string;
  metrics?: Record<string, number | string>;
}

/**
 * Performance dashboard data
 */
export interface PerformanceDashboard {
  summary: {
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
  };
  queries: {
    slowQueries: Array<{
      name: string;
      avgDuration: number;
      count: number;
      p95: number;
    }>;
    topQueries: Array<{
      name: string;
      count: number;
      totalDuration: number;
    }>;
  };
  cache: {
    hitRates: Record<string, number>;
    sizes: Record<string, number>;
  };
  errors: {
    recentErrors: Array<{
      message: string;
      timestamp: string;
      count: number;
    }>;
    errorsByType: Record<string, number>;
  };
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  name: string;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
}

/**
 * Alert instance
 */
export interface Alert {
  id: string;
  config: AlertConfig;
  triggered: boolean;
  triggeredAt?: Date;
  currentValue: number;
  message: string;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enabled: boolean;
  slowQueryThresholdMs: number;
  errorRateThresholdPerMin: number;
  cacheHitRateThreshold: number;
  alerts: AlertConfig[];
}
