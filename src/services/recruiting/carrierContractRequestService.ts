// src/services/recruiting/carrierContractRequestService.ts
import { supabase } from '@/services/base/supabase';
import type { Database } from '@/types/database.types';

type CarrierContractRequest = Database['public']['Tables']['carrier_contract_requests']['Row'];
type CarrierContractRequestInsert = Database['public']['Tables']['carrier_contract_requests']['Insert'];
type CarrierContractRequestUpdate = Database['public']['Tables']['carrier_contract_requests']['Update'];

// Properly typed response for joined queries
interface CarrierContractRequestWithRelations extends CarrierContractRequest {
  carrier: {
    id: string;
    name: string;
    contracting_metadata: any;
  } | null;
  recruit: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  contract_document: {
    id: string;
    document_name: string;
    file_name: string;
    storage_path: string;
  } | null;
}

interface RecruitWithContracts {
  recruit: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
    onboarding_status: string | null;
  };
  contracts: Array<{
    carrier_id: string;
    carrier: { id: string; name: string } | null;
    status: string;
    requested_date: string | null;
    writing_received_date: string | null;
    writing_number: string | null;
  }>;
}

/**
 * Get current user's authenticated ID
 * @throws Error if user is not authenticated
 */
async function getCurrentUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  return user.id;
}

/**
 * Get current date in local timezone (not UTC)
 * @returns Date string in YYYY-MM-DD format
 */
function getCurrentLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const carrierContractRequestService = {
  /**
   * Get all contract requests for a recruit
   * @param recruitId - UUID of the recruit
   * @returns Array of contract requests with joined carrier, recruit, and document data
   * @throws Error if query fails
   */
  async getRecruitContractRequests(recruitId: string): Promise<CarrierContractRequestWithRelations[]> {
    const { data, error } = await supabase
      .from('carrier_contract_requests')
      .select(`
        *,
        carrier:carriers(id, name, contracting_metadata),
        recruit:user_profiles!recruit_id(id, first_name, last_name, email),
        contract_document:user_documents(id, document_name, file_name, storage_path)
      `)
      .eq('recruit_id', recruitId)
      .order('request_order', { ascending: true });

    if (error) {
      console.error('Failed to fetch contract requests:', error);
      throw new Error(`Failed to fetch contract requests: ${error.message}`);
    }

    return (data || []) as CarrierContractRequestWithRelations[];
  },

  /**
   * Create a new contract request
   * Uses database sequence for request_order to prevent race conditions
   * @param data - Contract request data (without request_order)
   * @returns The newly created contract request
   * @throws Error if user not authenticated or insert fails
   */
  async createContractRequest(
    data: Omit<CarrierContractRequestInsert, 'request_order' | 'created_by' | 'updated_by'>
  ): Promise<CarrierContractRequest> {
    const currentUserId = await getCurrentUserId();

    // Get next request order using sequence (prevents race conditions)
    const { data: orderData, error: orderError } = await supabase.rpc('nextval', {
      sequence_name: 'carrier_contract_request_order_seq'
    });

    if (orderError) {
      console.error('Failed to get next order number:', orderError);
      throw new Error(`Failed to get next order number: ${orderError.message}`);
    }

    const nextOrder = orderData as number;

    // Get carrier instructions from metadata
    const { data: carrier, error: carrierError } = await supabase
      .from('carriers')
      .select('contracting_metadata')
      .eq('id', data.carrier_id)
      .single();

    if (carrierError) {
      console.error('Failed to fetch carrier:', carrierError);
      throw new Error(`Failed to fetch carrier: ${carrierError.message}`);
    }

    const carrierInstructions = carrier?.contracting_metadata?.instructions || null;

    const { data: newRequest, error: insertError } = await supabase
      .from('carrier_contract_requests')
      .insert({
        ...data,
        request_order: nextOrder,
        carrier_instructions: carrierInstructions,
        created_by: currentUserId,
        updated_by: currentUserId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create contract request:', insertError);
      throw new Error(`Failed to create contract request: ${insertError.message}`);
    }

    if (!newRequest) {
      throw new Error('Contract request created but no data returned');
    }

    return newRequest;
  },

  /**
   * Update contract request
   * Auto-sets transition dates based on status changes
   * @param id - UUID of the contract request
   * @param updates - Fields to update
   * @returns Updated contract request
   * @throws Error if update fails
   */
  async updateContractRequest(
    id: string,
    updates: CarrierContractRequestUpdate
  ): Promise<CarrierContractRequest> {
    // Auto-set dates based on status transitions (using local timezone)
    const enrichedUpdates = { ...updates };
    const currentDate = getCurrentLocalDate();

    if (updates.status === 'in_progress' && !updates.in_progress_date) {
      enrichedUpdates.in_progress_date = currentDate;
    }
    if (updates.status === 'writing_received' && !updates.writing_received_date) {
      enrichedUpdates.writing_received_date = currentDate;
    }
    if (updates.status === 'completed' && !updates.completed_date) {
      enrichedUpdates.completed_date = currentDate;
    }

    const { data, error } = await supabase
      .from('carrier_contract_requests')
      .update(enrichedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update contract request:', error);
      throw new Error(`Failed to update contract request: ${error.message}`);
    }

    if (!data) {
      throw new Error('Contract request updated but no data returned');
    }

    return data;
  },

  /**
   * Delete contract request
   * @param id - UUID of the contract request
   * @throws Error if delete fails
   */
  async deleteContractRequest(id: string): Promise<void> {
    const { error } = await supabase
      .from('carrier_contract_requests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete contract request:', error);
      throw new Error(`Failed to delete contract request: ${error.message}`);
    }
  },

  /**
   * Get all recruits with contract requests (for contracting dashboard)
   * SECURITY: Automatically filters by current user's IMO (RLS enforced)
   * @param filters - Optional status and search filters
   * @returns Recruits with their contract requests
   * @throws Error if query fails
   */
  async getRecruitsWithContracts(filters?: {
    status?: string[];
    searchQuery?: string;
  }): Promise<{
    recruits: RecruitWithContracts[];
    totalCount: number;
  }> {
    let query = supabase
      .from('carrier_contract_requests')
      .select(`
        recruit_id,
        recruit:user_profiles!recruit_id(
          id,
          first_name,
          last_name,
          email,
          phone,
          onboarding_status
        ),
        carrier_id,
        carrier:carriers(id, name),
        status,
        requested_date,
        writing_received_date,
        writing_number
      `, { count: 'exact' });

    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }

    // Note: Search filtering is done client-side due to Supabase join limitations
    // RLS automatically filters by IMO, so we don't need to add it explicitly

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch contracts:', error);
      throw new Error(`Failed to fetch contracts: ${error.message}`);
    }

    // Group by recruit
    const recruitMap = new Map<string, RecruitWithContracts>();

    (data || []).forEach((row: any) => {
      if (!recruitMap.has(row.recruit_id)) {
        recruitMap.set(row.recruit_id, {
          recruit: row.recruit,
          contracts: [],
        });
      }
      recruitMap.get(row.recruit_id)!.contracts.push({
        carrier_id: row.carrier_id,
        carrier: row.carrier,
        status: row.status,
        requested_date: row.requested_date,
        writing_received_date: row.writing_received_date,
        writing_number: row.writing_number,
      });
    });

    // Client-side search filtering (after RLS filtering)
    let recruits = Array.from(recruitMap.values());

    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      recruits = recruits.filter((item) =>
        item.recruit.first_name?.toLowerCase().includes(query) ||
        item.recruit.last_name?.toLowerCase().includes(query) ||
        item.recruit.email.toLowerCase().includes(query) ||
        item.contracts.some((c) =>
          c.carrier?.name?.toLowerCase().includes(query) ||
          c.writing_number?.toLowerCase().includes(query)
        )
      );
    }

    return {
      recruits,
      totalCount: count || 0,
    };
  },

  /**
   * Get available carriers for contracting (ordered by priority)
   * Calls RPC function which includes IMO isolation and auth checks
   * @param recruitId - UUID of the recruit
   * @returns Array of available carriers
   * @throws Error if RPC call fails
   */
  async getAvailableCarriers(recruitId: string): Promise<Array<{
    id: string;
    name: string;
    contracting_metadata: any;
    priority: number;
  }>> {
    const { data, error } = await supabase.rpc('get_available_carriers_for_recruit', {
      p_recruit_id: recruitId,
    });

    if (error) {
      console.error('Failed to get available carriers:', error);
      throw new Error(`Failed to get available carriers: ${error.message}`);
    }

    return data || [];
  },
};
