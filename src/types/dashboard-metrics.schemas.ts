// src/types/dashboard-metrics.schemas.ts
// Zod schemas for dashboard metrics RPC responses
// Provides runtime type validation for database responses

import { z } from 'zod';

/**
 * Schema for IMO Dashboard Metrics RPC response row
 */
export const ImoDashboardMetricsRowSchema = z.object({
  imo_id: z.string().uuid(),
  imo_name: z.string(),
  total_active_policies: z.coerce.number().int().nonnegative(),
  total_annual_premium: z.coerce.number().nonnegative(),
  total_commissions_ytd: z.coerce.number().nonnegative(),
  total_earned_ytd: z.coerce.number().nonnegative(),
  total_unearned: z.coerce.number().nonnegative(),
  agent_count: z.coerce.number().int().nonnegative(),
  agency_count: z.coerce.number().int().nonnegative(),
  avg_production_per_agent: z.coerce.number().nonnegative(),
});

export type ImoDashboardMetricsRow = z.infer<typeof ImoDashboardMetricsRowSchema>;

/**
 * Schema for Agency Dashboard Metrics RPC response row
 */
export const AgencyDashboardMetricsRowSchema = z.object({
  agency_id: z.string().uuid(),
  agency_name: z.string(),
  imo_id: z.string().uuid(),
  active_policies: z.coerce.number().int().nonnegative(),
  total_annual_premium: z.coerce.number().nonnegative(),
  total_commissions_ytd: z.coerce.number().nonnegative(),
  total_earned_ytd: z.coerce.number().nonnegative(),
  total_unearned: z.coerce.number().nonnegative(),
  agent_count: z.coerce.number().int().nonnegative(),
  avg_production_per_agent: z.coerce.number().nonnegative(),
  top_producer_id: z.string().uuid().nullable(),
  top_producer_name: z.string().nullable(),
  top_producer_premium: z.coerce.number().nonnegative(),
});

export type AgencyDashboardMetricsRow = z.infer<typeof AgencyDashboardMetricsRowSchema>;

/**
 * Schema for IMO Production by Agency RPC response row
 */
export const ImoProductionByAgencyRowSchema = z.object({
  agency_id: z.string().uuid(),
  agency_name: z.string(),
  agency_code: z.string(),
  owner_name: z.string(),
  active_policies: z.coerce.number().int().nonnegative(),
  total_annual_premium: z.coerce.number().nonnegative(),
  commissions_ytd: z.coerce.number().nonnegative(),
  agent_count: z.coerce.number().int().nonnegative(),
  avg_production: z.coerce.number().nonnegative(),
  pct_of_imo_production: z.coerce.number().nonnegative(),
});

export type ImoProductionByAgencyRow = z.infer<typeof ImoProductionByAgencyRowSchema>;

/**
 * Schema for Agency Production by Agent RPC response row
 */
export const AgencyProductionByAgentRowSchema = z.object({
  agent_id: z.string().uuid(),
  agent_name: z.string(),
  agent_email: z.string().email(),
  contract_level: z.coerce.number().int(),
  active_policies: z.coerce.number().int().nonnegative(),
  total_annual_premium: z.coerce.number().nonnegative(),
  commissions_ytd: z.coerce.number().nonnegative(),
  earned_ytd: z.coerce.number().nonnegative(),
  unearned_amount: z.coerce.number().nonnegative(),
  pct_of_agency_production: z.coerce.number().nonnegative(),
  joined_date: z.string(), // ISO timestamp string
});

export type AgencyProductionByAgentRow = z.infer<typeof AgencyProductionByAgentRowSchema>;

/**
 * Schema for IMO Override Summary RPC response row
 */
export const ImoOverrideSummaryRowSchema = z.object({
  imo_id: z.string().uuid(),
  imo_name: z.string(),
  total_override_count: z.coerce.number().int().nonnegative(),
  total_override_amount: z.coerce.number().nonnegative(),
  pending_amount: z.coerce.number().nonnegative(),
  earned_amount: z.coerce.number().nonnegative(),
  paid_amount: z.coerce.number().nonnegative(),
  chargeback_amount: z.coerce.number().nonnegative(),
  unique_uplines: z.coerce.number().int().nonnegative(),
  unique_downlines: z.coerce.number().int().nonnegative(),
  avg_override_per_policy: z.coerce.number().nonnegative(),
});

export type ImoOverrideSummaryRow = z.infer<typeof ImoOverrideSummaryRowSchema>;

/**
 * Schema for Agency Override Summary RPC response row
 */
export const AgencyOverrideSummaryRowSchema = z.object({
  agency_id: z.string().uuid(),
  agency_name: z.string(),
  total_override_count: z.coerce.number().int().nonnegative(),
  total_override_amount: z.coerce.number().nonnegative(),
  pending_amount: z.coerce.number().nonnegative(),
  earned_amount: z.coerce.number().nonnegative(),
  paid_amount: z.coerce.number().nonnegative(),
  chargeback_amount: z.coerce.number().nonnegative(),
  unique_uplines: z.coerce.number().int().nonnegative(),
  unique_downlines: z.coerce.number().int().nonnegative(),
  avg_override_per_policy: z.coerce.number().nonnegative(),
  top_earner_id: z.string().uuid().nullable(),
  top_earner_name: z.string().nullable(),
  top_earner_amount: z.coerce.number().nonnegative(),
});

export type AgencyOverrideSummaryRow = z.infer<typeof AgencyOverrideSummaryRowSchema>;

/**
 * Schema for Override by Agency RPC response row
 */
export const OverrideByAgencyRowSchema = z.object({
  agency_id: z.string().uuid(),
  agency_name: z.string(),
  agency_code: z.string(),
  override_count: z.coerce.number().int().nonnegative(),
  total_amount: z.coerce.number().nonnegative(),
  pending_amount: z.coerce.number().nonnegative(),
  earned_amount: z.coerce.number().nonnegative(),
  paid_amount: z.coerce.number().nonnegative(),
  pct_of_imo_overrides: z.coerce.number().nonnegative(),
});

export type OverrideByAgencyRow = z.infer<typeof OverrideByAgencyRowSchema>;

/**
 * Schema for Override by Agent RPC response row
 */
export const OverrideByAgentRowSchema = z.object({
  agent_id: z.string().uuid(),
  agent_name: z.string(),
  agent_email: z.string().email(),
  override_count: z.coerce.number().int().nonnegative(),
  total_amount: z.coerce.number().nonnegative(),
  pending_amount: z.coerce.number().nonnegative(),
  earned_amount: z.coerce.number().nonnegative(),
  paid_amount: z.coerce.number().nonnegative(),
  avg_per_override: z.coerce.number().nonnegative(),
  pct_of_agency_overrides: z.coerce.number().nonnegative(),
});

export type OverrideByAgentRow = z.infer<typeof OverrideByAgentRowSchema>;

/**
 * Parse and validate IMO dashboard metrics response
 * @throws ZodError if validation fails
 */
export function parseImoDashboardMetrics(data: unknown[]): ImoDashboardMetricsRow[] {
  return z.array(ImoDashboardMetricsRowSchema).parse(data);
}

/**
 * Parse and validate Agency dashboard metrics response
 * @throws ZodError if validation fails
 */
export function parseAgencyDashboardMetrics(data: unknown[]): AgencyDashboardMetricsRow[] {
  return z.array(AgencyDashboardMetricsRowSchema).parse(data);
}

/**
 * Parse and validate IMO production by agency response
 * @throws ZodError if validation fails
 */
export function parseImoProductionByAgency(data: unknown[]): ImoProductionByAgencyRow[] {
  return z.array(ImoProductionByAgencyRowSchema).parse(data);
}

/**
 * Parse and validate Agency production by agent response
 * @throws ZodError if validation fails
 */
export function parseAgencyProductionByAgent(data: unknown[]): AgencyProductionByAgentRow[] {
  return z.array(AgencyProductionByAgentRowSchema).parse(data);
}

/**
 * PostgreSQL error codes used by dashboard metrics RPC functions
 */
export const RPC_ERROR_CODES = {
  INSUFFICIENT_PRIVILEGE: '42501',
  INVALID_PARAMETER_VALUE: '22023',
  NO_DATA_FOUND: 'P0002',
} as const;

/**
 * Check if a Supabase error is an access denied error
 */
export function isAccessDeniedError(error: { code?: string; message?: string }): boolean {
  return error.code === RPC_ERROR_CODES.INSUFFICIENT_PRIVILEGE;
}

/**
 * Check if a Supabase error is a not found error
 */
export function isNotFoundError(error: { code?: string; message?: string }): boolean {
  return error.code === RPC_ERROR_CODES.NO_DATA_FOUND;
}

/**
 * Check if a Supabase error is an invalid parameter error
 */
export function isInvalidParameterError(error: { code?: string; message?: string }): boolean {
  return error.code === RPC_ERROR_CODES.INVALID_PARAMETER_VALUE;
}

/**
 * Parse and validate IMO override summary response
 * @throws ZodError if validation fails
 */
export function parseImoOverrideSummary(data: unknown[]): ImoOverrideSummaryRow[] {
  return z.array(ImoOverrideSummaryRowSchema).parse(data);
}

/**
 * Parse and validate Agency override summary response
 * @throws ZodError if validation fails
 */
export function parseAgencyOverrideSummary(data: unknown[]): AgencyOverrideSummaryRow[] {
  return z.array(AgencyOverrideSummaryRowSchema).parse(data);
}

/**
 * Parse and validate Override by Agency response
 * @throws ZodError if validation fails
 */
export function parseOverrideByAgency(data: unknown[]): OverrideByAgencyRow[] {
  return z.array(OverrideByAgencyRowSchema).parse(data);
}

/**
 * Parse and validate Override by Agent response
 * @throws ZodError if validation fails
 */
export function parseOverrideByAgent(data: unknown[]): OverrideByAgentRow[] {
  return z.array(OverrideByAgentRowSchema).parse(data);
}

// =============================================================================
// RECRUITING SUMMARY SCHEMAS (Phase 8)
// =============================================================================

/**
 * Schema for status counts (flexible object with string keys and number values)
 */
export const RecruitingStatusCountsSchema = z.record(z.string(), z.coerce.number().int().nonnegative());

/**
 * Schema for IMO Recruiting Summary RPC response (JSONB)
 */
export const ImoRecruitingSummarySchema = z.object({
  total_recruits: z.coerce.number().int().nonnegative(),
  by_status: RecruitingStatusCountsSchema,
  by_agent_status: RecruitingStatusCountsSchema,
  conversion_rate: z.coerce.number().nonnegative(),
  avg_days_to_complete: z.coerce.number().nullable(),
  active_in_pipeline: z.coerce.number().int().nonnegative(),
  completed_count: z.coerce.number().int().nonnegative(),
  dropped_count: z.coerce.number().int().nonnegative(),
});

export type ImoRecruitingSummaryRow = z.infer<typeof ImoRecruitingSummarySchema>;

/**
 * Schema for Agency Recruiting Summary RPC response (JSONB)
 */
export const AgencyRecruitingSummarySchema = z.object({
  total_recruits: z.coerce.number().int().nonnegative(),
  by_status: RecruitingStatusCountsSchema,
  by_agent_status: RecruitingStatusCountsSchema,
  conversion_rate: z.coerce.number().nonnegative(),
  avg_days_to_complete: z.coerce.number().nullable(),
  active_in_pipeline: z.coerce.number().int().nonnegative(),
  completed_count: z.coerce.number().int().nonnegative(),
  dropped_count: z.coerce.number().int().nonnegative(),
});

export type AgencyRecruitingSummaryRow = z.infer<typeof AgencyRecruitingSummarySchema>;

/**
 * Schema for Recruiting by Agency RPC response row
 */
export const RecruitingByAgencyRowSchema = z.object({
  agency_id: z.string().uuid(),
  agency_name: z.string(),
  total_recruits: z.coerce.number().int().nonnegative(),
  active_in_pipeline: z.coerce.number().int().nonnegative(),
  completed_count: z.coerce.number().int().nonnegative(),
  dropped_count: z.coerce.number().int().nonnegative(),
  conversion_rate: z.coerce.number().nonnegative(),
  licensed_count: z.coerce.number().int().nonnegative(),
});

export type RecruitingByAgencyRow = z.infer<typeof RecruitingByAgencyRowSchema>;

/**
 * Schema for Recruiting by Recruiter RPC response row
 */
export const RecruitingByRecruiterRowSchema = z.object({
  recruiter_id: z.string().uuid(),
  recruiter_name: z.string(),
  // Note: Not validated as .email() because RPC uses COALESCE fallback that may return
  // constructed name string when email is missing (e.g., "John Smith" instead of email)
  recruiter_email: z.string(),
  total_recruits: z.coerce.number().int().nonnegative(),
  active_in_pipeline: z.coerce.number().int().nonnegative(),
  completed_count: z.coerce.number().int().nonnegative(),
  dropped_count: z.coerce.number().int().nonnegative(),
  conversion_rate: z.coerce.number().nonnegative(),
  licensed_count: z.coerce.number().int().nonnegative(),
});

export type RecruitingByRecruiterRow = z.infer<typeof RecruitingByRecruiterRowSchema>;

/**
 * Parse and validate IMO recruiting summary response (JSONB)
 * @throws ZodError if validation fails
 */
export function parseImoRecruitingSummary(data: unknown): ImoRecruitingSummaryRow {
  return ImoRecruitingSummarySchema.parse(data);
}

/**
 * Parse and validate Agency recruiting summary response (JSONB)
 * @throws ZodError if validation fails
 */
export function parseAgencyRecruitingSummary(data: unknown): AgencyRecruitingSummaryRow {
  return AgencyRecruitingSummarySchema.parse(data);
}

/**
 * Parse and validate Recruiting by Agency response (JSONB array)
 * @throws ZodError if validation fails
 */
export function parseRecruitingByAgency(data: unknown): RecruitingByAgencyRow[] {
  return z.array(RecruitingByAgencyRowSchema).parse(data);
}

/**
 * Parse and validate Recruiting by Recruiter response (JSONB array)
 * @throws ZodError if validation fails
 */
export function parseRecruitingByRecruiter(data: unknown): RecruitingByRecruiterRow[] {
  return z.array(RecruitingByRecruiterRowSchema).parse(data);
}
