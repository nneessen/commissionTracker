// src/services/imo/ImoService.ts
// Business logic for IMO operations

import { supabase } from '../base/supabase';
import { logger } from '../base/logger';
import { ImoRepository } from './ImoRepository';
import type {
  Imo,
  ImoRow,
  CreateImoData,
  ImoUpdate,
  ImoMetrics,
  ImoDashboardMetrics,
  ImoProductionByAgency,
  ImoOverrideSummary,
  OverrideByAgency,
} from '../../types/imo.types';
import {
  parseImoDashboardMetrics,
  parseImoProductionByAgency,
  parseImoOverrideSummary,
  parseOverrideByAgency,
  isAccessDeniedError,
  isInvalidParameterError,
} from '../../types/dashboard-metrics.schemas';
import {
  parseImoPerformanceReport,
  parseTeamComparisonReport,
  parseTopPerformersReport,
  formatDateForQuery,
  validateReportDateRange,
  type ImoPerformanceReport,
  type TeamComparisonReport,
  type TopPerformersReport,
  type ReportDateRange,
} from '../../types/team-reports.schemas';

/**
 * Service layer for IMO operations
 * Handles all IMO-related business logic
 */
class ImoService {
  private repo: ImoRepository;

  constructor() {
    this.repo = new ImoRepository();
  }

  /**
   * Get the current user's IMO
   */
  async getMyImo(): Promise<Imo | null> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        logger.warn('No authenticated user', {}, 'ImoService');
        return null;
      }

      // Get user's imo_id
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('imo_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.imo_id) {
        logger.warn('User has no IMO', { userId: user.id }, 'ImoService');
        return null;
      }

      // Get IMO with agencies
      return this.repo.findWithAgencies(profile.imo_id);
    } catch (error) {
      logger.error(
        'Failed to get user IMO',
        error instanceof Error ? error : new Error(String(error)),
        'ImoService'
      );
      throw error;
    }
  }

  /**
   * Get an IMO by ID
   */
  async getImo(imoId: string): Promise<ImoRow | null> {
    return this.repo.findById(imoId);
  }

  /**
   * Get an IMO by code
   */
  async getImoByCode(code: string): Promise<ImoRow | null> {
    return this.repo.findByCode(code);
  }

  /**
   * Get an IMO with all its agencies
   */
  async getImoWithAgencies(imoId: string): Promise<Imo | null> {
    return this.repo.findWithAgencies(imoId);
  }

  /**
   * Get all active IMOs (super admin only)
   */
  async getAllActiveImos(): Promise<ImoRow[]> {
    return this.repo.findAllActive();
  }

  /**
   * Create a new IMO
   */
  async createImo(data: CreateImoData): Promise<ImoRow> {
    try {
      // Check if code is available
      const isAvailable = await this.repo.isCodeAvailable(data.code);
      if (!isAvailable) {
        throw new Error(`IMO code "${data.code}" is already in use`);
      }

      logger.info('Creating new IMO', { code: data.code }, 'ImoService');

      const imo = await this.repo.create({
        ...data,
        is_active: true,
      });

      logger.info('IMO created successfully', { id: imo.id, code: imo.code }, 'ImoService');

      return imo;
    } catch (error) {
      logger.error(
        'Failed to create IMO',
        error instanceof Error ? error : new Error(String(error)),
        'ImoService'
      );
      throw error;
    }
  }

  /**
   * Update an IMO
   */
  async updateImo(imoId: string, data: ImoUpdate): Promise<ImoRow> {
    try {
      // If updating code, check availability
      if (data.code) {
        const isAvailable = await this.repo.isCodeAvailable(data.code, imoId);
        if (!isAvailable) {
          throw new Error(`IMO code "${data.code}" is already in use`);
        }
      }

      logger.info('Updating IMO', { id: imoId }, 'ImoService');

      const imo = await this.repo.update(imoId, data);

      logger.info('IMO updated successfully', { id: imo.id }, 'ImoService');

      return imo;
    } catch (error) {
      logger.error(
        'Failed to update IMO',
        error instanceof Error ? error : new Error(String(error)),
        'ImoService'
      );
      throw error;
    }
  }

  /**
   * Deactivate an IMO (soft delete)
   */
  async deactivateImo(imoId: string): Promise<ImoRow> {
    try {
      logger.info('Deactivating IMO', { id: imoId }, 'ImoService');

      const imo = await this.repo.update(imoId, { is_active: false });

      logger.info('IMO deactivated', { id: imo.id }, 'ImoService');

      return imo;
    } catch (error) {
      logger.error(
        'Failed to deactivate IMO',
        error instanceof Error ? error : new Error(String(error)),
        'ImoService'
      );
      throw error;
    }
  }

  /**
   * Get IMO metrics using RPC for efficient single-query execution
   */
  async getImoMetrics(imoId: string): Promise<ImoMetrics> {
    try {
      const { data, error } = await supabase.rpc('get_imo_metrics', {
        p_imo_id: imoId,
      });

      if (error) throw error;

      // RPC returns JSON, parse into ImoMetrics
      const metrics = data as {
        total_agencies: number;
        total_agents: number;
        active_agents: number;
        total_policies: number;
        total_premium: number;
        total_commissions: number;
      };

      return {
        total_agencies: metrics.total_agencies ?? 0,
        total_agents: metrics.total_agents ?? 0,
        active_agents: metrics.active_agents ?? 0,
        total_policies: metrics.total_policies ?? 0,
        total_premium: Number(metrics.total_premium) ?? 0,
        total_commissions: Number(metrics.total_commissions) ?? 0,
      };
    } catch (error) {
      logger.error(
        'Failed to get IMO metrics',
        error instanceof Error ? error : new Error(String(error)),
        'ImoService'
      );
      throw error;
    }
  }

  /**
   * Check if current user is an IMO admin
   */
  async isCurrentUserImoAdmin(): Promise<boolean> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return false;
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('roles, is_super_admin')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return false;
      }

      // Super admin has access to everything
      if (profile.is_super_admin) {
        return true;
      }

      // Check for IMO admin roles
      const roles = profile.roles ?? [];
      return roles.includes('imo_owner') || roles.includes('imo_admin');
    } catch {
      return false;
    }
  }

  /**
   * Get IMO dashboard metrics (aggregated for IMO admins)
   * Uses RPC function for efficient single-query execution
   */
  async getDashboardMetrics(): Promise<ImoDashboardMetrics | null> {
    try {
      const { data, error } = await supabase.rpc('get_imo_dashboard_metrics');

      if (error) {
        // Handle access denied gracefully using error codes
        if (isAccessDeniedError(error) || isInvalidParameterError(error)) {
          logger.warn('Access denied or invalid params for IMO dashboard metrics',
            { code: error.code }, 'ImoService');
          return null;
        }
        throw error;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // Validate response with Zod schema
      const validated = parseImoDashboardMetrics(data);
      const row = validated[0];

      return {
        imo_id: row.imo_id,
        imo_name: row.imo_name,
        total_active_policies: row.total_active_policies,
        total_annual_premium: row.total_annual_premium,
        total_commissions_ytd: row.total_commissions_ytd,
        total_earned_ytd: row.total_earned_ytd,
        total_unearned: row.total_unearned,
        agent_count: row.agent_count,
        agency_count: row.agency_count,
        avg_production_per_agent: row.avg_production_per_agent,
      };
    } catch (error) {
      logger.error(
        'Failed to get IMO dashboard metrics',
        error instanceof Error ? error : new Error(String(error)),
        'ImoService'
      );
      throw error;
    }
  }

  /**
   * Get production breakdown by agency for IMO admins
   * Uses RPC function for efficient single-query execution
   */
  async getProductionByAgency(): Promise<ImoProductionByAgency[]> {
    try {
      const { data, error } = await supabase.rpc('get_imo_production_by_agency');

      if (error) {
        // Handle access denied gracefully using error codes
        if (isAccessDeniedError(error) || isInvalidParameterError(error)) {
          logger.warn('Access denied or invalid params for IMO production by agency',
            { code: error.code }, 'ImoService');
          return [];
        }
        throw error;
      }

      if (!data) {
        return [];
      }

      // Validate response with Zod schema
      const validated = parseImoProductionByAgency(data);

      return validated.map((row) => ({
        agency_id: row.agency_id,
        agency_name: row.agency_name,
        agency_code: row.agency_code,
        owner_name: row.owner_name,
        active_policies: row.active_policies,
        total_annual_premium: row.total_annual_premium,
        commissions_ytd: row.commissions_ytd,
        agent_count: row.agent_count,
        avg_production: row.avg_production,
        pct_of_imo_production: row.pct_of_imo_production,
      }));
    } catch (error) {
      logger.error(
        'Failed to get IMO production by agency',
        error instanceof Error ? error : new Error(String(error)),
        'ImoService'
      );
      throw error;
    }
  }

  /**
   * Get IMO performance report with monthly trends
   * Uses RPC function for efficient single-query execution
   * @throws DateRangeValidationError if date range exceeds 24 months
   */
  async getPerformanceReport(dateRange?: ReportDateRange): Promise<ImoPerformanceReport | null> {
    try {
      // Validate date range to prevent abuse (max 24 months)
      validateReportDateRange(dateRange);

      const params: { p_start_date?: string; p_end_date?: string } = {};
      if (dateRange) {
        params.p_start_date = formatDateForQuery(dateRange.startDate);
        params.p_end_date = formatDateForQuery(dateRange.endDate);
      }

      const { data, error } = await supabase.rpc('get_imo_performance_report', params);

      if (error) {
        if (isAccessDeniedError(error) || isInvalidParameterError(error)) {
          logger.warn('Access denied or invalid params for IMO performance report',
            { code: error.code }, 'ImoService');
          return null;
        }
        throw error;
      }

      if (!data || data.length === 0) {
        return {
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

      const validated = parseImoPerformanceReport(data);

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
        months: validated,
        summary,
      };
    } catch (error) {
      logger.error(
        'Failed to get IMO performance report',
        error instanceof Error ? error : new Error(String(error)),
        'ImoService'
      );
      throw error;
    }
  }

  /**
   * Get team comparison report (agency rankings)
   * Uses RPC function for efficient single-query execution
   * @throws DateRangeValidationError if date range exceeds 24 months
   */
  async getTeamComparisonReport(dateRange?: ReportDateRange): Promise<TeamComparisonReport | null> {
    try {
      // Validate date range to prevent abuse (max 24 months)
      validateReportDateRange(dateRange);

      const params: { p_start_date?: string; p_end_date?: string } = {};
      if (dateRange) {
        params.p_start_date = formatDateForQuery(dateRange.startDate);
        params.p_end_date = formatDateForQuery(dateRange.endDate);
      }

      const { data, error } = await supabase.rpc('get_team_comparison_report', params);

      if (error) {
        if (isAccessDeniedError(error) || isInvalidParameterError(error)) {
          logger.warn('Access denied or invalid params for team comparison report',
            { code: error.code }, 'ImoService');
          return null;
        }
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          agencies: [],
          summary: {
            total_agencies: 0,
            total_agents: 0,
            total_new_premium: 0,
            avg_retention_rate: 0,
          },
        };
      }

      const validated = parseTeamComparisonReport(data);

      // Calculate summary
      const totalAgents = validated.reduce((acc, row) => acc + row.agent_count, 0);
      const totalPremium = validated.reduce((acc, row) => acc + row.new_premium, 0);
      const avgRetention = validated.length > 0
        ? validated.reduce((acc, row) => acc + row.retention_rate, 0) / validated.length
        : 0;

      return {
        agencies: validated,
        summary: {
          total_agencies: validated.length,
          total_agents: totalAgents,
          total_new_premium: totalPremium,
          avg_retention_rate: Math.round(avgRetention * 10) / 10,
        },
      };
    } catch (error) {
      logger.error(
        'Failed to get team comparison report',
        error instanceof Error ? error : new Error(String(error)),
        'ImoService'
      );
      throw error;
    }
  }

  /**
   * Get top performers report (agent rankings)
   * Uses RPC function for efficient single-query execution
   * @throws DateRangeValidationError if date range exceeds 24 months
   */
  async getTopPerformersReport(
    limit: number = 20,
    dateRange?: ReportDateRange
  ): Promise<TopPerformersReport | null> {
    try {
      // Validate date range to prevent abuse (max 24 months)
      validateReportDateRange(dateRange);

      // Limit the number of results to prevent abuse
      const safeLimit = Math.min(Math.max(1, limit), 100);

      const params: { p_limit: number; p_start_date?: string; p_end_date?: string } = {
        p_limit: safeLimit,
      };
      if (dateRange) {
        params.p_start_date = formatDateForQuery(dateRange.startDate);
        params.p_end_date = formatDateForQuery(dateRange.endDate);
      }

      const { data, error } = await supabase.rpc('get_top_performers_report', params);

      if (error) {
        if (isAccessDeniedError(error) || isInvalidParameterError(error)) {
          logger.warn('Access denied or invalid params for top performers report',
            { code: error.code }, 'ImoService');
          return null;
        }
        throw error;
      }

      const validated = data ? parseTopPerformersReport(data) : [];

      return {
        performers: validated,
        date_range: dateRange
          ? {
              start_date: formatDateForQuery(dateRange.startDate),
              end_date: formatDateForQuery(dateRange.endDate),
            }
          : {
              start_date: formatDateForQuery(new Date(new Date().getFullYear(), 0, 1)),
              end_date: formatDateForQuery(new Date()),
            },
      };
    } catch (error) {
      logger.error(
        'Failed to get top performers report',
        error instanceof Error ? error : new Error(String(error)),
        'ImoService'
      );
      throw error;
    }
  }

  /**
   * Get IMO override commission summary
   * Uses RPC function for efficient single-query execution
   */
  async getOverrideSummary(): Promise<ImoOverrideSummary | null> {
    try {
      const { data, error } = await supabase.rpc('get_imo_override_summary');

      if (error) {
        if (isAccessDeniedError(error) || isInvalidParameterError(error)) {
          logger.warn('Access denied or invalid params for IMO override summary',
            { code: error.code }, 'ImoService');
          return null;
        }
        throw error;
      }

      // No data case: return empty summary (distinguishes "no overrides" from "no access")
      if (!data || data.length === 0) {
        return {
          imo_id: '',
          imo_name: '',
          total_override_count: 0,
          total_override_amount: 0,
          pending_amount: 0,
          earned_amount: 0,
          paid_amount: 0,
          chargeback_amount: 0,
          unique_uplines: 0,
          unique_downlines: 0,
          avg_override_per_policy: 0,
        };
      }

      // Validate response with Zod schema
      const validated = parseImoOverrideSummary(data);
      const row = validated[0];

      return {
        imo_id: row.imo_id,
        imo_name: row.imo_name,
        total_override_count: row.total_override_count,
        total_override_amount: row.total_override_amount,
        pending_amount: row.pending_amount,
        earned_amount: row.earned_amount,
        paid_amount: row.paid_amount,
        chargeback_amount: row.chargeback_amount,
        unique_uplines: row.unique_uplines,
        unique_downlines: row.unique_downlines,
        avg_override_per_policy: row.avg_override_per_policy,
      };
    } catch (error) {
      logger.error(
        'Failed to get IMO override summary',
        error instanceof Error ? error : new Error(String(error)),
        'ImoService'
      );
      throw error;
    }
  }

  /**
   * Get override commission breakdown by agency for IMO admins
   * Uses RPC function for efficient single-query execution
   */
  async getOverridesByAgency(): Promise<OverrideByAgency[]> {
    try {
      const { data, error } = await supabase.rpc('get_overrides_by_agency');

      if (error) {
        if (isAccessDeniedError(error) || isInvalidParameterError(error)) {
          logger.warn('Access denied or invalid params for overrides by agency',
            { code: error.code }, 'ImoService');
          return [];
        }
        throw error;
      }

      if (!data) {
        return [];
      }

      // Validate response with Zod schema
      const validated = parseOverrideByAgency(data);

      return validated.map((row) => ({
        agency_id: row.agency_id,
        agency_name: row.agency_name,
        agency_code: row.agency_code,
        override_count: row.override_count,
        total_amount: row.total_amount,
        pending_amount: row.pending_amount,
        earned_amount: row.earned_amount,
        paid_amount: row.paid_amount,
        pct_of_imo_overrides: row.pct_of_imo_overrides,
      }));
    } catch (error) {
      logger.error(
        'Failed to get overrides by agency',
        error instanceof Error ? error : new Error(String(error)),
        'ImoService'
      );
      throw error;
    }
  }
}

// Export singleton instance
export const imoService = new ImoService();

// Export class for testing
export { ImoService };
