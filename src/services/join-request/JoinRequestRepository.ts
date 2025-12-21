import { supabase } from '../base/supabase';
import { BaseRepository } from '../base/BaseRepository';
import type {
  JoinRequestRow,
  JoinRequestInsert,
  JoinRequestUpdate,
  JoinRequest,
  ImoOption,
  AgencyOption,
} from '../../types/join-request.types';

export class JoinRequestRepository extends BaseRepository<
  JoinRequestRow,
  JoinRequestInsert,
  JoinRequestUpdate
> {
  constructor() {
    super('join_requests');
  }

  /**
   * Find a request with full related data
   */
  async findWithRelations(requestId: string): Promise<JoinRequest | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        requester:user_profiles!join_requests_requester_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        approver:user_profiles!join_requests_approver_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        imo:imos!join_requests_imo_id_fkey (
          id,
          name,
          code
        ),
        agency:agencies!join_requests_agency_id_fkey (
          id,
          name,
          code
        ),
        requested_upline:user_profiles!join_requests_requested_upline_id_fkey (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', requestId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw this.handleError(error, 'findWithRelations');
    }

    return data as JoinRequest;
  }

  /**
   * Find all requests by a specific requester
   */
  async findByRequester(requesterId: string): Promise<JoinRequest[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        requester:user_profiles!join_requests_requester_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        approver:user_profiles!join_requests_approver_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        imo:imos!join_requests_imo_id_fkey (
          id,
          name,
          code
        ),
        agency:agencies!join_requests_agency_id_fkey (
          id,
          name,
          code
        )
      `)
      .eq('requester_id', requesterId)
      .order('requested_at', { ascending: false });

    if (error) {
      throw this.handleError(error, 'findByRequester');
    }

    return (data ?? []) as JoinRequest[];
  }

  /**
   * Find pending requests awaiting approval by a specific approver
   */
  async findPendingForApprover(approverId: string): Promise<JoinRequest[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        requester:user_profiles!join_requests_requester_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        imo:imos!join_requests_imo_id_fkey (
          id,
          name,
          code
        ),
        agency:agencies!join_requests_agency_id_fkey (
          id,
          name,
          code
        ),
        requested_upline:user_profiles!join_requests_requested_upline_id_fkey (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('approver_id', approverId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });

    if (error) {
      throw this.handleError(error, 'findPendingForApprover');
    }

    return (data ?? []) as JoinRequest[];
  }

  /**
   * Find all requests in an IMO (for admin view)
   */
  async findByImo(imoId: string): Promise<JoinRequest[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        requester:user_profiles!join_requests_requester_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        approver:user_profiles!join_requests_approver_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        agency:agencies!join_requests_agency_id_fkey (
          id,
          name,
          code
        )
      `)
      .eq('imo_id', imoId)
      .order('requested_at', { ascending: false });

    if (error) {
      throw this.handleError(error, 'findByImo');
    }

    return (data ?? []) as JoinRequest[];
  }

  /**
   * Check if a user has a pending request
   */
  async hasPendingRequest(userId: string): Promise<boolean> {
    const { count, error } = await this.client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('requester_id', userId)
      .eq('status', 'pending');

    if (error) {
      throw this.handleError(error, 'hasPendingRequest');
    }

    return (count ?? 0) > 0;
  }

  /**
   * Cancel a pending request
   */
  async cancel(requestId: string): Promise<JoinRequestRow> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({
        status: 'cancelled',
        // Note: updated_at handled by database trigger
      })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) {
      throw this.handleError(error, 'cancel');
    }

    return data;
  }

  /**
   * Reject a request via RPC function
   */
  async reject(requestId: string, reason: string | null): Promise<void> {
    const { error } = await supabase.rpc('reject_join_request', {
      p_request_id: requestId,
      p_reason: reason,
    });

    if (error) {
      throw this.handleError(error, 'reject');
    }
  }

  /**
   * Approve a request via RPC function
   */
  async approve(
    requestId: string,
    agencyId?: string | null,
    uplineId?: string | null
  ): Promise<void> {
    const { error } = await supabase.rpc('approve_join_request', {
      p_request_id: requestId,
      p_agency_id: agencyId ?? null,
      p_upline_id: uplineId ?? null,
    });

    if (error) {
      throw this.handleError(error, 'approve');
    }
  }

  /**
   * Get count of pending requests for an approver
   */
  async getPendingCount(approverId: string): Promise<number> {
    const { count, error } = await this.client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('approver_id', approverId)
      .eq('status', 'pending');

    if (error) {
      throw this.handleError(error, 'getPendingCount');
    }

    return count ?? 0;
  }

  /**
   * Get available IMOs for join request
   */
  async getAvailableImos(): Promise<ImoOption[]> {
    const { data, error } = await supabase.rpc('get_available_imos_for_join');

    if (error) {
      throw this.handleError(error, 'getAvailableImos');
    }

    return (data ?? []) as ImoOption[];
  }

  /**
   * Get agencies in an IMO for join request
   */
  async getAgenciesForImo(imoId: string): Promise<AgencyOption[]> {
    const { data, error } = await supabase.rpc('get_agencies_for_join', {
      p_imo_id: imoId,
    });

    if (error) {
      throw this.handleError(error, 'getAgenciesForImo');
    }

    return (data ?? []) as AgencyOption[];
  }

  /**
   * Check if user can submit a join request
   */
  async canSubmitRequest(): Promise<boolean> {
    const { data, error } = await supabase.rpc('can_submit_join_request');

    if (error) {
      throw this.handleError(error, 'canSubmitRequest');
    }

    return data as boolean;
  }
}
