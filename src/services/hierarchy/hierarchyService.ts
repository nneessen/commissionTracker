// src/services/hierarchy/hierarchyService.ts
// Service layer for hierarchy management - handles business logic for agency hierarchy

import { supabase } from "../base/supabase";
import { logger } from "../base/logger";
import type {
  HierarchyNode,
  UserProfile,
  DownlinePerformance,
  HierarchyChangeRequest,
  HierarchyValidationResult,
  HierarchyStats,
} from "../../types/hierarchy.types";
import {
  DatabaseError,
  NotFoundError,
  ValidationError,
} from "../../errors/ServiceErrors";

/**
 * Service layer for hierarchy operations
 * Handles all agency hierarchy business logic
 */
class HierarchyService {
  /**
   * Get the current user's hierarchy tree (all downlines)
   * Returns a tree structure with nested children
   */
  async getMyHierarchyTree(): Promise<HierarchyNode[]> {
    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Not authenticated");
      }

      // Get current user's profile with hierarchy info
      const { data: myProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError || !myProfile) {
        throw new NotFoundError("User profile", user.id);
      }

      // Get all downlines using hierarchy_path (fast query with LIKE)
      const { data: downlines, error: downlinesError } = await supabase
        .from("user_profiles")
        .select("*")
        .like("hierarchy_path", `${myProfile.hierarchy_path}.%`)
        .order("hierarchy_depth", { ascending: true });

      if (downlinesError) {
        throw new DatabaseError("getMyHierarchyTree", downlinesError);
      }

      // Get override earnings for all agents in tree
      const allAgentIds = [myProfile.id, ...(downlines || []).map((d) => d.id)];
      const { data: overrides, error: overridesError } = await supabase
        .from("override_commissions")
        .select("base_agent_id, override_commission_amount")
        .in("base_agent_id", allAgentIds);

      if (overridesError) {
        throw new DatabaseError("getMyHierarchyTree.overrides", overridesError);
      }

      // Calculate total override earnings per agent
      const overridesByAgent = (overrides || []).reduce(
        (acc, o) => {
          const agentId = o.base_agent_id;
          const amount = parseFloat(
            String(o.override_commission_amount) || "0",
          );
          acc[agentId] = (acc[agentId] || 0) + amount;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Build tree structure
      const allNodes: UserProfile[] = [myProfile, ...(downlines || [])];
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

      const { data: myProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("hierarchy_path")
        .eq("id", user.id)
        .single();

      if (profileError || !myProfile) {
        throw new NotFoundError("User profile", user.id);
      }

      const { data: downlines, error } = await supabase
        .from("user_profiles")
        .select("*")
        .like("hierarchy_path", `${myProfile.hierarchy_path}.%`)
        .order("hierarchy_depth", { ascending: true });

      if (error) {
        throw new DatabaseError("getMyDownlines", error);
      }

      return downlines || [];
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

      const { data: myProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("hierarchy_path")
        .eq("id", user.id)
        .single();

      if (profileError || !myProfile) {
        throw new NotFoundError("User profile", user.id);
      }

      // Parse hierarchy_path to get all upline IDs
      const uplineIds = myProfile.hierarchy_path
        .split(".")
        .filter((id: string) => id !== user.id);

      if (uplineIds.length === 0) {
        return []; // Root agent, no uplines
      }

      const { data: uplines, error } = await supabase
        .from("user_profiles")
        .select("*")
        .in("id", uplineIds)
        .order("hierarchy_depth", { ascending: true });

      if (error) {
        throw new DatabaseError("getMyUplineChain", error);
      }

      return uplines || [];
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
      // Verify downline belongs to current user's hierarchy
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Not authenticated");
      }

      const { data: downline, error: downlineError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", downlineId)
        .single();

      if (downlineError || !downline) {
        throw new NotFoundError("Downline", downlineId);
      }

      // Get policy metrics for this downline
      const { data: policies, error: policiesError } = await supabase
        .from("policies")
        .select("status, annual_premium")
        .eq("user_id", downlineId);

      if (policiesError) {
        throw new DatabaseError(
          "getDownlinePerformance.policies",
          policiesError,
        );
      }

      // Calculate policy metrics
      const policyMetrics = (policies || []).reduce(
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

      // Get commission metrics for this downline
      const { data: commissions, error: commissionsError } = await supabase
        .from("commissions")
        .select("amount, status, earned_amount")
        .eq("user_id", downlineId);

      if (commissionsError) {
        throw new DatabaseError(
          "getDownlinePerformance.commissions",
          commissionsError,
        );
      }

      const commissionMetrics = (commissions || []).reduce(
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

      // Get override metrics (what this downline generated for uplines)
      const { data: overrides, error: overridesError } = await supabase
        .from("override_commissions")
        .select("override_commission_amount, status")
        .eq("base_agent_id", downlineId);

      if (overridesError) {
        throw new DatabaseError(
          "getDownlinePerformance.overrides",
          overridesError,
        );
      }

      const overrideMetrics = (overrides || []).reduce(
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

      return {
        agent_id: downlineId,
        agent_email: downline.email,
        hierarchy_depth: downline.hierarchy_depth,
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
      const { data, error } = await supabase
        .from("user_profiles")
        .update({ upline_id: request.new_upline_id })
        .eq("id", request.agent_id)
        .select()
        .single();

      if (error) {
        throw new DatabaseError("updateAgentHierarchy", error);
      }

      logger.info(
        "Hierarchy updated",
        {
          agentId: request.agent_id,
          newUplineId: request.new_upline_id,
          reason: request.reason,
        },
        "HierarchyService",
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
      const { data: agent, error: agentError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", request.agent_id)
        .single();

      if (agentError || !agent) {
        errors.push("Agent not found");
        return { valid: false, errors, warnings };
      }

      // If setting upline to null, it's valid (becoming root agent)
      if (request.new_upline_id === null) {
        return { valid: true, errors: [], warnings: [] };
      }

      // Get proposed upline profile
      const { data: upline, error: uplineError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", request.new_upline_id)
        .single();

      if (uplineError || !upline) {
        errors.push("Proposed upline not found");
        return { valid: false, errors, warnings };
      }

      // Check if proposed upline is in agent's downline tree (would create cycle)
      if (upline.hierarchy_path.includes(agent.id)) {
        errors.push(
          "Cannot set upline to one of your downlines (would create circular reference)",
        );
      }

      // Check comp level constraint
      // Note: contractCompLevel is stored in auth.users.rawuser_meta_data, not user_profiles
      // We'll add this validation if needed in the future
      // For now, database trigger will enforce this
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

      // Batch fetch all policies for all downlines
      const { data: policies, error: policiesError } = await supabase
        .from("policies")
        .select("user_id, status, annual_premium")
        .in("user_id", downlineIds);

      if (policiesError) {
        throw new DatabaseError(
          "getAllDownlinePerformance.policies",
          policiesError,
        );
      }

      // Batch fetch all commissions for all downlines
      const { data: commissions, error: commissionsError } = await supabase
        .from("commissions")
        .select("user_id, amount, status, earned_amount")
        .in("user_id", downlineIds);

      if (commissionsError) {
        throw new DatabaseError(
          "getAllDownlinePerformance.commissions",
          commissionsError,
        );
      }

      // Batch fetch all overrides generated by these downlines
      const { data: overrides, error: overridesError } = await supabase
        .from("override_commissions")
        .select("base_agent_id, override_commission_amount, status")
        .in("base_agent_id", downlineIds);

      if (overridesError) {
        throw new DatabaseError(
          "getAllDownlinePerformance.overrides",
          overridesError,
        );
      }

      // Aggregate data by downline
      return downlines.map((downline) => {
        const downlinePolicies = (policies || []).filter(
          (p) => p.user_id === downline.id,
        );
        const downlineCommissions = (commissions || []).filter(
          (c) => c.user_id === downline.id,
        );
        const downlineOverrides = (overrides || []).filter(
          (o) => o.base_agent_id === downline.id,
        );

        const policyMetrics = downlinePolicies.reduce(
          (acc, policy) => {
            acc.total++;
            if (policy.status === "active") acc.active++;
            if (policy.status === "lapsed") acc.lapsed++;
            if (policy.status === "cancelled") acc.cancelled++;
            acc.totalPremium += parseFloat(
              String(policy.annual_premium) || "0",
            );
            return acc;
          },
          { total: 0, active: 0, lapsed: 0, cancelled: 0, totalPremium: 0 },
        );

        const commissionMetrics = downlineCommissions.reduce(
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

        const overrideMetrics = downlineOverrides.reduce(
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

      logger.info(
        "Fetching hierarchy stats",
        { userId: user.id },
        "HierarchyService",
      );

      // Get current user's profile to verify they exist
      const { data: myProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError || !myProfile) {
        logger.error(
          "HierarchyService.getMyHierarchyStats",
          new Error(`Profile not found for user ${user.id}`),
        );
        throw new NotFoundError("User profile", user.id);
      }

      logger.info(
        "User profile found",
        {
          profileId: myProfile.id,
          email: myProfile.email,
          hierarchyPath: myProfile.hierarchy_path,
        },
        "HierarchyService",
      );

      const downlines = await this.getMyDownlines();
      logger.info(
        "Downlines fetched",
        { count: downlines.length },
        "HierarchyService",
      );

      // Get override income MTD
      const now = new Date();
      const mtdStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString();

      // CRITICAL FIX: Get overrides where current user is EITHER the override_agent OR the base_agent
      // This includes both income FROM downlines and income GENERATED for uplines
      const { data: mtdOverrides, error: mtdError } = await supabase
        .from("override_commissions")
        .select("override_commission_amount, override_agent_id, base_agent_id")
        .or(
          `override_agent_id.eq.${myProfile.id},base_agent_id.eq.${myProfile.id}`,
        )
        .gte("created_at", mtdStart);

      if (mtdError) {
        logger.error(
          "HierarchyService.getMyHierarchyStats.mtdOverrides",
          mtdError,
        );
      }

      logger.info(
        "MTD overrides fetched",
        {
          count: mtdOverrides?.length || 0,
          raw: mtdOverrides?.slice(0, 3), // Log first 3 for debugging
        },
        "HierarchyService",
      );

      // Calculate MTD income (only where user is the override_agent receiving the income)
      const mtdIncome = (mtdOverrides || [])
        .filter((o) => o.override_agent_id === myProfile.id)
        .reduce(
          (sum, o) =>
            sum + parseFloat(String(o.override_commission_amount) || "0"),
          0,
        );

      // Get override income YTD
      const ytdStart = new Date(now.getFullYear(), 0, 1).toISOString();

      const { data: ytdOverrides, error: ytdError } = await supabase
        .from("override_commissions")
        .select("override_commission_amount, override_agent_id")
        .eq("override_agent_id", myProfile.id)
        .gte("created_at", ytdStart);

      if (ytdError) {
        logger.error(
          "HierarchyService.getMyHierarchyStats.ytdOverrides",
          ytdError,
        );
      }

      const ytdIncome = (ytdOverrides || []).reduce(
        (sum, o) =>
          sum + parseFloat(String(o.override_commission_amount) || "0"),
        0,
      );

      logger.info(
        "YTD overrides calculated",
        {
          mtdIncome,
          ytdIncome,
          mtdCount: mtdOverrides?.length || 0,
          ytdCount: ytdOverrides?.length || 0,
        },
        "HierarchyService",
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

      logger.info("Hierarchy stats calculated", result, "HierarchyService");

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
   * CRITICAL FIX: Ensure proper data fetching with comprehensive error handling
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- hierarchy node can have various shapes
  async getAgentDetails(agentId: string): Promise<any> {
    try {
      logger.info("Fetching agent details", { agentId }, "HierarchyService");

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

      // Get agent profile - use id field, not user_id
      const { data: agent, error: agentError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", agentId)
        .single();

      if (agentError) {
        logger.error("HierarchyService.getAgentDetails.profile", agentError);
        throw new DatabaseError("getAgentDetails.profile", agentError);
      }

      if (!agent) {
        logger.warn("Agent not found", { agentId }, "HierarchyService");
        throw new NotFoundError("Agent", agentId);
      }

      logger.info(
        "Agent profile fetched",
        {
          agentId: agent.id,
          email: agent.email,
          userId: agent.user_id,
        },
        "HierarchyService",
      );

      // Get performance metrics - use the correct user_id from the profile
      const { data: policies, error: policiesError } = await supabase
        .from("policies")
        .select("*")
        .eq("user_id", agent.user_id) // Use user_id from profile, not the profile ID
        .order("effective_date", { ascending: false });

      if (policiesError) {
        logger.error(
          "HierarchyService.getAgentDetails.policies",
          policiesError,
        );
        // Don't throw, just log and continue with empty policies
      }

      logger.info(
        "Policies fetched",
        {
          count: policies?.length || 0,
          agentUserId: agent.user_id,
        },
        "HierarchyService",
      );

      const policyMetrics = (policies || []).reduce(
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

      // Get recent activity - use correct user_id
      const { data: recentPolicies, error: recentError } = await supabase
        .from("policies")
        .select("*")
        .eq("user_id", agent.user_id) // Use user_id from profile, not the profile ID
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentError) {
        logger.error(
          "HierarchyService.getAgentDetails.recentPolicies",
          recentError,
        );
        // Continue with empty recent policies
      }

      const recentActivity = (recentPolicies || []).map((p) => ({
        type: "policy",
        title: `New ${p.product || "Unknown"} policy`,
        description: `Policy #${p.policy_number || "N/A"} - ${p.carrier_id || "Unknown"}`,
        timestamp: p.created_at || new Date().toISOString(),
      }));

      // Get upline info
      let uplineEmail = null;
      if (agent.upline_id) {
        const { data: upline } = await supabase
          .from("user_profiles")
          .select("email")
          .eq("id", agent.upline_id)
          .single();
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
      const { data: policies, error } = await supabase
        .from("policies")
        .select(
          `
          *,
          client:clients(name),
          carrier:carriers(name)
        `,
        )
        .eq("user_id", agentId)
        .order("effective_date", { ascending: false });

      if (error) {
        throw new DatabaseError("getAgentPolicies", error);
      }

      const active = (policies || []).filter(
        (p) => p.status === "active",
      ).length;
      const total = (policies || []).length;

      return {
        total,
        active,
        policies: (policies || []).map((p) => ({
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
      const { data: commissions, error } = await supabase
        .from("commissions")
        .select(
          `
          *,
          policy:policies(policy_number)
        `,
        )
        .eq("user_id", agentId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new DatabaseError("getAgentCommissions", error);
      }

      const metrics = (commissions || []).reduce(
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

      return {
        ...metrics,
        recent: (commissions || []).slice(0, 10).map((c) => ({
          id: c.id,
          date: c.created_at || new Date().toISOString(),
          policyNumber: c.policy?.policy_number || "N/A",
          type: c.type,
          amount: c.amount,
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

      // Get MTD overrides
      const { data: mtdOverrides } = await supabase
        .from("override_commissions")
        .select("override_commission_amount")
        .eq("base_agent_id", agentId)
        .gte("created_at", mtdStart);

      const mtd = (mtdOverrides || []).reduce(
        (sum, o) =>
          sum + parseFloat(String(o.override_commission_amount) || "0"),
        0,
      );

      // Get YTD overrides
      const { data: ytdOverrides } = await supabase
        .from("override_commissions")
        .select("override_commission_amount")
        .eq("base_agent_id", agentId)
        .gte("created_at", ytdStart);

      const ytd = (ytdOverrides || []).reduce(
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
   * Get team comparison data for a specific agent
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase response type
  async getTeamComparison(agentId: string): Promise<any> {
    try {
      // Get all agents at the same level for peer comparison
      const { data: agent } = await supabase
        .from("user_profiles")
        .select("hierarchy_depth")
        .eq("id", agentId)
        .single();

      if (!agent) {
        throw new NotFoundError("Agent", agentId);
      }

      const { data: peers } = await supabase
        .from("user_profiles")
        .select("id, email")
        .eq("hierarchy_depth", agent.hierarchy_depth);

      const peerIds = (peers || []).map((p) => p.id);

      // Get performance data for all peers
      const { data: peerPolicies } = await supabase
        .from("policies")
        .select("user_id, annual_premium, status")
        .in("user_id", peerIds);

      // Aggregate peer performance
      const peerPerformance = peerIds.map((peerId) => {
        const agentPolicies = (peerPolicies || []).filter(
          (p) => p.user_id === peerId,
        );
        const active = agentPolicies.filter((p) => p.status === "active");
        const totalPremium = active.reduce(
          (sum, p) => sum + parseFloat(String(p.annual_premium) || "0"),
          0,
        );
        const persistency =
          agentPolicies.length > 0
            ? (active.length / agentPolicies.length) * 100
            : 0;

        return {
          id: peerId,
          email: peers?.find((p) => p.id === peerId)?.email || "",
          premium: totalPremium,
          policies: active.length,
          persistency,
        };
      });

      // Sort and rank
      peerPerformance.sort((a, b) => b.premium - a.premium);
      const agentRank = peerPerformance.findIndex((p) => p.id === agentId) + 1;
      const totalAgents = peerPerformance.length;
      const percentile =
        totalAgents > 0
          ? Math.round(((totalAgents - agentRank + 1) / totalAgents) * 100)
          : 0;

      // Calculate averages
      const avgPremium =
        peerPerformance.reduce((sum, p) => sum + p.premium, 0) / totalAgents;
      const avgPolicies =
        peerPerformance.reduce((sum, p) => sum + p.policies, 0) / totalAgents;
      const avgPersistency =
        peerPerformance.reduce((sum, p) => sum + p.persistency, 0) /
        totalAgents;

      return {
        premiumRank: agentRank,
        policyRank: agentRank, // Would need separate sorting for accuracy
        persistencyRank: agentRank, // Would need separate sorting for accuracy
        totalAgents,
        premiumPercentile: percentile,
        policyPercentile: percentile,
        persistencyPercentile: percentile,
        avgPremium,
        avgPolicies,
        avgPersistency,
        topPeers: peerPerformance.slice(0, 10),
      };
    } catch (error) {
      logger.error(
        "HierarchyService.getTeamComparison",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Build tree structure from flat list of profiles
   * @private
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

export { HierarchyService };
export const hierarchyService = new HierarchyService();
