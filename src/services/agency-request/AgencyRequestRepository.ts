import { supabase } from '../base/supabase';
import { BaseRepository } from '../base/BaseRepository';
import type {
  AgencyRequestRow,
  AgencyRequestInsert,
  AgencyRequestUpdate,
  AgencyRequest,
} from '../../types/agency-request.types';

export class AgencyRequestRepository extends BaseRepository<
  AgencyRequestRow,
  AgencyRequestInsert,
  AgencyRequestUpdate
> {
  constructor() {
    super('agency_requests');
  }

  /**
   * Find a request with full related data
   */
  async findWithRelations(requestId: string): Promise<AgencyRequest | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        requester:user_profiles!agency_requests_requester_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        approver:user_profiles!agency_requests_approver_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        current_agency:agencies!agency_requests_current_agency_id_fkey (
          id,
          name,
          code
        ),
        created_agency:agencies!agency_requests_created_agency_id_fkey (
          id,
          name,
          code
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

    return data as AgencyRequest;
  }

  /**
   * Find all requests by a specific requester
   */
  async findByRequester(requesterId: string): Promise<AgencyRequest[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        requester:user_profiles!agency_requests_requester_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        approver:user_profiles!agency_requests_approver_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        current_agency:agencies!agency_requests_current_agency_id_fkey (
          id,
          name,
          code
        ),
        created_agency:agencies!agency_requests_created_agency_id_fkey (
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

    return (data ?? []) as AgencyRequest[];
  }

  /**
   * Find pending requests awaiting approval by a specific approver
   */
  async findPendingForApprover(approverId: string): Promise<AgencyRequest[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        requester:user_profiles!agency_requests_requester_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        approver:user_profiles!agency_requests_approver_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        current_agency:agencies!agency_requests_current_agency_id_fkey (
          id,
          name,
          code
        )
      `)
      .eq('approver_id', approverId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });

    if (error) {
      throw this.handleError(error, 'findPendingForApprover');
    }

    return (data ?? []) as AgencyRequest[];
  }

  /**
   * Find all requests in an IMO (for admin view)
   */
  async findByImo(imoId: string): Promise<AgencyRequest[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        requester:user_profiles!agency_requests_requester_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        approver:user_profiles!agency_requests_approver_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        current_agency:agencies!agency_requests_current_agency_id_fkey (
          id,
          name,
          code
        ),
        created_agency:agencies!agency_requests_created_agency_id_fkey (
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

    return (data ?? []) as AgencyRequest[];
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
  async cancel(requestId: string): Promise<AgencyRequestRow> {
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
    const { error } = await supabase.rpc('reject_agency_request', {
      p_request_id: requestId,
      p_reason: reason,
    });

    if (error) {
      throw this.handleError(error, 'reject');
    }
  }

  /**
   * Approve a request via RPC function
   * Returns the ID of the newly created agency
   */
  async approve(requestId: string): Promise<string> {
    const { data, error } = await supabase.rpc('approve_agency_request', {
      p_request_id: requestId,
    });

    if (error) {
      throw this.handleError(error, 'approve');
    }

    return data as string;
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
   * Check if agency code is available in IMO
   */
  async isCodeAvailable(imoId: string, code: string): Promise<boolean> {
    const { count, error } = await this.client
      .from('agencies')
      .select('*', { count: 'exact', head: true })
      .eq('imo_id', imoId)
      .eq('code', code);

    if (error) {
      throw this.handleError(error, 'isCodeAvailable');
    }

    return (count ?? 0) === 0;
  }
}
