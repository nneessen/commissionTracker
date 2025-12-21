// src/services/agency/AgencyRepository.ts
// Data access layer for Agencies

import { BaseRepository } from '../base/BaseRepository';
import type { AgencyRow, AgencyInsert, AgencyUpdate, Agency } from '../../types/imo.types';

/**
 * Repository for Agency data access
 * Extends BaseRepository with Agency-specific queries
 */
export class AgencyRepository extends BaseRepository<AgencyRow, AgencyInsert, AgencyUpdate> {
  constructor() {
    super('agencies');
  }

  /**
   * Find an agency by its code within an IMO
   */
  async findByCodeInImo(imoId: string, code: string): Promise<AgencyRow | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('imo_id', imoId)
      .eq('code', code)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw this.handleError(error, 'findByCodeInImo');
    }

    return data;
  }

  /**
   * Find an agency with its owner information
   */
  async findWithOwner(agencyId: string): Promise<Agency | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        owner:user_profiles!agencies_owner_id_fkey (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', agencyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw this.handleError(error, 'findWithOwner');
    }

    return data as Agency;
  }

  /**
   * Find all agencies in an IMO with owner info
   */
  async findByImo(imoId: string): Promise<Agency[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        owner:user_profiles!agencies_owner_id_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('imo_id', imoId)
      .order('name', { ascending: true });

    if (error) {
      throw this.handleError(error, 'findByImo');
    }

    return (data ?? []) as Agency[];
  }

  /**
   * Find all active agencies in an IMO with owner info
   */
  async findActiveByImo(imoId: string): Promise<Agency[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        owner:user_profiles!agencies_owner_id_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('imo_id', imoId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw this.handleError(error, 'findActiveByImo');
    }

    return (data ?? []) as Agency[];
  }

  /**
   * Find agencies owned by a user
   */
  async findByOwner(ownerId: string): Promise<AgencyRow[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('owner_id', ownerId)
      .order('name', { ascending: true });

    if (error) {
      throw this.handleError(error, 'findByOwner');
    }

    return data ?? [];
  }

  /**
   * Get count of agents in an agency
   */
  async getAgentCount(agencyId: string): Promise<number> {
    const { count, error } = await this.client
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId);

    if (error) {
      throw this.handleError(error, 'getAgentCount');
    }

    return count ?? 0;
  }

  /**
   * Check if an agency code is available within an IMO
   */
  async isCodeAvailable(imoId: string, code: string, excludeId?: string): Promise<boolean> {
    let query = this.client
      .from(this.tableName)
      .select('id', { count: 'exact', head: true })
      .eq('imo_id', imoId)
      .eq('code', code);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { count, error } = await query;

    if (error) {
      throw this.handleError(error, 'isCodeAvailable');
    }

    return count === 0;
  }

  /**
   * Update agency owner
   */
  async updateOwner(agencyId: string, ownerId: string | null): Promise<AgencyRow> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ owner_id: ownerId })
      .eq('id', agencyId)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, 'updateOwner');
    }

    return data;
  }

  /**
   * Find all active agencies across all IMOs (super admin only)
   */
  async findAllActive(): Promise<Agency[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        owner:user_profiles!agencies_owner_id_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw this.handleError(error, 'findAllActive');
    }

    return (data ?? []) as Agency[];
  }
}
