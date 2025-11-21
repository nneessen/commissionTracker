// Enhanced client service with full CRUD operations and statistics
import { supabase, TABLES } from '../base/supabase';
import type {
  Client,
  CreateClientData,
  UpdateClientData,
  ClientFilters,
  ClientWithStats,
  ClientWithPolicies,
  ClientSelectOption,
  ClientSortConfig,
} from '../../types/client.types';
import type { Policy } from '../../types/policy.types';

// Legacy interface for backward compatibility
export interface ClientData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  notes?: string;
}

class ClientService {
  /**
   * Get all clients with optional filtering and sorting
   */
  async getAll(filters?: ClientFilters, sort?: ClientSortConfig): Promise<Client[]> {
    let query = supabase
      .from(TABLES.CLIENTS)
      .select('*');

    // Apply filters
    if (filters) {
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.searchTerm) {
        // Search in name, email, and phone
        const searchPattern = `%${filters.searchTerm}%`;
        query = query.or(
          `name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`
        );
      }

      if (filters.hasEmail === true) {
        query = query.not('email', 'is', null);
      } else if (filters.hasEmail === false) {
        query = query.is('email', null);
      }

      if (filters.hasPhone === true) {
        query = query.not('phone', 'is', null);
      } else if (filters.hasPhone === false) {
        query = query.is('phone', null);
      }

      // Note: hasPolicies and hasActivePolicies filters require join or RPC
      // These will be handled in getAllWithStats instead
    }

    // Apply sorting
    const sortField = sort?.field || 'name';
    const sortDirection = sort?.direction || 'asc';
    query = query.order(sortField as any, { ascending: sortDirection === 'asc' });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch clients: ${error.message}`);
    }

    return (data || []) as Client[];
  }

  /**
   * Get all clients with policy statistics using database function
   */
  async getAllWithStats(filters?: ClientFilters): Promise<ClientWithStats[]> {
    // Use the database function we created in the migration
    const { data, error } = await supabase.rpc('get_clients_with_stats');

    if (error) {
      throw new Error(`Failed to fetch clients with stats: ${error.message}`);
    }

    let results = (data || []) as ClientWithStats[];

    // Apply client-side filters that require stats
    if (filters) {
      if (filters.hasPolicies === true) {
        results = results.filter(c => c.policy_count > 0);
      } else if (filters.hasPolicies === false) {
        results = results.filter(c => c.policy_count === 0);
      }

      if (filters.hasActivePolicies === true) {
        results = results.filter(c => c.active_policy_count > 0);
      } else if (filters.hasActivePolicies === false) {
        results = results.filter(c => c.active_policy_count === 0);
      }

      if (filters.minPremium !== undefined) {
        results = results.filter(c => c.total_premium >= filters.minPremium!);
      }

      if (filters.maxPremium !== undefined) {
        results = results.filter(c => c.total_premium <= filters.maxPremium!);
      }

      if (filters.status && filters.status !== 'all') {
        results = results.filter(c => c.status === filters.status);
      }

      if (filters.searchTerm) {
        const search = filters.searchTerm.toLowerCase();
        results = results.filter(c =>
          c.name.toLowerCase().includes(search) ||
          c.email?.toLowerCase().includes(search) ||
          c.phone?.includes(search)
        );
      }
    }

    return results;
  }

  /**
   * Get single client by ID
   */
  async getById(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from(TABLES.CLIENTS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch client: ${error.message}`);
    }

    return data as Client;
  }

  /**
   * Get client with all their policies
   */
  async getWithPolicies(id: string): Promise<ClientWithPolicies | null> {
    // First get the client
    const client = await this.getById(id);
    if (!client) return null;

    // Then fetch all policies for this client with carrier info
    const { data: policies, error: policiesError } = await supabase
      .from(TABLES.POLICIES)
      .select(`
        *,
        carrier:carriers(id, name, logo_url)
      `)
      .eq('client_id', id)
      .order('effective_date', { ascending: false });

    if (policiesError) {
      throw new Error(`Failed to fetch client policies: ${policiesError.message}`);
    }

    const policyList = (policies || []) as Policy[];

    // Calculate statistics
    const stats = {
      total: policyList.length,
      active: policyList.filter(p => p.status === 'active').length,
      lapsed: policyList.filter(p => p.status === 'lapsed').length,
      cancelled: policyList.filter(p => p.status === 'cancelled').length,
      totalPremium: policyList.reduce((sum, p) => sum + (p.annualPremium || 0), 0),
      avgPremium: policyList.length > 0
        ? policyList.reduce((sum, p) => sum + (p.annualPremium || 0), 0) / policyList.length
        : 0,
      firstPolicyDate: policyList.length > 0
        ? policyList[policyList.length - 1].effectiveDate
        : null,
      lastPolicyDate: policyList.length > 0
        ? policyList[0].effectiveDate
        : null,
      avgPolicyAge: this.calculateAvgPolicyAge(policyList),
    };

    return {
      ...client,
      policies: policyList,
      stats,
    };
  }

  /**
   * Create a new client
   */
  async create(clientData: CreateClientData): Promise<Client> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from(TABLES.CLIENTS)
      .insert([{
        ...clientData,
        user_id: user.id,
        status: clientData.status || 'active',
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create client: ${error.message}`);
    }

    return data as Client;
  }

  /**
   * Update an existing client
   */
  async update(id: string, clientData: UpdateClientData): Promise<Client> {
    // Remove undefined values to avoid overwriting with null
    const cleanedData = Object.entries(clientData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    const { data, error } = await supabase
      .from(TABLES.CLIENTS)
      .update(cleanedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update client: ${error.message}`);
    }

    return data as Client;
  }

  /**
   * Delete a client (only if no policies exist)
   */
  async delete(id: string): Promise<void> {
    // First check if client has any policies
    const { data: policies, error: checkError } = await supabase
      .from(TABLES.POLICIES)
      .select('id')
      .eq('client_id', id)
      .limit(1);

    if (checkError) {
      throw new Error(`Failed to check client policies: ${checkError.message}`);
    }

    if (policies && policies.length > 0) {
      throw new Error(
        'Cannot delete client with existing policies. Please delete or reassign policies first.'
      );
    }

    // Proceed with deletion
    const { error } = await supabase
      .from(TABLES.CLIENTS)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete client: ${error.message}`);
    }
  }

  /**
   * Get clients formatted for select dropdowns
   */
  async getSelectOptions(includeStats = false): Promise<ClientSelectOption[]> {
    if (includeStats) {
      const clients = await this.getAllWithStats({ status: 'active' });
      return clients.map(client => ({
        value: client.id,
        label: client.name,
        email: client.email || undefined,
        phone: client.phone || undefined,
        policyCount: (client as any).policy_count,
        status: client.status,
      }));
    }

    const clients = await this.getAll({ status: 'active' });
    return clients.map(client => ({
      value: client.id,
      label: client.name,
      email: client.email || undefined,
      phone: client.phone || undefined,
      status: client.status,
    }));
  }

  /**
   * Search clients by name/email/phone (for autocomplete)
   */
  async search(query: string, limit = 10): Promise<ClientSelectOption[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const searchPattern = `%${query}%`;
    const { data, error } = await supabase
      .from(TABLES.CLIENTS)
      .select('id, name, email, phone, status')
      .or(`name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`)
      .eq('status', 'active')
      .order('name')
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search clients: ${error.message}`);
    }

    return (data || []).map(client => ({
      value: client.id,
      label: client.name,
      email: client.email || undefined,
      phone: client.phone || undefined,
      status: client.status,
    }));
  }

  /**
   * Create or find client by name (legacy method for backward compatibility)
   */
  async createOrFind(clientData: ClientData, userId: string): Promise<Client> {
    if (!userId) {
      throw new Error('User ID is required to create or find client');
    }

    // Search by name for this user
    const { data: existingClients, error: searchError } = await supabase
      .from(TABLES.CLIENTS)
      .select('*')
      .eq('name', clientData.name)
      .eq('user_id', userId)
      .limit(1);

    if (searchError) {
      throw new Error(`Failed to search for client: ${searchError.message}`);
    }

    if (existingClients && existingClients.length > 0) {
      return existingClients[0] as Client;
    }

    // Create new client
    const createData: CreateClientData = {
      name: clientData.name,
      email: clientData.email,
      phone: clientData.phone,
      address: clientData.address,
      date_of_birth: clientData.date_of_birth,
      notes: clientData.notes,
      status: 'active',
    };

    // Temporarily set user_id directly for this legacy method
    const { data: newClient, error: createError } = await supabase
      .from(TABLES.CLIENTS)
      .insert([{ ...createData, user_id: userId }])
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create client: ${createError.message}`);
    }

    return newClient as Client;
  }

  /**
   * Bulk update client status
   */
  async bulkUpdateStatus(clientIds: string[], status: Client['status']): Promise<void> {
    const { error } = await supabase
      .from(TABLES.CLIENTS)
      .update({ status })
      .in('id', clientIds);

    if (error) {
      throw new Error(`Failed to update client status: ${error.message}`);
    }
  }

  /**
   * Get client statistics summary
   */
  async getStatsSummary(): Promise<{
    totalClients: number;
    activeClients: number;
    clientsWithPolicies: number;
    clientsWithActivePolicies: number;
    avgPoliciesPerClient: number;
    totalPremium: number;
  }> {
    const stats = await this.getAllWithStats();

    const totalClients = stats.length;
    const activeClients = stats.filter(c => c.status === 'active').length;
    const clientsWithPolicies = stats.filter(c => c.policy_count > 0).length;
    const clientsWithActivePolicies = stats.filter(c => c.active_policy_count > 0).length;
    const totalPolicies = stats.reduce((sum, c) => sum + c.policy_count, 0);
    const avgPoliciesPerClient = totalClients > 0 ? totalPolicies / totalClients : 0;
    const totalPremium = stats.reduce((sum, c) => sum + c.total_premium, 0);

    return {
      totalClients,
      activeClients,
      clientsWithPolicies,
      clientsWithActivePolicies,
      avgPoliciesPerClient,
      totalPremium,
    };
  }

  /**
   * Helper to calculate average policy age in months
   */
  private calculateAvgPolicyAge(policies: Policy[]): number {
    if (policies.length === 0) return 0;

    const now = new Date();
    const totalMonths = policies
      .filter(p => p.effectiveDate)
      .reduce((sum, p) => {
        const effectiveDate = new Date(p.effectiveDate);
        const monthsDiff = (now.getFullYear() - effectiveDate.getFullYear()) * 12 +
          (now.getMonth() - effectiveDate.getMonth());
        return sum + Math.max(0, monthsDiff);
      }, 0);

    return policies.length > 0 ? Math.round(totalMonths / policies.length) : 0;
  }
}

export const clientService = new ClientService();