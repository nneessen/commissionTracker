// src/services/agency/AgencyService.ts
// Business logic for Agency operations

import { supabase } from '../base/supabase';
import { logger } from '../base/logger';
import { AgencyRepository } from './AgencyRepository';
import type {
  Agency,
  AgencyRow,
  CreateAgencyData,
  AgencyUpdate,
  AgencyMetrics,
  AgencyDashboardMetrics,
  AgencyProductionByAgent,
  AgencyOverrideSummary,
  OverrideByAgent,
} from '../../types/imo.types';
import { IMO_ROLES } from '../../types/imo.types';
import {
  parseAgencyDashboardMetrics,
  parseAgencyProductionByAgent,
  parseAgencyOverrideSummary,
  parseOverrideByAgent,
  isAccessDeniedError,
  isInvalidParameterError,
  isNotFoundError,
} from '../../types/dashboard-metrics.schemas';
import {
  parseAgencyPerformanceReport,
  formatDateForQuery,
  validateReportDateRange,
  type AgencyPerformanceReport,
  type ReportDateRange,
} from '../../types/team-reports.schemas';

/**
 * Service layer for Agency operations
 * Handles all Agency-related business logic
 */
class AgencyService {
  private repo: AgencyRepository;

  constructor() {
    this.repo = new AgencyRepository();
  }

  /**
   * Get the current user's agency
   */
  async getMyAgency(): Promise<Agency | null> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        logger.warn('No authenticated user', {}, 'AgencyService');
        return null;
      }

      // Get user's agency_id
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('agency_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.agency_id) {
        logger.warn('User has no agency', { userId: user.id }, 'AgencyService');
        return null;
      }

      // Get agency with owner
      return this.repo.findWithOwner(profile.agency_id);
    } catch (error) {
      logger.error(
        'Failed to get user agency',
        error instanceof Error ? error : new Error(String(error)),
        'AgencyService'
      );
      throw error;
    }
  }

  /**
   * Get an agency by ID
   */
  async getAgency(agencyId: string): Promise<AgencyRow | null> {
    return this.repo.findById(agencyId);
  }

  /**
   * Get an agency with owner info
   */
  async getAgencyWithOwner(agencyId: string): Promise<Agency | null> {
    return this.repo.findWithOwner(agencyId);
  }

  /**
   * Get all agencies in the current user's IMO
   */
  async getAgenciesInMyImo(): Promise<Agency[]> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return [];
      }

      // Get user's imo_id
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('imo_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.imo_id) {
        return [];
      }

      return this.repo.findByImo(profile.imo_id);
    } catch (error) {
      logger.error(
        'Failed to get agencies in IMO',
        error instanceof Error ? error : new Error(String(error)),
        'AgencyService'
      );
      throw error;
    }
  }

  /**
   * Get all agencies in a specific IMO
   */
  async getAgenciesByImo(imoId: string): Promise<Agency[]> {
    return this.repo.findByImo(imoId);
  }

  /**
   * Get all active agencies across all IMOs (super admin only)
   */
  async getAllActiveAgencies(): Promise<Agency[]> {
    return this.repo.findAllActive();
  }

  /**
   * Get agencies owned by current user
   */
  async getMyOwnedAgencies(): Promise<AgencyRow[]> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return [];
      }

      return this.repo.findByOwner(user.id);
    } catch (error) {
      logger.error(
        'Failed to get owned agencies',
        error instanceof Error ? error : new Error(String(error)),
        'AgencyService'
      );
      throw error;
    }
  }

  /**
   * Create a new agency
   */
  async createAgency(data: CreateAgencyData): Promise<AgencyRow> {
    try {
      // Check if code is available in the IMO
      const isAvailable = await this.repo.isCodeAvailable(data.imo_id, data.code);
      if (!isAvailable) {
        throw new Error(`Agency code "${data.code}" is already in use in this IMO`);
      }

      logger.info(
        'Creating new agency',
        { imoId: data.imo_id, code: data.code },
        'AgencyService'
      );

      const agency = await this.repo.create({
        ...data,
        is_active: true,
      });

      logger.info(
        'Agency created successfully',
        { id: agency.id, code: agency.code },
        'AgencyService'
      );

      return agency;
    } catch (error) {
      logger.error(
        'Failed to create agency',
        error instanceof Error ? error : new Error(String(error)),
        'AgencyService'
      );
      throw error;
    }
  }

  /**
   * Update an agency
   */
  async updateAgency(agencyId: string, data: AgencyUpdate): Promise<AgencyRow> {
    try {
      // Get existing agency for imo_id
      const existing = await this.repo.findById(agencyId);
      if (!existing) {
        throw new Error('Agency not found');
      }

      // If updating code, check availability
      if (data.code && data.code !== existing.code) {
        const isAvailable = await this.repo.isCodeAvailable(
          existing.imo_id,
          data.code,
          agencyId
        );
        if (!isAvailable) {
          throw new Error(`Agency code "${data.code}" is already in use in this IMO`);
        }
      }

      logger.info('Updating agency', { id: agencyId }, 'AgencyService');

      const agency = await this.repo.update(agencyId, data);

      logger.info('Agency updated successfully', { id: agency.id }, 'AgencyService');

      return agency;
    } catch (error) {
      logger.error(
        'Failed to update agency',
        error instanceof Error ? error : new Error(String(error)),
        'AgencyService'
      );
      throw error;
    }
  }

  /**
   * Delete an agency permanently
   */
  async deleteAgency(agencyId: string): Promise<void> {
    try {
      // Check if agency has any agents
      const { count: agentCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId);

      if (agentCount && agentCount > 0) {
        throw new Error(`Cannot delete agency with ${agentCount} agent(s). Reassign or remove agents first.`);
      }

      logger.info('Deleting agency', { agencyId }, 'AgencyService');

      await this.repo.delete(agencyId);

      logger.info('Agency deleted successfully', { agencyId }, 'AgencyService');
    } catch (error) {
      logger.error(
        'Failed to delete agency',
        error instanceof Error ? error : new Error(String(error)),
        'AgencyService'
      );
      throw error;
    }
  }

  /**
   * Deactivate an agency (soft delete)
   */
  async deactivateAgency(agencyId: string): Promise<AgencyRow> {
    try {
      logger.info('Deactivating agency', { id: agencyId }, 'AgencyService');

      const agency = await this.repo.update(agencyId, { is_active: false });

      logger.info('Agency deactivated', { id: agency.id }, 'AgencyService');

      return agency;
    } catch (error) {
      logger.error(
        'Failed to deactivate agency',
        error instanceof Error ? error : new Error(String(error)),
        'AgencyService'
      );
      throw error;
    }
  }

  /**
   * Assign a user to an agency
   * Authorization: Caller must be super admin, IMO admin of the target agency's IMO, or agency owner
   */
  async assignAgentToAgency(agentId: string, agencyId: string): Promise<void> {
    try {
      // Get current user for authorization check
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !currentUser) {
        throw new Error('Authentication required');
      }

      // Verify agency exists
      const agency = await this.repo.findById(agencyId);
      if (!agency) {
        throw new Error('Agency not found');
      }

      // Get current user's profile for authorization
      const { data: callerProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('imo_id, roles, is_super_admin')
        .eq('id', currentUser.id)
        .single();

      if (profileError || !callerProfile) {
        throw new Error('Failed to verify authorization');
      }

      // Authorization check:
      // 1. Super admin can assign anyone to any agency
      // 2. IMO admin can assign users to agencies within their IMO
      // 3. Agency owner can assign users to their own agency
      const isSuperAdmin = callerProfile.is_super_admin === true;
      const isImoAdmin =
        callerProfile.imo_id === agency.imo_id &&
        (callerProfile.roles?.includes(IMO_ROLES.IMO_OWNER) ||
          callerProfile.roles?.includes(IMO_ROLES.IMO_ADMIN));
      const isAgencyOwner = agency.owner_id === currentUser.id;

      if (!isSuperAdmin && !isImoAdmin && !isAgencyOwner) {
        logger.warn(
          'Unauthorized agency assignment attempt',
          { callerId: currentUser.id, agentId, agencyId },
          'AgencyService'
        );
        throw new Error('Not authorized to assign users to this agency');
      }

      // Update user's agency_id and imo_id
      const { error } = await supabase
        .from('user_profiles')
        .update({ agency_id: agencyId, imo_id: agency.imo_id })
        .eq('id', agentId);

      if (error) {
        throw error;
      }

      logger.info(
        'Agent assigned to agency',
        { agentId, agencyId, authorizedBy: currentUser.id },
        'AgencyService'
      );
    } catch (error) {
      logger.error(
        'Failed to assign agent to agency',
        error instanceof Error ? error : new Error(String(error)),
        'AgencyService'
      );
      throw error;
    }
  }

  /**
   * Transfer agency ownership
   */
  async transferOwnership(agencyId: string, newOwnerId: string): Promise<AgencyRow> {
    try {
      // Verify new owner exists and is in the same IMO
      const agency = await this.repo.findById(agencyId);
      if (!agency) {
        throw new Error('Agency not found');
      }

      const { data: newOwner, error: ownerError } = await supabase
        .from('user_profiles')
        .select('id, imo_id')
        .eq('id', newOwnerId)
        .single();

      if (ownerError || !newOwner) {
        throw new Error('New owner not found');
      }

      if (newOwner.imo_id !== agency.imo_id) {
        throw new Error('New owner must be in the same IMO');
      }

      logger.info(
        'Transferring agency ownership',
        { agencyId, newOwnerId },
        'AgencyService'
      );

      const updatedAgency = await this.repo.updateOwner(agencyId, newOwnerId);

      logger.info(
        'Agency ownership transferred',
        { agencyId, newOwnerId },
        'AgencyService'
      );

      return updatedAgency;
    } catch (error) {
      logger.error(
        'Failed to transfer agency ownership',
        error instanceof Error ? error : new Error(String(error)),
        'AgencyService'
      );
      throw error;
    }
  }

  /**
   * Get agency metrics using RPC for efficient single-query execution
   * This avoids the unbounded IN clause issue with large agencies
   */
  async getAgencyMetrics(agencyId: string): Promise<AgencyMetrics> {
    try {
      const { data, error } = await supabase.rpc('get_agency_metrics', {
        p_agency_id: agencyId,
      });

      if (error) throw error;

      // RPC returns JSON, parse into AgencyMetrics
      const metrics = data as {
        total_agents: number;
        active_agents: number;
        total_policies: number;
        total_premium: number;
        total_commissions: number;
        total_override_commissions: number;
      };

      return {
        total_agents: metrics.total_agents ?? 0,
        active_agents: metrics.active_agents ?? 0,
        total_policies: metrics.total_policies ?? 0,
        total_premium: Number(metrics.total_premium) ?? 0,
        total_commissions: Number(metrics.total_commissions) ?? 0,
        total_override_commissions: Number(metrics.total_override_commissions) ?? 0,
      };
    } catch (error) {
      logger.error(
        'Failed to get agency metrics',
        error instanceof Error ? error : new Error(String(error)),
        'AgencyService'
      );
      throw error;
    }
  }

  /**
   * Check if current user is an agency owner
   */
  async isCurrentUserAgencyOwner(): Promise<boolean> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return false;
      }

      const agencies = await this.repo.findByOwner(user.id);
      return agencies.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get agency dashboard metrics (aggregated for agency owners)
   * Uses RPC function for efficient single-query execution
   * @param agencyId - Optional agency ID. Defaults to user's own agency.
   */
  async getDashboardMetrics(agencyId?: string): Promise<AgencyDashboardMetrics | null> {
    try {
      const { data, error } = await supabase.rpc('get_agency_dashboard_metrics', {
        p_agency_id: agencyId || null,
      });

      if (error) {
        // Handle access denied and not found gracefully using error codes
        if (isAccessDeniedError(error) || isInvalidParameterError(error) || isNotFoundError(error)) {
          logger.warn('Access denied or invalid params for agency dashboard metrics',
            { agencyId, code: error.code }, 'AgencyService');
          return null;
        }
        throw error;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // Validate response with Zod schema
      const validated = parseAgencyDashboardMetrics(data);
      const row = validated[0];

      return {
        agency_id: row.agency_id,
        agency_name: row.agency_name,
        imo_id: row.imo_id,
        active_policies: row.active_policies,
        total_annual_premium: row.total_annual_premium,
        total_commissions_ytd: row.total_commissions_ytd,
        total_earned_ytd: row.total_earned_ytd,
        total_unearned: row.total_unearned,
        agent_count: row.agent_count,
        avg_production_per_agent: row.avg_production_per_agent,
        top_producer_id: row.top_producer_id,
        top_producer_name: row.top_producer_name,
        top_producer_premium: row.top_producer_premium,
      };
    } catch (error) {
      logger.error(
        'Failed to get agency dashboard metrics',
        error instanceof Error ? error : new Error(String(error)),
        'AgencyService'
      );
      throw error;
    }
  }

  /**
   * Get production breakdown by agent for agency owners
   * Uses RPC function for efficient single-query execution
   * @param agencyId - Optional agency ID. Defaults to user's own agency.
   */
  async getProductionByAgent(agencyId?: string): Promise<AgencyProductionByAgent[]> {
    try {
      const { data, error } = await supabase.rpc('get_agency_production_by_agent', {
        p_agency_id: agencyId || null,
      });

      if (error) {
        // Handle access denied and not found gracefully using error codes
        if (isAccessDeniedError(error) || isInvalidParameterError(error) || isNotFoundError(error)) {
          logger.warn('Access denied or invalid params for agency production by agent',
            { agencyId, code: error.code }, 'AgencyService');
          return [];
        }
        throw error;
      }

      if (!data) {
        return [];
      }

      // Validate response with Zod schema
      const validated = parseAgencyProductionByAgent(data);

      return validated.map((row) => ({
        agent_id: row.agent_id,
        agent_name: row.agent_name,
        agent_email: row.agent_email,
        contract_level: row.contract_level,
        active_policies: row.active_policies,
        total_annual_premium: row.total_annual_premium,
        commissions_ytd: row.commissions_ytd,
        earned_ytd: row.earned_ytd,
        unearned_amount: row.unearned_amount,
        pct_of_agency_production: row.pct_of_agency_production,
        joined_date: row.joined_date,
      }));
    } catch (error) {
      logger.error(
        'Failed to get agency production by agent',
        error instanceof Error ? error : new Error(String(error)),
        'AgencyService'
      );
      throw error;
    }
  }

  /**
   * Get agency performance report with monthly trends
   * Uses RPC function for efficient single-query execution
   * @param agencyId - Optional agency ID. Defaults to user's own agency.
   * @throws DateRangeValidationError if date range exceeds 24 months
   */
  async getPerformanceReport(
    agencyId?: string,
    dateRange?: ReportDateRange
  ): Promise<AgencyPerformanceReport | null> {
    try {
      // Validate date range to prevent abuse (max 24 months)
      validateReportDateRange(dateRange);

      const params: { p_agency_id: string | null; p_start_date?: string; p_end_date?: string } = {
        p_agency_id: agencyId ?? null,
      };
      if (dateRange) {
        params.p_start_date = formatDateForQuery(dateRange.startDate);
        params.p_end_date = formatDateForQuery(dateRange.endDate);
      }

      const { data, error } = await supabase.rpc('get_agency_performance_report', params);

      if (error) {
        if (isAccessDeniedError(error) || isInvalidParameterError(error) || isNotFoundError(error)) {
          logger.warn('Access denied or invalid params for agency performance report',
            { agencyId, code: error.code }, 'AgencyService');
          return null;
        }
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          agency_id: agencyId || '',
          months: [],
          summary: {
            total_new_policies: 0,
            total_new_premium: 0,
            total_commissions: 0,
            total_new_agents: 0,
            total_lapsed: 0,
            net_growth: 0,
          },
        };
      }

      const validated = parseAgencyPerformanceReport(data);

      // Calculate summary from monthly data
      const summary = validated.reduce(
        (acc, row) => ({
          total_new_policies: acc.total_new_policies + row.new_policies,
          total_new_premium: acc.total_new_premium + row.new_premium,
          total_commissions: acc.total_commissions + row.commissions_earned,
          total_new_agents: acc.total_new_agents + row.new_agents,
          total_lapsed: acc.total_lapsed + row.policies_lapsed,
          net_growth: acc.net_growth + row.net_premium_change,
        }),
        {
          total_new_policies: 0,
          total_new_premium: 0,
          total_commissions: 0,
          total_new_agents: 0,
          total_lapsed: 0,
          net_growth: 0,
        }
      );

      return {
        agency_id: agencyId || '',
        months: validated,
        summary,
      };
    } catch (error) {
      logger.error(
        'Failed to get agency performance report',
        error instanceof Error ? error : new Error(String(error)),
        'AgencyService'
      );
      throw error;
    }
  }

  /**
   * Get agency override commission summary
   * Uses RPC function for efficient single-query execution
   * @param agencyId - Optional agency ID. Defaults to user's own agency.
   */
  async getOverrideSummary(agencyId?: string): Promise<AgencyOverrideSummary | null> {
    try {
      const { data, error } = await supabase.rpc('get_agency_override_summary', {
        p_agency_id: agencyId || null,
      });

      if (error) {
        if (isAccessDeniedError(error) || isInvalidParameterError(error) || isNotFoundError(error)) {
          logger.warn('Access denied or invalid params for agency override summary',
            { agencyId, code: error.code }, 'AgencyService');
          return null;
        }
        throw error;
      }

      // No data case: return empty summary (distinguishes "no overrides" from "no access")
      if (!data || data.length === 0) {
        return {
          agency_id: '',
          agency_name: '',
          total_override_count: 0,
          total_override_amount: 0,
          pending_amount: 0,
          earned_amount: 0,
          paid_amount: 0,
          chargeback_amount: 0,
          unique_uplines: 0,
          unique_downlines: 0,
          avg_override_per_policy: 0,
          top_earner_id: null,
          top_earner_name: null,
          top_earner_amount: 0,
        };
      }

      // Validate response with Zod schema
      const validated = parseAgencyOverrideSummary(data);
      const row = validated[0];

      return {
        agency_id: row.agency_id,
        agency_name: row.agency_name,
        total_override_count: row.total_override_count,
        total_override_amount: row.total_override_amount,
        pending_amount: row.pending_amount,
        earned_amount: row.earned_amount,
        paid_amount: row.paid_amount,
        chargeback_amount: row.chargeback_amount,
        unique_uplines: row.unique_uplines,
        unique_downlines: row.unique_downlines,
        avg_override_per_policy: row.avg_override_per_policy,
        top_earner_id: row.top_earner_id,
        top_earner_name: row.top_earner_name,
        top_earner_amount: row.top_earner_amount,
      };
    } catch (error) {
      logger.error(
        'Failed to get agency override summary',
        error instanceof Error ? error : new Error(String(error)),
        'AgencyService'
      );
      throw error;
    }
  }

  /**
   * Get override commission breakdown by agent for agency owners
   * Uses RPC function for efficient single-query execution
   * @param agencyId - Optional agency ID. Defaults to user's own agency.
   */
  async getOverridesByAgent(agencyId?: string): Promise<OverrideByAgent[]> {
    try {
      const { data, error } = await supabase.rpc('get_overrides_by_agent', {
        p_agency_id: agencyId || null,
      });

      if (error) {
        if (isAccessDeniedError(error) || isInvalidParameterError(error) || isNotFoundError(error)) {
          logger.warn('Access denied or invalid params for overrides by agent',
            { agencyId, code: error.code }, 'AgencyService');
          return [];
        }
        throw error;
      }

      if (!data) {
        return [];
      }

      // Validate response with Zod schema
      const validated = parseOverrideByAgent(data);

      return validated.map((row) => ({
        agent_id: row.agent_id,
        agent_name: row.agent_name,
        agent_email: row.agent_email,
        override_count: row.override_count,
        total_amount: row.total_amount,
        pending_amount: row.pending_amount,
        earned_amount: row.earned_amount,
        paid_amount: row.paid_amount,
        avg_per_override: row.avg_per_override,
        pct_of_agency_overrides: row.pct_of_agency_overrides,
      }));
    } catch (error) {
      logger.error(
        'Failed to get overrides by agent',
        error instanceof Error ? error : new Error(String(error)),
        'AgencyService'
      );
      throw error;
    }
  }
}

// Export singleton instance
export const agencyService = new AgencyService();

// Export class for testing
export { AgencyService };
