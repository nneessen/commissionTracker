// src/types/reports.types.ts

export type ReportType =
  | 'executive-dashboard'
  | 'commission-performance'
  | 'policy-performance'
  | 'client-relationship'
  | 'financial-health'
  | 'predictive-analytics';

export type InsightSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type InsightCategory =
  | 'revenue'
  | 'expense'
  | 'retention'
  | 'chargeback'
  | 'opportunity'
  | 'risk'
  | 'performance';

export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  carrierIds?: string[];
  productIds?: string[];
  states?: string[];
  clientIds?: string[];
}

export interface ActionableInsight {
  id: string;
  severity: InsightSeverity;
  category: InsightCategory;
  title: string;
  description: string;
  impact: string; // Quantified impact (e.g., "$5,000 at risk", "3 clients affected")
  recommendedActions: string[];
  priority: number; // 1-10
  affectedEntities?: {
    policies?: string[];
    clients?: string[];
    commissions?: string[];
  };
}

export interface ReportMetric {
  label: string;
  value: string | number;
  change?: number; // Percentage change from previous period
  trend?: 'up' | 'down' | 'neutral';
  target?: number;
  actual?: number;
  format?: 'currency' | 'percent' | 'number' | 'text';
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

export interface ReportSection {
  id: string;
  title: string;
  description?: string;
  metrics?: ReportMetric[];
  insights?: ActionableInsight[];
  chartData?: ChartData;
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
  };
}

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  subtitle: string;
  generatedAt: Date;
  filters: ReportFilters;
  summary: {
    healthScore: number; // 0-100
    keyMetrics: ReportMetric[];
    topInsights: ActionableInsight[];
  };
  sections: ReportSection[];
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeSections?: string[]; // Section IDs to include (default: all)
  includeCharts?: boolean;
  includeSummary?: boolean;
  includeInsights?: boolean;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  defaultFilters?: Partial<ReportFilters>;
  sections: string[]; // Section IDs to include
}
