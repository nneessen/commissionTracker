// src/types/team-analytics.types.ts
// Type definitions for Team Analytics dashboard

/**
 * Raw policy data from team analytics RPC
 */
export interface TeamPolicyRow {
  id: string;
  user_id: string;
  status: string;
  annual_premium: number | null;
  effective_date: string;
  product: string | null;
  carrier_id: string | null;
  client_id: string | null;
  policy_number: string | null;
  created_at: string;
  cancellation_date: string | null;
  updated_at?: string;
  commission_percentage: number | null;
  term_length: number | null;
  /** Client's state from the address JSONB field */
  client_state: string | null;
}

/**
 * Raw commission data from team analytics RPC
 */
export interface TeamCommissionRow {
  id: string;
  user_id: string;
  policy_id: string | null;
  commission_amount: number | null;
  commission_type: string | null;
  payment_status: string | null;
  effective_date: string | null;
  carrier_id: string | null;
  product_type: string | null;
  earned_amount: number | null;
  unearned_amount: number | null;
  months_paid: number | null;
  advance_months: number | null;
  chargeback_amount: number | null;
  chargeback_date: string | null;
  payment_date: string | null;
  created_at: string;
  last_payment_date?: string | null;
}

/**
 * Agent target data from team analytics RPC
 */
export interface TeamAgentTargetRow {
  user_id: string;
  annual_policies_target: number | null;
  avg_premium_target: number | null;
  annual_income_target: number | null;
  monthly_income_target: number | null;
  monthly_expense_target: number | null;
}

/**
 * Carrier data from team analytics RPC
 */
export interface TeamCarrierRow {
  id: string;
  name: string;
}

/**
 * Client data from team analytics RPC
 */
export interface TeamClientRow {
  id: string;
  name: string | null;
}

/**
 * Agent profile data from team analytics RPC
 */
export interface TeamAgentProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  contract_level: number | null;
  roles: string[] | null;
  approval_status: string | null;
  state: string | null;
}

/**
 * Raw data returned from team analytics RPC
 */
export interface TeamAnalyticsRawData {
  policies: TeamPolicyRow[];
  commissions: TeamCommissionRow[];
  allPolicies: TeamPolicyRow[];
  allCommissions: TeamCommissionRow[];
  agentTargets: TeamAgentTargetRow[];
  carriers: TeamCarrierRow[];
  clients: TeamClientRow[];
  agentProfiles: TeamAgentProfileRow[];
}

/**
 * Agent performance tier for segmentation
 */
export type AgentPerformanceTier =
  | "top_performer"
  | "solid_performer"
  | "needs_attention";

/**
 * Individual agent performance data
 */
export interface AgentPerformanceData {
  agentId: string;
  agentName: string;
  agentEmail: string;
  contractLevel: number;
  totalAP: number;
  policyCount: number;
  avgPremium: number;
  activePolicies: number;
  lapsedPolicies: number;
  cancelledPolicies: number;
  persistencyRate: number;
  commissionEarned: number;
}

/**
 * Agent segment group
 */
export interface AgentSegment {
  tier: AgentPerformanceTier;
  agents: AgentPerformanceData[];
  totalAP: number;
  avgAP: number;
  policyCount: number;
  agentCount: number;
}

/**
 * Agent segmentation summary
 */
export interface AgentSegmentationSummary {
  topPerformers: AgentSegment;
  solidPerformers: AgentSegment;
  needsAttention: AgentSegment;
  totalAgents: number;
  totalTeamAP: number;
  avgAgentAP: number;
}

/**
 * Team pace metrics
 */
export interface TeamPaceMetrics {
  // Written metrics
  totalAPWritten: number;
  totalPoliciesWritten: number;
  avgPremiumPerPolicy: number;

  // Projected metrics
  projectedAPTotal: number;
  currentAPPace: number; // AP per day
  projectedPolicyTotal: number;

  // Goal progress
  teamAPTarget: number;
  surplusDeficit: number;
  isProfitable: boolean;

  // Time context
  daysElapsed: number;
  daysRemaining: number;
  timePeriod: string;
}

/**
 * Team carrier breakdown
 */
export interface TeamCarrierBreakdown {
  carrierId: string;
  carrierName: string;
  policyCount: number;
  totalPremium: number;
  totalCommission: number;
  avgCommissionRate: number;
  products: {
    name: string;
    policyCount: number;
    totalPremium: number;
    totalCommission: number;
    avgCommissionRate: number;
  }[];
}

/**
 * Team geographic distribution
 */
export interface TeamGeographicBreakdown {
  state: string;
  policyCount: number;
  totalPremium: number;
  percentage: number;
}

/**
 * Team policy status breakdown
 */
export interface TeamPolicyStatusBreakdown {
  active: { count: number; premium: number };
  pending: { count: number; premium: number };
  lapsed: { count: number; premium: number };
  cancelled: { count: number; premium: number };
  total: { count: number; premium: number };
  persistencyRate: number;
}

/**
 * Options for useTeamAnalyticsData hook
 */
export interface UseTeamAnalyticsDataOptions {
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
  /**
   * Optional array of team user IDs to use instead of fetching via useMyDownlines.
   * Pass this to ensure consistency with other components that display the same agents.
   */
  teamUserIds?: string[];
}
