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
} from '../../types/imo.types';

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
   */
  async assignAgentToAgency(agentId: string, agencyId: string): Promise<void> {
    try {
      // Verify agency exists
      const agency = await this.repo.findById(agencyId);
      if (!agency) {
        throw new Error('Agency not found');
      }

      // Update user's agency_id
      const { error } = await supabase
        .from('user_profiles')
        .update({ agency_id: agencyId, imo_id: agency.imo_id })
        .eq('id', agentId);

      if (error) {
        throw error;
      }

      logger.info(
        'Agent assigned to agency',
        { agentId, agencyId },
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
}

// Export singleton instance
export const agencyService = new AgencyService();

// Export class for testing
export { AgencyService };
