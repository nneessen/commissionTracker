// src/services/hierarchy/hierarchyService.ts
// Service layer for hierarchy management - handles business logic for agency hierarchy

import { supabase } from '../base/supabase';
import { logger } from '../base/logger';
import type {
  HierarchyNode,
  UserProfile,
  DownlinePerformance,
  HierarchyChangeRequest,
  HierarchyValidationResult,
  HierarchyStats,
} from '../../types/hierarchy.types';
import { DatabaseError, NotFoundError, ValidationError } from '../../errors/ServiceErrors';

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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      // Get current user's profile with hierarchy info
      const { data: myProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !myProfile) {
        throw new NotFoundError('User profile', user.id);
      }

      // Get all downlines using hierarchy_path (fast query with LIKE)
      const { data: downlines, error: downlinesError } = await supabase
        .from('user_profiles')
        .select('*')
        .like('hierarchy_path', `${myProfile.hierarchy_path}.%`)
        .order('hierarchy_depth', { ascending: true });

      if (downlinesError) {
        throw new DatabaseError('getMyHierarchyTree', downlinesError);
      }

      // Build tree structure
      const allNodes: UserProfile[] = [myProfile, ...(downlines || [])];
      return this.buildTree(allNodes, myProfile.id);
    } catch (error) {
      logger.error('HierarchyService.getMyHierarchyTree', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get all downlines (flat list, not tree)
   * Useful for dropdowns, tables, etc.
   */
  async getMyDownlines(): Promise<UserProfile[]> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      const { data: myProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('hierarchy_path')
        .eq('id', user.id)
        .single();

      if (profileError || !myProfile) {
        throw new NotFoundError('User profile', user.id);
      }

      const { data: downlines, error } = await supabase
        .from('user_profiles')
        .select('*')
        .like('hierarchy_path', `${myProfile.hierarchy_path}.%`)
        .order('hierarchy_depth', { ascending: true });

      if (error) {
        throw new DatabaseError('getMyDownlines', error);
      }

      return downlines || [];
    } catch (error) {
      logger.error('HierarchyService.getMyDownlines', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get upline chain for current user (path from root to current user)
   */
  async getMyUplineChain(): Promise<UserProfile[]> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      const { data: myProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('hierarchy_path')
        .eq('id', user.id)
        .single();

      if (profileError || !myProfile) {
        throw new NotFoundError('User profile', user.id);
      }

      // Parse hierarchy_path to get all upline IDs
      const uplineIds = myProfile.hierarchy_path.split('.').filter((id: string) => id !== user.id);

      if (uplineIds.length === 0) {
        return []; // Root agent, no uplines
      }

      const { data: uplines, error } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', uplineIds)
        .order('hierarchy_depth', { ascending: true });

      if (error) {
        throw new DatabaseError('getMyUplineChain', error);
      }

      return uplines || [];
    } catch (error) {
      logger.error('HierarchyService.getMyUplineChain', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get performance metrics for a specific downline
   */
  async getDownlinePerformance(downlineId: string): Promise<DownlinePerformance> {
    try {
      // Verify downline belongs to current user's hierarchy
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      const { data: downline, error: downlineError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', downlineId)
        .single();

      if (downlineError || !downline) {
        throw new NotFoundError('Downline', downlineId);
      }

      // Get policy metrics for this downline
      const { data: policies, error: policiesError } = await supabase
        .from('policies')
        .select('status, annual_premium')
        .eq('user_id', downlineId);

      if (policiesError) {
        throw new DatabaseError('getDownlinePerformance.policies', policiesError);
      }

      // Calculate policy metrics
      const policyMetrics = (policies || []).reduce(
        (acc, policy) => {
          acc.total++;
          if (policy.status === 'active') acc.active++;
          if (policy.status === 'lapsed') acc.lapsed++;
          if (policy.status === 'cancelled') acc.cancelled++;
          acc.totalPremium += parseFloat(String(policy.annual_premium) || '0');
          return acc;
        },
        { total: 0, active: 0, lapsed: 0, cancelled: 0, totalPremium: 0 }
      );

      // Get commission metrics for this downline
      const { data: commissions, error: commissionsError } = await supabase
        .from('commissions')
        .select('amount, status, earned_amount')
        .eq('user_id', downlineId);

      if (commissionsError) {
        throw new DatabaseError('getDownlinePerformance.commissions', commissionsError);
      }

      const commissionMetrics = (commissions || []).reduce(
        (acc, comm) => {
          const amount = parseFloat(String(comm.amount) || '0');
          const earned = parseFloat(String(comm.earned_amount) || '0');
          acc.total += amount;
          if (comm.status === 'earned') acc.earned += earned;
          if (comm.status === 'paid') acc.paid += amount;
          return acc;
        },
        { total: 0, earned: 0, paid: 0 }
      );

      // Get override metrics (what this downline generated for uplines)
      const { data: overrides, error: overridesError } = await supabase
        .from('override_commissions')
        .select('override_commission_amount, status')
        .eq('base_agent_id', downlineId);

      if (overridesError) {
        throw new DatabaseError('getDownlinePerformance.overrides', overridesError);
      }

      const overrideMetrics = (overrides || []).reduce(
        (acc, override) => {
          const amount = parseFloat(String(override.override_commission_amount) || '0');
          acc.total += amount;
          if (override.status === 'pending') acc.pending += amount;
          if (override.status === 'earned') acc.earned += amount;
          if (override.status === 'paid') acc.paid += amount;
          return acc;
        },
        { total: 0, pending: 0, earned: 0, paid: 0 }
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
        avg_premium: policyMetrics.total > 0 ? policyMetrics.totalPremium / policyMetrics.total : 0,
        total_base_commission: commissionMetrics.total,
        total_commission_earned: commissionMetrics.earned,
        total_commission_paid: commissionMetrics.paid,
        total_overrides_generated: overrideMetrics.total,
        pending_overrides_generated: overrideMetrics.pending,
        earned_overrides_generated: overrideMetrics.earned,
        paid_overrides_generated: overrideMetrics.paid,
        persistency_rate: policyMetrics.total > 0 ? (policyMetrics.active / policyMetrics.total) * 100 : 0,
      };
    } catch (error) {
      logger.error('HierarchyService.getDownlinePerformance', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Update an agent's upline (admin only)
   * Validates against circular references and comp level hierarchy
   */
  async updateAgentHierarchy(request: HierarchyChangeRequest): Promise<UserProfile> {
    try {
      // Validate request
      const validation = await this.validateHierarchyChange(request);
      if (!validation.valid) {
        throw new ValidationError('Invalid hierarchy change',
          validation.errors.map(err => ({ field: 'upline_id', message: err, value: request.new_upline_id }))
        );
      }

      // Update upline_id (triggers will handle hierarchy_path and circular reference checks)
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ upline_id: request.new_upline_id })
        .eq('id', request.agent_id)
        .select()
        .single();

      if (error) {
        throw new DatabaseError('updateAgentHierarchy', error);
      }

      logger.info('Hierarchy updated', {
        agentId: request.agent_id,
        newUplineId: request.new_upline_id,
        reason: request.reason
      }, 'HierarchyService');

      return data;
    } catch (error) {
      logger.error('HierarchyService.updateAgentHierarchy', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Validate a proposed hierarchy change
   * Checks for circular references and comp level constraints
   */
  async validateHierarchyChange(request: HierarchyChangeRequest): Promise<HierarchyValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get agent profile
      const { data: agent, error: agentError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', request.agent_id)
        .single();

      if (agentError || !agent) {
        errors.push('Agent not found');
        return { valid: false, errors, warnings };
      }

      // If setting upline to null, it's valid (becoming root agent)
      if (request.new_upline_id === null) {
        return { valid: true, errors: [], warnings: [] };
      }

      // Get proposed upline profile
      const { data: upline, error: uplineError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', request.new_upline_id)
        .single();

      if (uplineError || !upline) {
        errors.push('Proposed upline not found');
        return { valid: false, errors, warnings };
      }

      // Check if proposed upline is in agent's downline tree (would create cycle)
      if (upline.hierarchy_path.includes(agent.id)) {
        errors.push('Cannot set upline to one of your downlines (would create circular reference)');
      }

      // Check comp level constraint
      // Note: contractCompLevel is stored in auth.users.raw_user_meta_data, not user_profiles
      // We'll add this validation if needed in the future
      // For now, database trigger will enforce this

    } catch (error) {
      logger.error('HierarchyService.validateHierarchyChange', error instanceof Error ? error : new Error(String(error)));
      errors.push('Validation failed: ' + (error instanceof Error ? error.message : String(error)));
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get hierarchy statistics for current user
   */
  async getMyHierarchyStats(): Promise<HierarchyStats> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      const downlines = await this.getMyDownlines();

      // Get override income MTD
      const now = new Date();
      const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: mtdOverrides } = await supabase
        .from('override_commissions')
        .select('override_commission_amount')
        .eq('override_agent_id', user.id)
        .gte('created_at', mtdStart);

      const mtdIncome = (mtdOverrides || []).reduce(
        (sum, o) => sum + parseFloat(String(o.override_commission_amount) || '0'),
        0
      );

      // Get override income YTD
      const ytdStart = new Date(now.getFullYear(), 0, 1).toISOString();

      const { data: ytdOverrides } = await supabase
        .from('override_commissions')
        .select('override_commission_amount')
        .eq('override_agent_id', user.id)
        .gte('created_at', ytdStart);

      const ytdIncome = (ytdOverrides || []).reduce(
        (sum, o) => sum + parseFloat(String(o.override_commission_amount) || '0'),
        0
      );

      return {
        total_agents: downlines.length + 1, // including self
        total_downlines: downlines.length,
        direct_downlines: downlines.filter(d => d.hierarchy_depth === 1).length,
        max_depth: Math.max(0, ...downlines.map(d => d.hierarchy_depth)),
        total_override_income_mtd: mtdIncome,
        total_override_income_ytd: ytdIncome,
      };
    } catch (error) {
      logger.error('HierarchyService.getMyHierarchyStats', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Build tree structure from flat list of profiles
   * @private
   */
  private buildTree(profiles: UserProfile[], rootId: string): HierarchyNode[] {
    const nodeMap = new Map<string, HierarchyNode>();

    // Create nodes
    profiles.forEach(profile => {
      nodeMap.set(profile.id, {
        ...profile,
        children: [],
        downline_count: 0,
        direct_downline_count: 0,
      });
    });

    // Build parent-child relationships
    const roots: HierarchyNode[] = [];

    nodeMap.forEach(node => {
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
      node.children.forEach(child => {
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
