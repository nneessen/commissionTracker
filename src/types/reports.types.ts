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
  description?: string; // Optional explanation of the metric
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

// ============================================================================
// PHASE 3: Multi-Report Bundle Export Types
// ============================================================================

export type BundleTemplateId =
  | 'weekly-check-in'
  | 'monthly-comprehensive'
  | 'quarterly-strategic'
  | 'performance-review'
  | 'custom';

export interface ReportBundleTemplate {
  id: BundleTemplateId;
  name: string;
  description: string;
  reportTypes: ReportType[];
  icon: string;
}

export interface BundleCoverPage {
  title: string;
  subtitle?: string;
  businessName?: string;
  preparedFor?: string;
  confidential?: boolean;
  logoUrl?: string;
}

export interface BundleExportOptions {
  format: 'pdf' | 'excel';
  reportTypes: ReportType[];
  filters: ReportFilters;
  coverPage?: BundleCoverPage;
  includeTableOfContents?: boolean;
  includeInsights?: boolean;
  includeSummary?: boolean;
}

export interface GeneratedBundle {
  id: string;
  templateId: BundleTemplateId;
  generatedAt: Date;
  filters: ReportFilters;
  reports: Report[];
  format: 'pdf' | 'excel';
}

// ============================================================================
// PHASE 4: Interactive Features - Drill-Down Types
// ============================================================================

export type DrillDownType =
  | 'commission-aging-bucket'  // Click aging bucket (0-3mo, 3-6mo, etc.)
  | 'client-tier'              // Click tier (A, B, C, D)
  | 'carrier'                  // Click carrier row
  | 'product'                  // Click product row
  | 'commission'               // Click specific commission
  | 'policy';                  // Click specific policy

export interface DrillDownContext {
  type: DrillDownType;
  title: string;
  subtitle?: string;
  // Identifiers for fetching data
  agingBucket?: string;        // '0-3 months', '3-6 months', etc.
  clientTier?: 'A' | 'B' | 'C' | 'D';
  carrierId?: string;
  carrierName?: string;
  productId?: string;
  productName?: string;
  commissionId?: string;
  policyId?: string;
  // Applied filters (inherit from report)
  filters: ReportFilters;
}

export interface DrillDownSummary {
  totalRecords: number;
  totalAmount: number;
  avgAmount?: number;
  additionalMetrics?: Record<string, string | number>;
}

export interface DrillDownRecord {
  id: string;
  type: 'commission' | 'policy' | 'client';
  // Common fields
  date: string;
  amount: number;
  status: string;
  // Entity-specific fields
  policyNumber?: string;
  clientName?: string;
  carrierName?: string;
  productName?: string;
  monthsPaid?: number;
  annualPremium?: number;
  tier?: string;
}

export interface DrillDownData {
  summary: DrillDownSummary;
  records: DrillDownRecord[];
  columns: {
    key: keyof DrillDownRecord;
    label: string;
    format?: 'currency' | 'number' | 'text' | 'date';
  }[];
}

// Filter option types for dropdowns
export interface FilterOption {
  id: string;
  name: string;
  count?: number; // Optional count of items with this filter
}
