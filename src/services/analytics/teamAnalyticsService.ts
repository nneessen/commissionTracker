// src/services/analytics/teamAnalyticsService.ts
// Service for fetching and processing team analytics data

import { supabase } from "../base/supabase";
import { logger } from "../base/logger";
import type {
  TeamAnalyticsRawData,
  TeamPolicyRow,
  TeamCommissionRow,
  TeamAgentTargetRow,
  TeamCarrierRow,
  TeamClientRow,
  TeamAgentProfileRow,
  AgentPerformanceData,
  AgentSegmentationSummary,
  AgentSegment,
  TeamGamePlanMetrics,
  TeamPaceMetrics,
  TeamPolicyStatusBreakdown,
  TeamGeographicBreakdown,
  TeamCarrierBreakdown,
} from "../../types/team-analytics.types";

/**
 * Raw response structure from the Postgres RPC
 */
interface TeamAnalyticsRPCResponse {
  policies: TeamPolicyRow[];
  commissions: TeamCommissionRow[];
  all_policies: TeamPolicyRow[];
  all_commissions: TeamCommissionRow[];
  agent_targets: TeamAgentTargetRow[];
  carriers: TeamCarrierRow[];
  clients: TeamClientRow[];
  agent_profiles: TeamAgentProfileRow[];
}

/**
 * Team Analytics Service
 *
 * Provides server-side aggregation of team data for analytics dashboards.
 * Uses a Postgres RPC function to minimize data transfer and processing time.
 */
class TeamAnalyticsService {
  /**
   * Fetch raw team analytics data from Postgres RPC
   */
  async getTeamAnalyticsData(
    userIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<TeamAnalyticsRawData> {
    try {
      const { data, error } = await supabase.rpc('get_team_analytics_data', {
        p_team_user_ids: userIds,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
      });

      if (error) {
        logger.error('TeamAnalyticsService.getTeamAnalyticsData RPC error', error);
        throw error;
      }

      // Transform snake_case from Postgres to camelCase for TypeScript
      const rpcData = data as TeamAnalyticsRPCResponse;

      return {
        policies: rpcData.policies || [],
        commissions: rpcData.commissions || [],
        allPolicies: rpcData.all_policies || [],
        allCommissions: rpcData.all_commissions || [],
        agentTargets: rpcData.agent_targets || [],
        carriers: rpcData.carriers || [],
        clients: rpcData.clients || [],
        agentProfiles: rpcData.agent_profiles || [],
      };
    } catch (error) {
      logger.error(
        'TeamAnalyticsService.getTeamAnalyticsData',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Calculate agent performance metrics for segmentation
   */
  calculateAgentPerformance(
    rawData: TeamAnalyticsRawData,
    dateFilteredPolicies?: TeamPolicyRow[],
    dateFilteredCommissions?: TeamCommissionRow[]
  ): AgentPerformanceData[] {
    const policies = dateFilteredPolicies || rawData.policies;
    const commissions = dateFilteredCommissions || rawData.commissions;
    const allPolicies = rawData.allPolicies;

    // Group policies and commissions by user
    const policyByUser = new Map<string, TeamPolicyRow[]>();
    const allPolicyByUser = new Map<string, TeamPolicyRow[]>();
    const commissionByUser = new Map<string, TeamCommissionRow[]>();

    policies.forEach(p => {
      const existing = policyByUser.get(p.user_id) || [];
      existing.push(p);
      policyByUser.set(p.user_id, existing);
    });

    allPolicies.forEach(p => {
      const existing = allPolicyByUser.get(p.user_id) || [];
      existing.push(p);
      allPolicyByUser.set(p.user_id, existing);
    });

    commissions.forEach(c => {
      const existing = commissionByUser.get(c.user_id) || [];
      existing.push(c);
      commissionByUser.set(c.user_id, existing);
    });

    // Calculate metrics for each agent
    const agentMetrics: AgentPerformanceData[] = rawData.agentProfiles.map(agent => {
      const agentPolicies = policyByUser.get(agent.id) || [];
      const agentAllPolicies = allPolicyByUser.get(agent.id) || [];
      const agentCommissions = commissionByUser.get(agent.id) || [];

      const totalAP = agentPolicies.reduce((sum, p) => sum + (p.annual_premium || 0), 0);
      const policyCount = agentPolicies.length;
      const avgPremium = policyCount > 0 ? totalAP / policyCount : 0;

      // Status counts from all policies (for persistency)
      const activePolicies = agentAllPolicies.filter(p => p.status === 'active').length;
      const lapsedPolicies = agentAllPolicies.filter(p => p.status === 'lapsed').length;
      const cancelledPolicies = agentAllPolicies.filter(p => p.status === 'cancelled').length;
      const totalAllPolicies = agentAllPolicies.length;
      const persistencyRate = totalAllPolicies > 0
        ? (activePolicies / totalAllPolicies) * 100
        : 100;

      const commissionEarned = agentCommissions.reduce(
        (sum, c) => sum + (c.earned_amount || 0),
        0
      );

      const agentName = [agent.first_name, agent.last_name].filter(Boolean).join(' ') || agent.email;

      return {
        agentId: agent.id,
        agentName,
        agentEmail: agent.email,
        contractLevel: agent.contract_level || 100,
        totalAP,
        policyCount,
        avgPremium,
        activePolicies,
        lapsedPolicies,
        cancelledPolicies,
        persistencyRate,
        commissionEarned,
      };
    });

    // Sort by total AP descending
    return agentMetrics.sort((a, b) => b.totalAP - a.totalAP);
  }

  /**
   * Segment agents by performance tier (Pareto principle)
   */
  segmentAgents(agentMetrics: AgentPerformanceData[]): AgentSegmentationSummary {
    if (agentMetrics.length === 0) {
      const emptySegment: AgentSegment = {
        tier: 'top_performer',
        agents: [],
        totalAP: 0,
        avgAP: 0,
        policyCount: 0,
        agentCount: 0,
      };
      return {
        topPerformers: { ...emptySegment, tier: 'top_performer' },
        solidPerformers: { ...emptySegment, tier: 'solid_performer' },
        needsAttention: { ...emptySegment, tier: 'needs_attention' },
        totalAgents: 0,
        totalTeamAP: 0,
        avgAgentAP: 0,
      };
    }

    // Sorted by AP descending
    const sorted = [...agentMetrics].sort((a, b) => b.totalAP - a.totalAP);
    const totalAgents = sorted.length;

    // Top 20% = top performers
    // Next 30% = solid performers
    // Bottom 50% = needs attention
    const topThreshold = Math.ceil(totalAgents * 0.2);
    const solidThreshold = Math.ceil(totalAgents * 0.5);

    const topPerformersAgents = sorted.slice(0, topThreshold);
    const solidPerformersAgents = sorted.slice(topThreshold, solidThreshold);
    const needsAttentionAgents = sorted.slice(solidThreshold);

    const createSegment = (
      agents: AgentPerformanceData[],
      tier: 'top_performer' | 'solid_performer' | 'needs_attention'
    ): AgentSegment => {
      const totalAP = agents.reduce((sum, a) => sum + a.totalAP, 0);
      const policyCount = agents.reduce((sum, a) => sum + a.policyCount, 0);
      return {
        tier,
        agents,
        totalAP,
        avgAP: agents.length > 0 ? totalAP / agents.length : 0,
        policyCount,
        agentCount: agents.length,
      };
    };

    const totalTeamAP = sorted.reduce((sum, a) => sum + a.totalAP, 0);

    return {
      topPerformers: createSegment(topPerformersAgents, 'top_performer'),
      solidPerformers: createSegment(solidPerformersAgents, 'solid_performer'),
      needsAttention: createSegment(needsAttentionAgents, 'needs_attention'),
      totalAgents,
      totalTeamAP,
      avgAgentAP: totalAgents > 0 ? totalTeamAP / totalAgents : 0,
    };
  }

  /**
   * Calculate team game plan metrics
   */
  calculateTeamGamePlan(
    rawData: TeamAnalyticsRawData,
    agentMetrics: AgentPerformanceData[]
  ): TeamGamePlanMetrics {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Calculate days remaining
    const daysRemainingInMonth = Math.max(
      1,
      Math.ceil((monthEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    );
    const monthsRemainingInYear = 12 - (now.getMonth() + 1);
    const currentMonth = now.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    // Aggregate team targets
    let teamMonthlyTarget = 0;
    let teamYearlyTarget = 0;
    let agentsWithTargets = 0;

    rawData.agentTargets.forEach(target => {
      if (target.monthly_income_target) {
        teamMonthlyTarget += target.monthly_income_target;
        agentsWithTargets++;
      }
      if (target.annual_income_target) {
        teamYearlyTarget += target.annual_income_target;
      }
    });

    // If no targets, use defaults
    if (teamMonthlyTarget === 0) {
      teamMonthlyTarget = agentMetrics.length * 10000; // $10k default per agent
    }
    if (teamYearlyTarget === 0) {
      teamYearlyTarget = agentMetrics.length * 120000; // $120k default per agent
    }

    // Calculate MTD and YTD actuals from commissions
    const mtdCommissions = rawData.allCommissions.filter(c => {
      if (c.payment_status !== 'paid') return false;
      const date = c.payment_date ? new Date(c.payment_date) : new Date(c.created_at);
      return date >= monthStart && date <= now;
    });

    const ytdCommissions = rawData.allCommissions.filter(c => {
      if (c.payment_status !== 'paid') return false;
      const date = c.payment_date ? new Date(c.payment_date) : new Date(c.created_at);
      return date >= yearStart && date <= now;
    });

    const teamMTDActual = mtdCommissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
    const teamYTDActual = ytdCommissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    // Calculate gaps and progress
    const teamMonthlyGap = Math.max(0, teamMonthlyTarget - teamMTDActual);
    const teamYearlyGap = Math.max(0, teamYearlyTarget - teamYTDActual);

    const teamMonthlyProgressPercent = teamMonthlyTarget > 0
      ? (teamMTDActual / teamMonthlyTarget) * 100
      : 0;
    const teamYearlyProgressPercent = teamYearlyTarget > 0
      ? (teamYTDActual / teamYearlyTarget) * 100
      : 0;

    // Calculate expected progress
    const daysElapsed = now.getDate();
    const totalDaysInMonth = monthEnd.getDate();
    const expectedMonthlyProgress = (daysElapsed / totalDaysInMonth) * 100;

    // Determine who's on track vs behind
    let agentsOnTrack = 0;
    let agentsBehind = 0;

    agentMetrics.forEach(agent => {
      const agentTarget = rawData.agentTargets.find(t => t.user_id === agent.agentId);
      if (agentTarget?.monthly_income_target) {
        const progress = (agent.commissionEarned / agentTarget.monthly_income_target) * 100;
        if (progress >= expectedMonthlyProgress * 0.75) {
          agentsOnTrack++;
        } else {
          agentsBehind++;
        }
      } else {
        // No target = assume on track
        agentsOnTrack++;
      }
    });

    // Top 3 contributors and bottom 3 underperformers
    const sortedByAP = [...agentMetrics].sort((a, b) => b.totalAP - a.totalAP);
    const topContributors = sortedByAP.slice(0, 3);
    const underperformers = sortedByAP.slice(-3).reverse();

    return {
      teamMonthlyTarget,
      teamMTDActual,
      teamMonthlyGap,
      teamMonthlyProgressPercent,
      teamYearlyTarget,
      teamYTDActual,
      teamYearlyGap,
      teamYearlyProgressPercent,
      totalAgents: agentMetrics.length,
      agentsWithTargets,
      agentsOnTrack,
      agentsBehind,
      topContributors,
      underperformers,
      daysRemainingInMonth,
      monthsRemainingInYear,
      currentMonth,
    };
  }

  /**
   * Calculate team pace metrics
   */
  calculateTeamPace(
    rawData: TeamAnalyticsRawData,
    startDate: Date,
    endDate: Date,
    timePeriod: string
  ): TeamPaceMetrics {
    const now = new Date();

    // Filter policies within date range
    const periodPolicies = rawData.policies.filter(p => {
      const effectiveDate = new Date(p.effective_date);
      return effectiveDate >= startDate && effectiveDate <= endDate;
    });

    // Calculate metrics
    const totalAPWritten = periodPolicies.reduce((sum, p) => sum + (p.annual_premium || 0), 0);
    const totalPoliciesWritten = periodPolicies.length;
    const avgPremiumPerPolicy = totalPoliciesWritten > 0
      ? totalAPWritten / totalPoliciesWritten
      : 0;

    // Calculate time elapsed and remaining
    const msElapsed = now.getTime() - startDate.getTime();
    const daysElapsed = Math.max(1, Math.ceil(msElapsed / (24 * 60 * 60 * 1000)));

    const msRemaining = endDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.floor(msRemaining / (24 * 60 * 60 * 1000)));

    const totalDaysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

    // Calculate pace
    const currentAPPace = totalAPWritten / daysElapsed;
    const projectedAPTotal = currentAPPace * totalDaysInPeriod;
    const projectedPolicyTotal = Math.round((totalPoliciesWritten / daysElapsed) * totalDaysInPeriod);

    // Calculate target from agent targets
    const teamAPTarget = rawData.agentTargets.reduce((sum, t) => {
      if (timePeriod.includes('year') || timePeriod === 'YTD') {
        return sum + (t.annual_income_target || 0);
      }
      return sum + (t.monthly_income_target || 0);
    }, 0);

    const surplusDeficit = totalAPWritten - teamAPTarget;
    const isProfitable = surplusDeficit >= 0;

    return {
      totalAPWritten,
      totalPoliciesWritten,
      avgPremiumPerPolicy,
      projectedAPTotal,
      currentAPPace,
      projectedPolicyTotal,
      teamAPTarget,
      surplusDeficit,
      isProfitable,
      daysElapsed,
      daysRemaining,
      timePeriod,
    };
  }

  /**
   * Calculate team policy status breakdown
   */
  calculatePolicyStatusBreakdown(rawData: TeamAnalyticsRawData): TeamPolicyStatusBreakdown {
    const allPolicies = rawData.allPolicies;

    const active = allPolicies.filter(p => p.status === 'active');
    const pending = allPolicies.filter(p => p.status === 'pending');
    const lapsed = allPolicies.filter(p => p.status === 'lapsed');
    const cancelled = allPolicies.filter(p => p.status === 'cancelled');

    const sumPremium = (policies: TeamPolicyRow[]) =>
      policies.reduce((sum, p) => sum + (p.annual_premium || 0), 0);

    const totalCount = allPolicies.length;
    const activeCount = active.length;
    const persistencyRate = totalCount > 0 ? (activeCount / totalCount) * 100 : 100;

    return {
      active: { count: active.length, premium: sumPremium(active) },
      pending: { count: pending.length, premium: sumPremium(pending) },
      lapsed: { count: lapsed.length, premium: sumPremium(lapsed) },
      cancelled: { count: cancelled.length, premium: sumPremium(cancelled) },
      total: { count: totalCount, premium: sumPremium(allPolicies) },
      persistencyRate,
    };
  }

  /**
   * Calculate geographic distribution
   */
  calculateGeographicBreakdown(rawData: TeamAnalyticsRawData): TeamGeographicBreakdown[] {
    // Create client lookup
    const clientMap = new Map<string, TeamClientRow>();
    rawData.clients.forEach(c => clientMap.set(c.id, c));

    // Group by state
    const stateMap = new Map<string, { count: number; premium: number }>();

    rawData.allPolicies.forEach(policy => {
      const client = policy.client_id ? clientMap.get(policy.client_id) : null;
      const state = client?.state || 'Unknown';

      const existing = stateMap.get(state) || { count: 0, premium: 0 };
      existing.count++;
      existing.premium += policy.annual_premium || 0;
      stateMap.set(state, existing);
    });

    // Convert to array and calculate percentages
    const totalPolicies = rawData.allPolicies.length;
    const breakdown: TeamGeographicBreakdown[] = [];

    stateMap.forEach((data, state) => {
      breakdown.push({
        state,
        policyCount: data.count,
        totalPremium: data.premium,
        percentage: totalPolicies > 0 ? (data.count / totalPolicies) * 100 : 0,
      });
    });

    // Sort by policy count descending
    return breakdown.sort((a, b) => b.policyCount - a.policyCount);
  }

  /**
   * Calculate carrier breakdown
   */
  calculateCarrierBreakdown(rawData: TeamAnalyticsRawData): TeamCarrierBreakdown[] {
    // Create carrier lookup
    const carrierMap = new Map<string, TeamCarrierRow>();
    rawData.carriers.forEach(c => carrierMap.set(c.id, c));

    // Create commission lookup by policy
    const commissionByPolicy = new Map<string, number>();
    rawData.allCommissions.forEach(c => {
      if (c.policy_id) {
        const existing = commissionByPolicy.get(c.policy_id) || 0;
        commissionByPolicy.set(c.policy_id, existing + (c.commission_amount || 0));
      }
    });

    // Group by carrier and product
    const carrierData = new Map<string, {
      carrierId: string;
      carrierName: string;
      policyCount: number;
      totalPremium: number;
      totalCommission: number;
      products: Map<string, {
        name: string;
        policyCount: number;
        totalPremium: number;
        totalCommission: number;
      }>;
    }>();

    rawData.allPolicies.forEach(policy => {
      const carrierId = policy.carrier_id || 'unknown';
      const carrier = carrierMap.get(carrierId);
      const carrierName = carrier?.name || 'Unknown Carrier';
      const productName = policy.product || 'Unknown Product';
      const commission = policy.id ? (commissionByPolicy.get(policy.id) || 0) : 0;

      if (!carrierData.has(carrierId)) {
        carrierData.set(carrierId, {
          carrierId,
          carrierName,
          policyCount: 0,
          totalPremium: 0,
          totalCommission: 0,
          products: new Map(),
        });
      }

      const carrierEntry = carrierData.get(carrierId)!;
      carrierEntry.policyCount++;
      carrierEntry.totalPremium += policy.annual_premium || 0;
      carrierEntry.totalCommission += commission;

      if (!carrierEntry.products.has(productName)) {
        carrierEntry.products.set(productName, {
          name: productName,
          policyCount: 0,
          totalPremium: 0,
          totalCommission: 0,
        });
      }

      const productEntry = carrierEntry.products.get(productName)!;
      productEntry.policyCount++;
      productEntry.totalPremium += policy.annual_premium || 0;
      productEntry.totalCommission += commission;
    });

    // Convert to array
    const breakdown: TeamCarrierBreakdown[] = [];
    carrierData.forEach(data => {
      const products = Array.from(data.products.values()).map(p => ({
        ...p,
        avgCommissionRate: p.totalPremium > 0 ? (p.totalCommission / p.totalPremium) * 100 : 0,
      }));

      breakdown.push({
        carrierId: data.carrierId,
        carrierName: data.carrierName,
        policyCount: data.policyCount,
        totalPremium: data.totalPremium,
        totalCommission: data.totalCommission,
        avgCommissionRate: data.totalPremium > 0
          ? (data.totalCommission / data.totalPremium) * 100
          : 0,
        products: products.sort((a, b) => b.totalPremium - a.totalPremium),
      });
    });

    // Sort by total premium descending
    return breakdown.sort((a, b) => b.totalPremium - a.totalPremium);
  }
}

export const teamAnalyticsService = new TeamAnalyticsService();
