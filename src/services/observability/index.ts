// src/services/observability/index.ts
// Centralized exports for monitoring and metrics

export { metricsService, MetricType } from './MetricsService';
export type { MetricPoint, HealthStatus } from './MetricsService';

export {
  performanceMonitor,
  measureAsync,
  measure,
  Measure,
  Timer,
  queryPerformance,
  generateTraceId,
  setTraceId,
  getCurrentTraceId,
  clearTraceId,
  withTraceId,
} from '../../utils/performance';

export type {
  PerformanceMetric,
  PerformanceStats,
} from '../../utils/performance';
