// src/services/clients/client/ClientService.ts
import { ServiceResponse } from "../../base/BaseService";
import { ClientRepository } from "./ClientRepository";
import { supabase, TABLES } from "../../base/supabase";
import type {
  Client,
  CreateClientData,
  UpdateClientData,
  ClientFilters,
  ClientSortConfig,
  ClientWithStats,
  ClientWithPolicies,
  ClientSelectOption,
} from "@/types/client.types";
import type { Policy } from "@/types/policy.types";

/**
 * Service for client business logic
 * Uses ClientRepository for data access
 */
class ClientServiceClass {
  private repository: ClientRepository;

  constructor() {
    this.repository = new ClientRepository();
  }

  /**
   * Get all clients with optional filtering and sorting
   */
  async getAll(
    filters?: ClientFilters,
    sort?: ClientSortConfig,
  ): Promise<ServiceResponse<Client[]>> {
    try {
      const clients = await this.repository.findWithFilters(filters, sort);
      return { success: true, data: clients as Client[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get all clients with policy statistics
   */
  async getAllWithStats(
    filters?: ClientFilters,
  ): Promise<ServiceResponse<ClientWithStats[]>> {
    try {
      let results = await this.repository.findAllWithStats();

      // Apply client-side filters that require stats
      if (filters) {
        if (filters.hasPolicies === true) {
          results = results.filter((c) => c.policy_count > 0);
        } else if (filters.hasPolicies === false) {
          results = results.filter((c) => c.policy_count === 0);
        }

        if (filters.hasActivePolicies === true) {
          results = results.filter((c) => c.active_policy_count > 0);
        } else if (filters.hasActivePolicies === false) {
          results = results.filter((c) => c.active_policy_count === 0);
        }

        if (filters.minPremium !== undefined) {
          results = results.filter(
            (c) => c.total_premium >= filters.minPremium!,
          );
        }

        if (filters.maxPremium !== undefined) {
          results = results.filter(
            (c) => c.total_premium <= filters.maxPremium!,
          );
        }

        if (filters.status && filters.status !== "all") {
          results = results.filter((c) => c.status === filters.status);
        }

        if (filters.searchTerm) {
          const search = filters.searchTerm.toLowerCase();
          results = results.filter(
            (c) =>
              c.name.toLowerCase().includes(search) ||
              c.email?.toLowerCase().includes(search) ||
              c.phone?.includes(search),
          );
        }
      }

      return { success: true, data: results };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get client by ID
   */
  async getById(id: string): Promise<ServiceResponse<Client>> {
    try {
      const client = await this.repository.findById(id);
      if (!client) {
        return { success: false, error: new Error("Client not found") };
      }
      return { success: true, data: client as Client };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get client with all their policies
   */
  async getWithPolicies(
    id: string,
  ): Promise<ServiceResponse<ClientWithPolicies>> {
    try {
      const clientResult = await this.getById(id);
      if (!clientResult.success || !clientResult.data) {
        return { success: false, error: new Error("Client not found") };
      }

      const client = clientResult.data;

      // Fetch all policies for this client with carrier info
      const { data: policies, error: policiesError } = await supabase
        .from(TABLES.POLICIES)
        .select(`*, carrier:carriers(id, name, logo_url)`)
        .eq("client_id", id)
        .order("effective_date", { ascending: false });

      if (policiesError) {
        return { success: false, error: new Error(policiesError.message) };
      }

      const policyList = (policies || []) as Policy[];

      // Calculate statistics
      const stats = {
        total: policyList.length,
        active: policyList.filter((p) => p.status === "active").length,
        lapsed: policyList.filter((p) => p.status === "lapsed").length,
        cancelled: policyList.filter((p) => p.status === "cancelled").length,
        totalPremium: policyList.reduce(
          (sum, p) => sum + (p.annualPremium || 0),
          0,
        ),
        avgPremium:
          policyList.length > 0
            ? policyList.reduce((sum, p) => sum + (p.annualPremium || 0), 0) /
              policyList.length
            : 0,
        firstPolicyDate:
          policyList.length > 0
            ? policyList[policyList.length - 1].effectiveDate
            : null,
        lastPolicyDate:
          policyList.length > 0 ? policyList[0].effectiveDate : null,
        avgPolicyAge: this.calculateAvgPolicyAge(policyList),
      };

      return {
        success: true,
        data: {
          ...client,
          policies: policyList,
          stats,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Create a new client
   */
  async create(data: CreateClientData): Promise<ServiceResponse<Client>> {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: new Error("User not authenticated") };
      }

      const { data: result, error } = await supabase
        .from(TABLES.CLIENTS)
        .insert([
          {
            ...data,
            user_id: user.id,
            status: data.status || "active",
          },
        ])
        .select()
        .single();

      if (error) {
        return { success: false, error: new Error(error.message) };
      }

      return { success: true, data: result as Client };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Update a client
   */
  async update(
    id: string,
    updates: UpdateClientData,
  ): Promise<ServiceResponse<Client>> {
    try {
      const client = await this.repository.update(id, updates);
      return { success: true, data: client as Client };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Delete a client (only if no policies exist)
   */
  async delete(id: string): Promise<ServiceResponse<void>> {
    try {
      // First check if client has any policies
      const hasPolicies = await this.repository.hasPolicies(id);

      if (hasPolicies) {
        return {
          success: false,
          error: new Error(
            "Cannot delete client with existing policies. Please delete or reassign policies first.",
          ),
        };
      }

      await this.repository.delete(id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Search clients by name/email/phone
   */
  async search(
    query: string,
    limit = 10,
  ): Promise<ServiceResponse<ClientSelectOption[]>> {
    try {
      const clients = await this.repository.search(query, limit);
      const options: ClientSelectOption[] = clients.map((client) => ({
        value: client.id,
        label: client.name,
        email: client.email || undefined,
        phone: client.phone || undefined,
        status: client.status,
      }));
      return { success: true, data: options };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get clients formatted for select dropdowns
   */
  async getSelectOptions(
    includeStats = false,
  ): Promise<ServiceResponse<ClientSelectOption[]>> {
    try {
      if (includeStats) {
        const result = await this.getAllWithStats({ status: "active" });
        if (!result.success) {
          return { success: false, error: result.error };
        }
        const options: ClientSelectOption[] = (result.data || []).map(
          (client) => ({
            value: client.id,
            label: client.name,
            email: client.email || undefined,
            phone: client.phone || undefined,
            policyCount: client.policy_count,
            status: client.status,
          }),
        );
        return { success: true, data: options };
      }

      const result = await this.getAll({ status: "active" });
      if (!result.success) {
        return { success: false, error: result.error };
      }
      const options: ClientSelectOption[] = (result.data || []).map(
        (client) => ({
          value: client.id,
          label: client.name,
          email: client.email || undefined,
          phone: client.phone || undefined,
          status: client.status,
        }),
      );
      return { success: true, data: options };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Create or find client by name
   */
  async createOrFind(
    data: CreateClientData,
    userId: string,
  ): Promise<ServiceResponse<Client>> {
    try {
      if (!userId) {
        return {
          success: false,
          error: new Error("User ID is required to create or find client"),
        };
      }

      // Search by name for this user
      const existing = await this.repository.findByNameAndUser(
        data.name,
        userId,
      );

      if (existing) {
        return { success: true, data: existing as Client };
      }

      // Create new client
      const { data: newClient, error } = await supabase
        .from(TABLES.CLIENTS)
        .insert([{ ...data, user_id: userId, status: "active" }])
        .select()
        .single();

      if (error) {
        return { success: false, error: new Error(error.message) };
      }

      return { success: true, data: newClient as Client };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Bulk update client status
   */
  async bulkUpdateStatus(
    clientIds: string[],
    status: Client["status"],
  ): Promise<ServiceResponse<void>> {
    try {
      await this.repository.bulkUpdateStatus(clientIds, status);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get client statistics summary
   */
  async getStatsSummary(): Promise<
    ServiceResponse<{
      totalClients: number;
      activeClients: number;
      clientsWithPolicies: number;
      clientsWithActivePolicies: number;
      avgPoliciesPerClient: number;
      totalPremium: number;
    }>
  > {
    try {
      const result = await this.getAllWithStats();
      if (!result.success) {
        return { success: false, error: result.error };
      }

      const stats = result.data || [];
      const totalClients = stats.length;
      const activeClients = stats.filter((c) => c.status === "active").length;
      const clientsWithPolicies = stats.filter(
        (c) => c.policy_count > 0,
      ).length;
      const clientsWithActivePolicies = stats.filter(
        (c) => c.active_policy_count > 0,
      ).length;
      const totalPolicies = stats.reduce((sum, c) => sum + c.policy_count, 0);
      const avgPoliciesPerClient =
        totalClients > 0 ? totalPolicies / totalClients : 0;
      const totalPremium = stats.reduce((sum, c) => sum + c.total_premium, 0);

      return {
        success: true,
        data: {
          totalClients,
          activeClients,
          clientsWithPolicies,
          clientsWithActivePolicies,
          avgPoliciesPerClient,
          totalPremium,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Helper to calculate average policy age in months
   */
  private calculateAvgPolicyAge(policies: Policy[]): number {
    if (policies.length === 0) return 0;

    const now = new Date();
    const totalMonths = policies
      .filter((p) => p.effectiveDate)
      .reduce((sum, p) => {
        const effectiveDate = new Date(p.effectiveDate);
        const monthsDiff =
          (now.getFullYear() - effectiveDate.getFullYear()) * 12 +
          (now.getMonth() - effectiveDate.getMonth());
        return sum + Math.max(0, monthsDiff);
      }, 0);

    return policies.length > 0 ? Math.round(totalMonths / policies.length) : 0;
  }

  // ============================================================================
  // Legacy API for backward compatibility
  // ============================================================================

  /** @deprecated Use getAll instead */
  async getAllClients(
    filters?: ClientFilters,
    sort?: ClientSortConfig,
  ): Promise<Client[]> {
    const result = await this.getAll(filters, sort);
    if (!result.success) {
      throw result.error;
    }
    return result.data || [];
  }

  /** @deprecated Use getAllWithStats instead */
  async getClientsWithStats(
    filters?: ClientFilters,
  ): Promise<ClientWithStats[]> {
    const result = await this.getAllWithStats(filters);
    if (!result.success) {
      throw result.error;
    }
    return result.data || [];
  }

  /** @deprecated Use getById instead */
  async getClientById(id: string): Promise<Client | null> {
    const result = await this.getById(id);
    if (!result.success) {
      if (result.error?.message === "Client not found") {
        return null;
      }
      throw result.error;
    }
    return result.data || null;
  }

  /** @deprecated Use getWithPolicies instead */
  async getClientWithPolicies(id: string): Promise<ClientWithPolicies | null> {
    const result = await this.getWithPolicies(id);
    if (!result.success) {
      if (result.error?.message === "Client not found") {
        return null;
      }
      throw result.error;
    }
    return result.data || null;
  }

  /** @deprecated Use create instead */
  async createClient(data: CreateClientData): Promise<Client> {
    const result = await this.create(data);
    if (!result.success) {
      throw result.error;
    }
    return result.data!;
  }

  /** @deprecated Use update instead */
  async updateClient(id: string, updates: UpdateClientData): Promise<Client> {
    const result = await this.update(id, updates);
    if (!result.success) {
      throw result.error;
    }
    return result.data!;
  }

  /** @deprecated Use delete instead */
  async deleteClient(id: string): Promise<void> {
    const result = await this.delete(id);
    if (!result.success) {
      throw result.error;
    }
  }

  /** @deprecated Use search instead */
  async searchClients(
    query: string,
    limit = 10,
  ): Promise<ClientSelectOption[]> {
    const result = await this.search(query, limit);
    if (!result.success) {
      throw result.error;
    }
    return result.data || [];
  }
}

export const clientService = new ClientServiceClass();
export { ClientServiceClass };
