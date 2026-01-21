// src/types/reports.types.ts

export type ReportType =
  | "executive-dashboard"
  | "commission-performance"
  | "policy-performance"
  | "client-relationship"
  | "financial-health"
  | "predictive-analytics"
  // Team Reports (Phase 6)
  | "imo-performance"
  | "agency-performance";

export type InsightSeverity = "critical" | "high" | "medium" | "low" | "info";
export type InsightCategory =
  | "revenue"
  | "expense"
  | "retention"
  | "chargeback"
  | "opportunity"
  | "risk"
  | "performance";

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
  trend?: "up" | "down" | "neutral";
  target?: number;
  actual?: number;
  format?: "currency" | "percent" | "number" | "text";
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
  format: "pdf" | "excel" | "csv";
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
  | "weekly-check-in"
  | "monthly-comprehensive"
  | "quarterly-strategic"
  | "performance-review"
  | "custom";

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
  format: "pdf" | "excel";
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
  format: "pdf" | "excel";
}

// ============================================================================
// PHASE 4: Interactive Features - Drill-Down Types
// ============================================================================

export type DrillDownType =
  | "commission-aging-bucket" // Click aging bucket (0-3mo, 3-6mo, etc.)
  | "client-tier" // Click tier (A, B, C, D)
  | "carrier" // Click carrier row
  | "product" // Click product row
  | "commission" // Click specific commission
  | "policy"; // Click specific policy

export interface DrillDownContext {
  type: DrillDownType;
  title: string;
  subtitle?: string;
  // Identifiers for fetching data
  agingBucket?: string; // '0-3 months', '3-6 months', etc.
  clientTier?: "A" | "B" | "C" | "D";
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
  type: "commission" | "policy" | "client";
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
    format?: "currency" | "number" | "text" | "date";
  }[];
}

// Filter option types for dropdowns
export interface FilterOption {
  id: string;
  name: string;
  count?: number; // Optional count of items with this filter
}

// ============================================================================
// PHASE 5: Report Persistence & History Types
// ============================================================================

/** Saved report with persistence metadata */
export interface SavedReport extends Report {
  savedId: string; // Database UUID
  savedAt: Date;
  isFavorite: boolean;
  notes?: string;
  annotations?: ReportAnnotation[];
}

/** User annotation on a specific report section */
export interface ReportAnnotation {
  id: string;
  reportId: string;
  sectionId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Summary item for report history list */
export interface ReportHistoryItem {
  id: string;
  reportType: ReportType;
  title: string;
  subtitle: string;
  generatedAt: Date;
  isFavorite: boolean;
  annotationCount: number;
  filterSummary: string; // "Nov 1-30, 2025 | All Carriers"
}

/** Options for fetching report history */
export interface ReportHistoryOptions {
  limit?: number;
  offset?: number;
  reportType?: ReportType;
  favoritesOnly?: boolean;
}

/** Database row shape for generated_reports table */
export interface GeneratedReportRow {
  id: string;
  user_id: string;
  report_type: string;
  title: string;
  subtitle: string | null;
  filters: Record<string, unknown>;
  summary: Record<string, unknown>;
  sections: Record<string, unknown>[];
  generated_at: string;
  is_favorite: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Database row shape for report_annotations table */
export interface ReportAnnotationRow {
  id: string;
  report_id: string;
  user_id: string;
  section_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PHASE 5: Comparison Mode Types
// ============================================================================

/** Comparison period options */
export type ComparisonPeriod =
  | "prior-period" // Same duration, immediately before
  | "prior-month" // Previous month
  | "prior-quarter" // Previous quarter
  | "prior-year" // Same period last year
  | "custom"; // User-selected dates

/** Comparison state for reports */
export interface ComparisonState {
  enabled: boolean;
  period: ComparisonPeriod;
  customRange?: {
    startDate: Date;
    endDate: Date;
  };
}

/** Metric with comparison data */
export interface ComparisonMetric extends ReportMetric {
  comparisonValue?: string | number;
  comparisonChange?: number; // Percentage change
  comparisonTrend?: "up" | "down" | "neutral";
}

/** Summary with comparison data */
export interface ComparisonSummary {
  current: {
    healthScore: number;
    keyMetrics: ReportMetric[];
  };
  comparison: {
    healthScore: number;
    keyMetrics: ReportMetric[];
  };
  changes: {
    healthScoreChange: number;
    metricChanges: Record<string, number>; // label -> percentage change
  };
}

// ============================================================================
// PHASE 6: Report Scheduling & Automation Types
// ============================================================================

/** Schedule frequency types */
export type ScheduleFrequency = "daily" | "weekly" | "monthly";

/** Relative date range presets for scheduled reports */
export type RelativeDatePreset = "last-7-days" | "mtd" | "qtd" | "ytd";

/** Bundle template options for scheduled reports */
export type ScheduleBundleTemplate = "weekly-review" | "monthly-summary";

/** Report configuration for a schedule */
export interface ScheduleReportConfig {
  type: "single" | "bundle";
  bundleTemplate?: ScheduleBundleTemplate;
  reportTypes?: ReportType[];
  dateRange: {
    preset: RelativeDatePreset;
  };
  filters?: {
    carrierIds?: string[];
    productIds?: string[];
  };
}

/** Email configuration for schedule notifications */
export interface ScheduleEmailConfig {
  enabled: boolean;
  recipients: string[];
  subject?: string;
  body?: string;
}

/** Main report schedule type */
export interface ReportSchedule {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;

  // Frequency
  scheduleType: ScheduleFrequency;
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
  runTime: string; // "08:00:00"
  timezone: string; // "America/New_York"

  // Configuration
  reportConfig: ScheduleReportConfig;
  emailConfig: ScheduleEmailConfig;

  // Execution tracking
  lastRunAt?: Date;
  lastSuccessAt?: Date;
  nextRunAt?: Date;
  runCount: number;
  failureCount: number;
  consecutiveFailures: number;
  autoDisabledAt?: Date;
  maxConsecutiveFailures: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Schedule execution run record */
export interface ScheduleRun {
  id: string;
  scheduleId: string;
  userId: string;
  status: "pending" | "running" | "success" | "failed";

  scheduledFor: Date;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;

  reportIds: string[];

  emailSent: boolean;
  emailSentAt?: Date;
  emailError?: string;

  errorMessage?: string;
  retryAttempted: boolean;

  // Trigger tracking
  triggerType?: "scheduled" | "manual";
  triggeredByUserId?: string;

  createdAt: Date;
}

/** Form input type for creating/editing schedules */
export interface ScheduleFormData {
  name: string;
  description?: string;
  scheduleType: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  runTime: string;
  timezone: string;
  reportConfig: ScheduleReportConfig;
  emailConfig: ScheduleEmailConfig;
}

/** Database row shape for report_schedules table */
export interface ReportScheduleRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  schedule_type: string;
  day_of_week: number | null;
  day_of_month: number | null;
  run_time: string;
  timezone: string;
  report_config: Record<string, unknown>;
  email_config: Record<string, unknown>;
  last_run_at: string | null;
  last_success_at: string | null;
  next_run_at: string | null;
  run_count: number;
  failure_count: number;
  consecutive_failures: number;
  auto_disabled_at: string | null;
  max_consecutive_failures: number;
  created_at: string;
  updated_at: string;
}

/** Database row shape for report_schedule_runs table */
export interface ScheduleRunRow {
  id: string;
  schedule_id: string;
  user_id: string;
  status: string;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  report_ids: string[];
  email_sent: boolean;
  email_sent_at: string | null;
  email_error: string | null;
  error_message: string | null;
  retry_attempted: boolean;
  trigger_type: string | null;
  triggered_by_user_id: string | null;
  created_at: string;
}

/** Day of week options for weekly schedules */
export const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

/** Common timezone options */
export const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
] as const;

/** Relative date preset options */
export const DATE_PRESET_OPTIONS = [
  { value: "last-7-days" as const, label: "Last 7 Days" },
  { value: "mtd" as const, label: "Month to Date" },
  { value: "qtd" as const, label: "Quarter to Date" },
  { value: "ytd" as const, label: "Year to Date" },
] as const;

/** Bundle template options */
export const BUNDLE_TEMPLATE_OPTIONS = [
  {
    value: "weekly-review" as const,
    label: "Weekly Review",
    description: "Executive Dashboard + Commission Performance",
    reportTypes: [
      "executive-dashboard",
      "commission-performance",
    ] as ReportType[],
  },
  {
    value: "monthly-summary" as const,
    label: "Monthly Summary",
    description: "Executive Dashboard + Commission + Policy Performance",
    reportTypes: [
      "executive-dashboard",
      "commission-performance",
      "policy-performance",
    ] as ReportType[],
  },
] as const;
