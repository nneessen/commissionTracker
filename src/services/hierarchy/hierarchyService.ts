// src/services/hierarchy/hierarchyService.ts
// Service layer for hierarchy management - handles business logic for agency hierarchy

import { supabase } from "../base/supabase";
import { logger } from "../base/logger";
import { HierarchyRepository } from "./HierarchyRepository";
import {
  PolicyRepository,
  PolicyMetricRow,
} from "../policies/PolicyRepository";
import {
  CommissionRepository,
  CommissionMetricRow,
} from "../commissions/CommissionRepository";
import {
  OverrideRepository,
  OverrideMetricRow,
} from "../overrides/OverrideRepository";
import type {
  HierarchyNode,
  UserProfile,
  DownlinePerformance,
  HierarchyChangeRequest,
  HierarchyValidationResult,
  HierarchyStats,
} from "../../types/hierarchy.types";
import { NotFoundError, ValidationError } from "../../errors/ServiceErrors";

/**
 * Service layer for hierarchy operations
 * Handles all agency hierarchy business logic
 *
 * Uses domain-specific repositories:
 * - HierarchyRepository: user_profiles hierarchy queries
 * - PolicyRepository: policies table queries
 * - CommissionRepository: commissions table queries
 * - OverrideRepository: override_commissions table queries
 */
class HierarchyService {
  private hierarchyRepo: HierarchyRepository;
  private policyRepo: PolicyRepository;
  private commissionRepo: CommissionRepository;
  private overrideRepo: OverrideRepository;

  constructor() {
    this.hierarchyRepo = new HierarchyRepository();
    this.policyRepo = new PolicyRepository();
    this.commissionRepo = new CommissionRepository();
    this.overrideRepo = new OverrideRepository();
  }

  /**
   * Get the current user's hierarchy tree (all downlines)
   * Returns a tree structure with nested children
   */
  async getMyHierarchyTree(): Promise<HierarchyNode[]> {
    try {
      // Get current user (auth stays in service layer)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Not authenticated");
      }

      // Get current user's profile with hierarchy info
      const myProfile = await this.hierarchyRepo.findById(user.id);
      if (!myProfile) {
        throw new NotFoundError("User profile", user.id);
      }

      // Get all downlines using hierarchy_path
      const downlines = await this.hierarchyRepo.findDownlinesByHierarchyPath(
        myProfile.hierarchy_path || myProfile.id,
      );

      // Get override earnings for all agents in tree
      const allAgentIds = [myProfile.id, ...downlines.map((d) => d.id)];
      const overrides = await this.overrideRepo.findByBaseAgentIds(allAgentIds);

      // Calculate total override earnings per agent
      const overridesByAgent = this.aggregateOverridesByAgent(overrides);

      // Build tree structure
      const allNodes: UserProfile[] = [myProfile, ...downlines];
      return this.buildTree(allNodes, myProfile.id, overridesByAgent);
    } catch (error) {
      logger.error(
        "HierarchyService.getMyHierarchyTree",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Get all downlines (flat list, not tree)
   * Useful for dropdowns, tables, etc.
   */
  async getMyDownlines(): Promise<UserProfile[]> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Not authenticated");
      }

      const myProfile = await this.hierarchyRepo.findById(user.id);
      if (!myProfile) {
        throw new NotFoundError("User profile", user.id);
      }

      return this.hierarchyRepo.findDownlinesByHierarchyPath(
        myProfile.hierarchy_path || myProfile.id,
      );
    } catch (error) {
      logger.error(
        "HierarchyService.getMyDownlines",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Get upline chain for current user (path from root to current user)
   */
  async getMyUplineChain(): Promise<UserProfile[]> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Not authenticated");
      }

      const myProfile = await this.hierarchyRepo.findById(user.id);
      if (!myProfile) {
        throw new NotFoundError("User profile", user.id);
      }

      // Parse hierarchy_path to get all upline IDs
      const hierarchyPath = myProfile.hierarchy_path || myProfile.id;
      const uplineIds = hierarchyPath
        .split(".")
        .filter((id: string) => id !== user.id);

      if (uplineIds.length === 0) {
        return []; // Root agent, no uplines
      }

      return this.hierarchyRepo.findByIds(uplineIds);
    } catch (error) {
      logger.error(
        "HierarchyService.getMyUplineChain",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Get performance metrics for a specific downline
   */
  async getDownlinePerformance(
    downlineId: string,
  ): Promise<DownlinePerformance> {
    try {
      // Verify downline exists
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Not authenticated");
      }

      const downline = await this.hierarchyRepo.findById(downlineId);
      if (!downline) {
        throw new NotFoundError("Downline", downlineId);
      }

      // Get policy metrics for this downline
      const policies = await this.policyRepo.findMetricsByUserIds([downlineId]);
      const policyMetrics = this.calculatePolicyMetrics(policies);

      // Get commission metrics for this downline
      const commissions = await this.commissionRepo.findMetricsByUserIds([
        downlineId,
      ]);
      const commissionMetrics = this.calculateCommissionMetrics(commissions);

      // Get override metrics (what this downline generated for uplines)
      const overrides = await this.overrideRepo.findByBaseAgentId(downlineId);
      const overrideMetrics = this.calculateOverrideMetrics(overrides);

      return {
        agent_id: downlineId,
        agent_email: downline.email,
        hierarchy_depth: downline.hierarchy_depth ?? 0,
        policies_written: policyMetrics.total,
        policies_active: policyMetrics.active,
        policies_lapsed: policyMetrics.lapsed,
        policies_cancelled: policyMetrics.cancelled,
        total_premium: policyMetrics.totalPremium,
        avg_premium:
          policyMetrics.total > 0
            ? policyMetrics.totalPremium / policyMetrics.total
            : 0,
        total_base_commission: commissionMetrics.total,
        total_commission_earned: commissionMetrics.earned,
        total_commission_paid: commissionMetrics.paid,
        total_overrides_generated: overrideMetrics.total,
        pending_overrides_generated: overrideMetrics.pending,
        earned_overrides_generated: overrideMetrics.earned,
        paid_overrides_generated: overrideMetrics.paid,
        persistency_rate:
          policyMetrics.total > 0
            ? (policyMetrics.active / policyMetrics.total) * 100
            : 0,
      };
    } catch (error) {
      logger.error(
        "HierarchyService.getDownlinePerformance",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Update an agent's upline (admin only)
   * Validates against circular references and comp level hierarchy
   */
  async updateAgentHierarchy(
    request: HierarchyChangeRequest,
  ): Promise<UserProfile> {
    try {
      // Validate request
      const validation = await this.validateHierarchyChange(request);
      if (!validation.valid) {
        throw new ValidationError(
          "Invalid hierarchy change",
          validation.errors.map((err) => ({
            field: "upline_id",
            message: err,
            value: request.new_upline_id,
          })),
        );
      }

      // Update upline_id (triggers will handle hierarchy_path and circular reference checks)
      const data = await this.hierarchyRepo.updateUpline(
        request.agent_id,
        request.new_upline_id,
      );

      return data;
    } catch (error) {
      logger.error(
        "HierarchyService.updateAgentHierarchy",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Validate a proposed hierarchy change
   * Checks for circular references and comp level constraints
   */
  async validateHierarchyChange(
    request: HierarchyChangeRequest,
  ): Promise<HierarchyValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get agent profile
      const agent = await this.hierarchyRepo.findById(request.agent_id);
      if (!agent) {
        errors.push("Agent not found");
        return { valid: false, errors, warnings };
      }

      // If setting upline to null, it's valid (becoming root agent)
      if (request.new_upline_id === null) {
        return { valid: true, errors: [], warnings: [] };
      }

      // Get proposed upline profile
      const upline = await this.hierarchyRepo.findById(request.new_upline_id);
      if (!upline) {
        errors.push("Proposed upline not found");
        return { valid: false, errors, warnings };
      }

      // Check if proposed upline is in agent's downline tree (would create cycle)
      if ((upline.hierarchy_path || "").includes(agent.id)) {
        errors.push(
          "Cannot set upline to one of your downlines (would create circular reference)",
        );
      }

      // Note: contractCompLevel is stored in auth.users.rawuser_meta_data, not user_profiles
      // Database trigger will enforce this
    } catch (error) {
      logger.error(
        "HierarchyService.validateHierarchyChange",
        error instanceof Error ? error : new Error(String(error)),
      );
      errors.push(
        "Validation failed: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get performance metrics for ALL downlines at once
   * More efficient than calling getDownlinePerformance() for each agent
   */
  async getAllDownlinePerformance(): Promise<DownlinePerformance[]> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Not authenticated");
      }

      const downlines = await this.getMyDownlines();

      if (downlines.length === 0) {
        return [];
      }

      const downlineIds = downlines.map((d) => d.id);

      // Batch fetch all data
      const [policies, commissions, overrides] = await Promise.all([
        this.policyRepo.findMetricsByUserIds(downlineIds),
        this.commissionRepo.findMetricsByUserIds(downlineIds),
        this.overrideRepo.findByBaseAgentIds(downlineIds),
      ]);

      // Aggregate data by downline
      return downlines.map((downline) => {
        const downlinePolicies = policies.filter(
          (p) => p.user_id === downline.id,
        );
        const downlineCommissions = commissions.filter(
          (c) => c.user_id === downline.id,
        );
        const downlineOverrides = overrides.filter(
          (o) => o.base_agent_id === downline.id,
        );

        const policyMetrics = this.calculatePolicyMetrics(downlinePolicies);
        const commissionMetrics =
          this.calculateCommissionMetrics(downlineCommissions);
        const overrideMetrics =
          this.calculateOverrideMetrics(downlineOverrides);

        return {
          agent_id: downline.id,
          agent_email: downline.email,
          hierarchy_depth: downline.hierarchy_depth ?? 0,
          policies_written: policyMetrics.total,
          policies_active: policyMetrics.active,
          policies_lapsed: policyMetrics.lapsed,
          policies_cancelled: policyMetrics.cancelled,
          total_premium: policyMetrics.totalPremium,
          avg_premium:
            policyMetrics.total > 0
              ? policyMetrics.totalPremium / policyMetrics.total
              : 0,
          total_base_commission: commissionMetrics.total,
          total_commission_earned: commissionMetrics.earned,
          total_commission_paid: commissionMetrics.paid,
          total_overrides_generated: overrideMetrics.total,
          pending_overrides_generated: overrideMetrics.pending,
          earned_overrides_generated: overrideMetrics.earned,
          paid_overrides_generated: overrideMetrics.paid,
          persistency_rate:
            policyMetrics.total > 0
              ? (policyMetrics.active / policyMetrics.total) * 100
              : 0,
        };
      });
    } catch (error) {
      logger.error(
        "HierarchyService.getAllDownlinePerformance",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Get hierarchy statistics for current user
   * CRITICAL FIX: Include team leader's own data in team metrics
   */
  async getMyHierarchyStats(): Promise<HierarchyStats> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        logger.error(
          "HierarchyService.getMyHierarchyStats",
          new Error("Not authenticated"),
        );
        throw new Error("Not authenticated");
      }

      // Get current user's profile to verify they exist
      const myProfile = await this.hierarchyRepo.findById(user.id);
      if (!myProfile) {
        logger.error(
          "HierarchyService.getMyHierarchyStats",
          new Error(`Profile not found for user ${user.id}`),
        );
        throw new NotFoundError("User profile", user.id);
      }

      const downlines = await this.getMyDownlines();

      // Get override income MTD
      const now = new Date();
      const mtdStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString();

      // Get overrides where current user is EITHER the override_agent OR the base_agent
      const mtdOverrides = await this.overrideRepo.findForAgentInRange(
        myProfile.id,
        mtdStart,
      );

      // Calculate MTD income (only where user is the override_agent receiving the income)
      const mtdIncome = mtdOverrides
        .filter((o) => o.override_agent_id === myProfile.id)
        .reduce(
          (sum, o) =>
            sum + parseFloat(String(o.override_commission_amount) || "0"),
          0,
        );

      // Get override income YTD
      const ytdStart = new Date(now.getFullYear(), 0, 1).toISOString();

      const ytdOverrides = await this.overrideRepo.findByOverrideAgentId(
        myProfile.id,
        ytdStart,
      );

      const ytdIncome = ytdOverrides.reduce(
        (sum, o) =>
          sum + parseFloat(String(o.override_commission_amount) || "0"),
        0,
      );

      // Calculate direct downlines correctly - checking upline_id directly
      const directDownlines = downlines.filter(
        (d) => d.upline_id === myProfile.id,
      );

      const result = {
        total_agents: downlines.length + 1, // including self
        total_downlines: downlines.length,
        direct_downlines: directDownlines.length,
        max_depth:
          downlines.length > 0
            ? Math.max(...downlines.map((d) => d.hierarchy_depth || 0))
            : 0,
        total_override_income_mtd: mtdIncome,
        total_override_income_ytd: ytdIncome,
      };

      return result;
    } catch (error) {
      logger.error(
        "HierarchyService.getMyHierarchyStats",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Get comprehensive details for a specific agent
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- hierarchy node can have various shapes
  async getAgentDetails(agentId: string): Promise<any> {
    try {
      // Validate agentId
      if (!agentId) {
        logger.error(
          "HierarchyService.getAgentDetails",
          new Error("AgentId is required"),
        );
        throw new ValidationError("AgentId is required", [
          { field: "agentId", message: "Required", value: agentId },
        ]);
      }

      // Get agent profile
      const agent = await this.hierarchyRepo.findById(agentId);
      if (!agent) {
        logger.warn("Agent not found", { agentId }, "HierarchyService");
        throw new NotFoundError("Agent", agentId);
      }

      // Get performance metrics
      const policies = await this.policyRepo.findWithRelationsByUserId(
        agent.id,
      );

      const policyMetrics = policies.reduce(
        (acc, policy) => {
          acc.totalPolicies++;
          if (policy.status === "active") {
            acc.activePolicies++;
            acc.totalPremium += parseFloat(
              String(policy.annual_premium) || "0",
            );
          }
          return acc;
        },
        { totalPolicies: 0, activePolicies: 0, totalPremium: 0 },
      );

      // Get recent activity
      const recentPolicies = await this.policyRepo.findRecentByUserId(
        agent.id,
        5,
      );

      const recentActivity = recentPolicies.map((p) => ({
        type: "policy",
        title: `New ${p.product || "Unknown"} policy`,
        description: `Policy #${p.policyNumber || "N/A"} - ${p.carrierId || "Unknown"}`,
        timestamp: p.createdAt || new Date().toISOString(),
      }));

      // Get upline info
      let uplineEmail = null;
      if (agent.upline_id) {
        const upline = await this.hierarchyRepo.findById(agent.upline_id);
        uplineEmail = upline?.email;
      }

      // Calculate performance score (simple example)
      const persistencyRate =
        policyMetrics.totalPolicies > 0
          ? (policyMetrics.activePolicies / policyMetrics.totalPolicies) * 100
          : 0;
      const performanceScore = Math.min(100, Math.round(persistencyRate * 1.1));

      return {
        ...agent,
        totalPolicies: policyMetrics.totalPolicies,
        activePolicies: policyMetrics.activePolicies,
        totalPremium: policyMetrics.totalPremium,
        avgPremium:
          policyMetrics.activePolicies > 0
            ? policyMetrics.totalPremium / policyMetrics.activePolicies
            : 0,
        persistencyRate,
        performanceScore,
        uplineEmail,
        recentActivity,
        joinDate: agent.created_at || new Date().toISOString(),
        isActive: true,
        overridesGenerated: 0, // Will be calculated from override_commissions
      };
    } catch (error) {
      logger.error(
        "HierarchyService.getAgentDetails",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Get all policies for a specific agent
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase response type
  async getAgentPolicies(agentId: string): Promise<any> {
    try {
      const policies = await this.policyRepo.findWithRelationsByUserId(agentId);

      const active = policies.filter((p) => p.status === "active").length;
      const total = policies.length;

      return {
        total,
        active,
        policies: policies.map((p) => ({
          id: p.id,
          policyNumber: p.policy_number,
          clientName: p.client?.name || "Unknown",
          product: p.product,
          carrier: p.carrier?.name || p.carrier_id,
          annualPremium: p.annual_premium,
          status: p.status,
          issueDate:
            p.effective_date || p.created_at || new Date().toISOString(),
        })),
      };
    } catch (error) {
      logger.error(
        "HierarchyService.getAgentPolicies",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Get commission data for a specific agent
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase response type
  async getAgentCommissions(agentId: string): Promise<any> {
    try {
      const commissions =
        await this.commissionRepo.findWithPolicyByUserId(agentId);

      const metrics = commissions.reduce(
        (acc, comm) => {
          const amount = parseFloat(String(comm.amount) || "0");
          const earned = parseFloat(String(comm.earned_amount) || "0");
          const chargeback = parseFloat(String(comm.chargeback_amount) || "0");
          const advanceMonths = comm.advance_months || 0;
          // Calculate advance amount: if advance_months > 0, the full amount was advanced
          const advance = advanceMonths > 0 ? amount : 0;

          acc.totalEarned += earned;
          if (comm.status === "pending") acc.pending += amount;
          if (comm.status === "paid") acc.paid += amount;
          acc.advances += advance;
          acc.chargebacks += chargeback;

          return acc;
        },
        { totalEarned: 0, pending: 0, paid: 0, advances: 0, chargebacks: 0 },
      );

      // Calculate unearned = advances - totalEarned
      const unearned = Math.max(0, metrics.advances - metrics.totalEarned);

      return {
        ...metrics,
        unearned,
        recent: commissions.slice(0, 10).map((c) => ({
          id: c.id,
          date: c.created_at || new Date().toISOString(),
          policyNumber: c.policy?.policy_number || "N/A",
          type: c.type,
          amount: parseFloat(String(c.amount) || "0"),
          earnedAmount: parseFloat(String(c.earned_amount) || "0"),
          unearnedAmount: parseFloat(String(c.unearned_amount) || "0"),
          monthsPaid: c.months_paid || 0,
          advanceMonths: c.advance_months || 9,
          status: c.status,
        })),
      };
    } catch (error) {
      logger.error(
        "HierarchyService.getAgentCommissions",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Get override commission data for a specific agent
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase response type
  async getAgentOverrides(agentId: string): Promise<any> {
    try {
      const now = new Date();
      const mtdStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString();
      const ytdStart = new Date(now.getFullYear(), 0, 1).toISOString();

      // Get MTD and YTD overrides in parallel
      const [mtdOverrides, ytdOverrides] = await Promise.all([
        this.overrideRepo.findByBaseAgentIdInRange(agentId, mtdStart),
        this.overrideRepo.findByBaseAgentIdInRange(agentId, ytdStart),
      ]);

      const mtd = mtdOverrides.reduce(
        (sum, o) =>
          sum + parseFloat(String(o.override_commission_amount) || "0"),
        0,
      );

      const ytd = ytdOverrides.reduce(
        (sum, o) =>
          sum + parseFloat(String(o.override_commission_amount) || "0"),
        0,
      );

      return { mtd, ytd };
    } catch (error) {
      logger.error(
        "HierarchyService.getAgentOverrides",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Get an agent's direct team (their downlines) with metrics
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase response type
  async getAgentTeam(agentId: string): Promise<any> {
    try {
      // Get direct downlines
      const directReports =
        await this.hierarchyRepo.findDirectReportsByUplineId(agentId);

      if (directReports.length === 0) {
        return {
          directReports: [],
          totalMembers: 0,
          totalPremium: 0,
          totalPolicies: 0,
        };
      }

      const reportIds = directReports.map((r) => r.id);

      // Batch fetch policies and commissions for all direct reports
      const [policies, commissions] = await Promise.all([
        this.policyRepo.findMetricsByUserIds(reportIds),
        this.commissionRepo.findMetricsByUserIds(reportIds),
      ]);

      // Aggregate metrics per team member
      const teamMembers = directReports.map((member) => {
        const memberPolicies = policies.filter((p) => p.user_id === member.id);
        const activePolicies = memberPolicies.filter(
          (p) => p.status === "active",
        );
        const totalPremium = activePolicies.reduce(
          (sum, p) => sum + parseFloat(String(p.annual_premium) || "0"),
          0,
        );

        const memberCommissions = commissions.filter(
          (c) => c.user_id === member.id,
        );
        const totalCommissions = memberCommissions.reduce(
          (sum, c) => sum + parseFloat(String(c.amount) || "0"),
          0,
        );

        return {
          id: member.id,
          email: member.email,
          name:
            member.first_name && member.last_name
              ? `${member.first_name} ${member.last_name}`
              : member.email,
          contractLevel: member.contract_level || 100,
          policies: activePolicies.length,
          premium: totalPremium,
          commissions: totalCommissions,
        };
      });

      // Calculate totals
      const totalPremium = teamMembers.reduce((sum, m) => sum + m.premium, 0);
      const totalPolicies = teamMembers.reduce((sum, m) => sum + m.policies, 0);

      return {
        directReports: teamMembers,
        totalMembers: teamMembers.length,
        totalPremium,
        totalPolicies,
      };
    } catch (error) {
      logger.error(
        "HierarchyService.getAgentTeam",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * @deprecated Use getAgentTeam instead
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getTeamComparison(agentId: string): Promise<any> {
    return this.getAgentTeam(agentId);
  }

  // -------------------------------------------------------------------------
  // PRIVATE HELPERS
  // -------------------------------------------------------------------------

  /**
   * Aggregate override amounts by agent ID
   */
  private aggregateOverridesByAgent(
    overrides: OverrideMetricRow[],
  ): Record<string, number> {
    return overrides.reduce(
      (acc, o) => {
        const agentId = o.base_agent_id;
        const amount = parseFloat(String(o.override_commission_amount) || "0");
        acc[agentId] = (acc[agentId] || 0) + amount;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Calculate policy metrics from policy rows
   */
  private calculatePolicyMetrics(policies: PolicyMetricRow[]): {
    total: number;
    active: number;
    lapsed: number;
    cancelled: number;
    totalPremium: number;
  } {
    return policies.reduce(
      (acc, policy) => {
        acc.total++;
        if (policy.status === "active") acc.active++;
        if (policy.status === "lapsed") acc.lapsed++;
        if (policy.status === "cancelled") acc.cancelled++;
        acc.totalPremium += parseFloat(String(policy.annual_premium) || "0");
        return acc;
      },
      { total: 0, active: 0, lapsed: 0, cancelled: 0, totalPremium: 0 },
    );
  }

  /**
   * Calculate commission metrics from commission rows
   */
  private calculateCommissionMetrics(commissions: CommissionMetricRow[]): {
    total: number;
    earned: number;
    paid: number;
  } {
    return commissions.reduce(
      (acc, comm) => {
        const amount = parseFloat(String(comm.amount) || "0");
        const earned = parseFloat(String(comm.earned_amount) || "0");
        acc.total += amount;
        if (comm.status === "earned") acc.earned += earned;
        if (comm.status === "paid") acc.paid += amount;
        return acc;
      },
      { total: 0, earned: 0, paid: 0 },
    );
  }

  /**
   * Calculate override metrics from override rows
   */
  private calculateOverrideMetrics(overrides: OverrideMetricRow[]): {
    total: number;
    pending: number;
    earned: number;
    paid: number;
  } {
    return overrides.reduce(
      (acc, override) => {
        const amount = parseFloat(
          String(override.override_commission_amount) || "0",
        );
        acc.total += amount;
        if (override.status === "pending") acc.pending += amount;
        if (override.status === "earned") acc.earned += amount;
        if (override.status === "paid") acc.paid += amount;
        return acc;
      },
      { total: 0, pending: 0, earned: 0, paid: 0 },
    );
  }

  /**
   * Build tree structure from flat list of profiles
   */
  private buildTree(
    profiles: UserProfile[],
    rootId: string,
    overridesByAgent?: Record<string, number>,
  ): HierarchyNode[] {
    const nodeMap = new Map<string, HierarchyNode>();

    // Create nodes
    profiles.forEach((profile) => {
      nodeMap.set(profile.id, {
        ...profile,
        children: [],
        downline_count: 0,
        direct_downline_count: 0,
        override_earnings: overridesByAgent?.[profile.id] || 0,
      });
    });

    // Build parent-child relationships
    const roots: HierarchyNode[] = [];

    nodeMap.forEach((node) => {
      if (node.upline_id === null || node.id === rootId) {
        roots.push(node);
      } else {
        const parent = nodeMap.get(node.upline_id);
        if (parent) {
          parent.children.push(node);
          parent.direct_downline_count++;
        }
      }
    });

    // Calculate total downline counts (recursive)
    const calculateDownlineCounts = (node: HierarchyNode): number => {
      let count = node.children.length;
      node.children.forEach((child) => {
        count += calculateDownlineCounts(child);
      });
      node.downline_count = count;
      return count;
    };

    roots.forEach(calculateDownlineCounts);

    return roots;
  }
}

// Export singleton instance
export const hierarchyService = new HierarchyService();

// Export class for testing
export { HierarchyService };
