// src/types/hierarchy.types.ts
// Type definitions for insurance agency hierarchy system

import type { CommissionStatus } from './commission.types';

/**
 * User profile with hierarchy information
 * NOTE: Recruits are just users with onboarding_status='lead' or 'active'
 * No separate table needed - single source of truth
 */
export interface UserProfile {
  id: string;
  user_id?: string | null; // References auth.users.id (can be NULL for leads)
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  profile_photo_url?: string | null;

  // Hierarchy fields
  upline_id: string | null;
  hierarchy_path: string;
  hierarchy_depth: number;
  approval_status: 'pending' | 'approved' | 'denied';
  is_admin: boolean;

  // Onboarding/recruiting fields - status mirrors the 7 phases
  onboarding_status?: 'interview_1' | 'zoom_interview' | 'pre_licensing' | 'exam' | 'npn_received' | 'contracting' | 'bootcamp' | 'completed' | 'dropped';
  current_onboarding_phase?: string | null;
  recruiter_id?: string | null; // Who recruited them (different from upline_id)
  onboarding_started_at?: string | null;
  onboarding_completed_at?: string | null;
  referral_source?: string | null;

  // Social media
  instagram_username?: string | null;
  instagram_url?: string | null;
  linkedin_username?: string | null;
  linkedin_url?: string | null;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

/**
 * Hierarchical tree node representing an agent and their downlines
 */
export interface HierarchyNode extends UserProfile {
  children: HierarchyNode[];
  downline_count: number; // Total count of all descendants
  direct_downline_count: number; // Immediate children only
  contractCompLevel?: number; // From auth.users metadata
  override_earnings?: number; // Total override earnings from this agent
}

/**
 * Override commission record
 * Earned by uplines from downline policy sales
 */
export interface OverrideCommission {
  id: string;

  // Relationships
  policy_id: string;
  base_agent_id: string; // Who wrote the policy
  override_agent_id: string; // Who earns the override

  // Hierarchy tracking
  hierarchy_depth: number; // 1 = immediate upline, 2 = upline's upline, etc.

  // Commission calculation details
  base_comp_level: number; // e.g., 100
  override_comp_level: number; // e.g., 120
  carrier_id: string;
  product_id: string | null;
  policy_premium: number;

  // Calculated amounts
  base_commission_amount: number; // What downline earned
  override_commission_amount: number; // Difference (upline - downline)

  // Advance tracking (same as base commissions)
  advance_months: number;
  months_paid: number;
  earned_amount: number;
  unearned_amount: number;

  // Chargeback tracking
  chargeback_amount: number;
  chargeback_date: Date | null;
  chargeback_reason: string | null;

  // Status lifecycle
  status: CommissionStatus;
  payment_date: Date | null;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

/**
 * Override commission with related agent details
 */
export interface OverrideCommissionWithAgents extends OverrideCommission {
  base_agent_email: string;
  base_agent_name?: string;
  override_agent_email: string;
  override_agent_name?: string;
  policy_number?: string;
  carrier_name?: string;
  product_name?: string;
}

/**
 * Summary of override commissions by agent
 */
export interface OverrideSummary {
  override_agent_id: string;
  total_overrides: number;
  total_override_amount: number;
  pending_amount: number;
  earned_amount: number;
  paid_amount: number;
  charged_back_amount: number;
  total_earned: number;
  total_unearned: number;
}

/**
 * Summary of override commissions by downline
 */
export interface OverrideByDownlineSummary {
  downline_id: string;
  downline_email: string;
  downline_name?: string;
  hierarchy_depth: number;
  total_policies: number;
  total_premium: number;
  total_override_generated: number;
  pending_override: number;
  earned_override: number;
  paid_override: number;
}

/**
 * Downline performance metrics
 */
export interface DownlinePerformance {
  agent_id: string;
  agent_email: string;
  agent_name?: string;
  hierarchy_depth: number;

  // Policy metrics
  policies_written: number;
  policies_active: number;
  policies_lapsed: number;
  policies_cancelled: number;

  // Premium metrics
  total_premium: number;
  avg_premium: number;

  // Commission metrics
  total_base_commission: number;
  total_commission_earned: number;
  total_commission_paid: number;

  // Override metrics (what this downline generated for upline)
  total_overrides_generated: number;
  pending_overrides_generated: number;
  earned_overrides_generated: number;
  paid_overrides_generated: number;

  // Persistency
  persistency_rate: number; // Percentage of policies still active
}

/**
 * Filters for override commission queries
 */
export interface OverrideFilters {
  status?: CommissionStatus | CommissionStatus[];
  downline_id?: string;
  hierarchy_depth?: number;
  start_date?: Date;
  end_date?: Date;
  min_amount?: number;
  max_amount?: number;
}

/**
 * Request to change hierarchy relationship
 */
export interface HierarchyChangeRequest {
  agent_id: string;
  new_upline_id: string | null;
  reason?: string;
}

/**
 * Validation result for hierarchy changes
 */
export interface HierarchyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Hierarchy statistics
 */
export interface HierarchyStats {
  total_agents: number;
  total_downlines: number;
  direct_downlines: number;
  max_depth: number;
  total_override_income_mtd: number;
  total_override_income_ytd: number;
}

/**
 * Database view type for override_commission_summary
 */
export interface OverrideCommissionSummaryView {
  override_agent_id: string;
  total_overrides: number;
  total_override_amount: number;
  pending_amount: number;
  earned_amount: number;
  paid_amount: number;
  charged_back_amount: number;
  total_earned: number;
  total_unearned: number;
}
