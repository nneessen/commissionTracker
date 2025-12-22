// src/types/scheduled-reports.types.ts
// TypeScript types for scheduled report delivery system
// Phase 9: Report Export Enhancement

import { z } from 'zod';

/**
 * Report frequency options
 */
export type ReportFrequency = 'weekly' | 'monthly' | 'quarterly';

/**
 * Supported report types for scheduling
 */
export type SchedulableReportType =
  | 'imo-performance'
  | 'agency-performance'
  | 'team-comparison'
  | 'top-performers'
  | 'recruiting-summary'
  | 'override-summary'
  | 'executive-dashboard'
  | 'commission-performance'
  | 'policy-performance'
  | 'client-relationship'
  | 'financial-health';

/**
 * Export format options
 */
export type ReportExportFormat = 'pdf' | 'csv';

/**
 * Delivery status
 */
export type DeliveryStatus = 'pending' | 'processing' | 'sent' | 'failed';

/**
 * Recipient for scheduled report
 */
export interface ScheduleRecipient {
  user_id: string;
  email: string;
  name: string;
}

/**
 * Report configuration options
 */
export interface ReportConfig {
  dateRangeMode: 'trailing' | 'fixed';
  trailingMonths?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * Scheduled report entity
 */
export interface ScheduledReport {
  id: string;
  owner_id: string;
  imo_id: string | null;
  agency_id: string | null;
  schedule_name: string;
  report_type: SchedulableReportType;
  report_config: ReportConfig;
  frequency: ReportFrequency;
  day_of_week: number | null; // 0-6 (Sunday-Saturday)
  day_of_month: number | null; // 1-28
  preferred_time: string; // HH:MM:SS
  recipients: ScheduleRecipient[];
  export_format: ReportExportFormat;
  include_charts: boolean;
  include_insights: boolean;
  include_summary: boolean;
  is_active: boolean;
  next_delivery: string; // ISO timestamp
  last_delivery: string | null; // ISO timestamp
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
}

/**
 * Scheduled report with delivery statistics (from RPC)
 */
export interface ScheduledReportWithStats extends ScheduledReport {
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
}

/**
 * Delivery history record
 */
export interface ScheduleDelivery {
  id: string;
  schedule_id?: string; // Optional - may not be returned by RPC
  status: DeliveryStatus;
  error_message: string | null;
  delivered_at: string | null;
  recipients_sent: ScheduleRecipient[];
  report_period_start: string;
  report_period_end: string;
  created_at: string;
}

/**
 * Eligible recipient for selection
 */
export interface EligibleRecipient {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  agency_name: string | null;
}

/**
 * Create schedule request
 */
export interface CreateScheduleRequest {
  schedule_name: string;
  report_type: SchedulableReportType;
  frequency: ReportFrequency;
  day_of_week?: number;
  day_of_month?: number;
  preferred_time?: string;
  recipients: ScheduleRecipient[];
  export_format?: ReportExportFormat;
  report_config?: Partial<ReportConfig>;
  include_charts?: boolean;
  include_insights?: boolean;
  include_summary?: boolean;
}

/**
 * Update schedule request
 */
export interface UpdateScheduleRequest {
  schedule_name?: string;
  frequency?: ReportFrequency;
  day_of_week?: number;
  day_of_month?: number;
  preferred_time?: string;
  recipients?: ScheduleRecipient[];
  export_format?: ReportExportFormat;
  report_config?: Partial<ReportConfig>;
  include_charts?: boolean;
  include_insights?: boolean;
  include_summary?: boolean;
  is_active?: boolean;
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const ScheduleRecipientSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
});

export const ReportConfigSchema = z.object({
  dateRangeMode: z.enum(['trailing', 'fixed']),
  trailingMonths: z.number().int().min(1).max(24).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const ScheduledReportSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  imo_id: z.string().uuid().nullable(),
  agency_id: z.string().uuid().nullable(),
  schedule_name: z.string().min(1),
  report_type: z.string() as z.ZodType<SchedulableReportType>,
  report_config: ReportConfigSchema,
  frequency: z.enum(['weekly', 'monthly', 'quarterly']),
  day_of_week: z.number().int().min(0).max(6).nullable(),
  day_of_month: z.number().int().min(1).max(28).nullable(),
  preferred_time: z.string(),
  recipients: z.array(ScheduleRecipientSchema),
  export_format: z.enum(['pdf', 'csv']),
  include_charts: z.boolean(),
  include_insights: z.boolean(),
  include_summary: z.boolean(),
  is_active: z.boolean(),
  next_delivery: z.string(),
  last_delivery: z.string().nullable(),
  consecutive_failures: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ScheduledReportWithStatsSchema = ScheduledReportSchema.extend({
  total_deliveries: z.coerce.number().int().nonnegative(),
  successful_deliveries: z.coerce.number().int().nonnegative(),
  failed_deliveries: z.coerce.number().int().nonnegative(),
});

export const ScheduleDeliverySchema = z.object({
  id: z.string().uuid(),
  schedule_id: z.string().uuid().optional(), // May not be returned by RPC
  status: z.enum(['pending', 'processing', 'sent', 'failed']),
  error_message: z.string().nullable(),
  delivered_at: z.string().nullable(),
  recipients_sent: z.array(ScheduleRecipientSchema),
  report_period_start: z.string(),
  report_period_end: z.string(),
  created_at: z.string(),
});

export const EligibleRecipientSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string(),
  role: z.string(),
  agency_name: z.string().nullable(),
});

// ============================================================================
// Parse Functions
// ============================================================================

export function parseScheduledReports(data: unknown[]): ScheduledReportWithStats[] {
  return z.array(ScheduledReportWithStatsSchema).parse(data);
}

export function parseScheduleDeliveries(data: unknown[]): ScheduleDelivery[] {
  return z.array(ScheduleDeliverySchema).parse(data);
}

export function parseEligibleRecipients(data: unknown[]): EligibleRecipient[] {
  return z.array(EligibleRecipientSchema).parse(data);
}

// ============================================================================
// Constants & Helpers
// ============================================================================

/**
 * Report type display names and metadata
 */
export const SCHEDULABLE_REPORT_TYPES: Array<{
  type: SchedulableReportType;
  name: string;
  description: string;
  icon: string;
  scopes: ('imo' | 'agency')[];
}> = [
  {
    type: 'imo-performance',
    name: 'IMO Performance',
    description: 'Monthly performance trends for entire IMO',
    icon: '📊',
    scopes: ['imo'],
  },
  {
    type: 'agency-performance',
    name: 'Agency Performance',
    description: 'Monthly performance trends for agency',
    icon: '📈',
    scopes: ['imo', 'agency'],
  },
  {
    type: 'team-comparison',
    name: 'Team Comparison',
    description: 'Agency rankings and comparisons',
    icon: '🏆',
    scopes: ['imo'],
  },
  {
    type: 'top-performers',
    name: 'Top Performers',
    description: 'Agent performance rankings',
    icon: '⭐',
    scopes: ['imo', 'agency'],
  },
  {
    type: 'recruiting-summary',
    name: 'Recruiting Summary',
    description: 'Recruiting pipeline funnel metrics',
    icon: '👥',
    scopes: ['imo', 'agency'],
  },
  {
    type: 'override-summary',
    name: 'Override Summary',
    description: 'Override commission totals and breakdown',
    icon: '💰',
    scopes: ['imo', 'agency'],
  },
  {
    type: 'executive-dashboard',
    name: 'Executive Dashboard',
    description: 'High-level KPI summary for leadership',
    icon: '📋',
    scopes: ['imo', 'agency'],
  },
];

/**
 * Frequency options with display names
 */
export const FREQUENCY_OPTIONS: Array<{
  value: ReportFrequency;
  label: string;
  description: string;
}> = [
  {
    value: 'weekly',
    label: 'Weekly',
    description: 'Delivered every week on selected day',
  },
  {
    value: 'monthly',
    label: 'Monthly',
    description: 'Delivered once per month on selected day',
  },
  {
    value: 'quarterly',
    label: 'Quarterly',
    description: 'Delivered at start of each quarter',
  },
];

/**
 * Days of week for weekly schedules
 */
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

/**
 * Get human-readable schedule description
 */
export function getScheduleDescription(schedule: ScheduledReport): string {
  const freq = FREQUENCY_OPTIONS.find(f => f.value === schedule.frequency);

  switch (schedule.frequency) {
    case 'weekly': {
      const day = DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week);
      return `Every ${day?.label || 'week'}`;
    }
    case 'monthly':
      return `Monthly on day ${schedule.day_of_month}`;
    case 'quarterly':
      return `Quarterly on day ${schedule.day_of_month}`;
    default:
      return freq?.label || schedule.frequency;
  }
}

/**
 * Get delivery status badge color
 */
export function getDeliveryStatusColor(status: DeliveryStatus): string {
  switch (status) {
    case 'sent':
      return 'green';
    case 'failed':
      return 'red';
    case 'processing':
      return 'yellow';
    case 'pending':
    default:
      return 'gray';
  }
}
