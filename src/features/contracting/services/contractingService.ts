// src/features/contracting/services/contractingService.ts
// Service for managing carrier contracts

import { supabase } from "@/services/base/supabase";
import type { Database } from "@/types/database.types";

type CarrierContract = Database["public"]["Tables"]["carrier_contracts"]["Row"];
type CarrierContractInsert =
  Database["public"]["Tables"]["carrier_contracts"]["Insert"];
type CarrierContractUpdate =
  Database["public"]["Tables"]["carrier_contracts"]["Update"];

export type ContractStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "rejected"
  | "terminated";

export interface ContractWithDetails extends CarrierContract {
  agent?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  carrier?: {
    id: string;
    name: string;
    code: string | null;
  };
}

export interface ContractFilters {
  status?: ContractStatus[];
  agent_id?: string;
  carrier_id?: string;
  search?: string;
}

export interface PaginatedContracts {
  data: ContractWithDetails[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AgentContractToggleCarrier {
  id: string;
  name: string;
}

export interface VisibleAgentCarrierContract {
  carrier_id: string;
  carrier_name: string;
  status: string;
  writing_number: string | null;
  approved_date: string | null;
}

function isMissingVisibleToggleRpc(
  error: {
    code?: string;
    message?: string;
    details?: string;
  } | null,
): boolean {
  if (!error) return false;
  if (error.code !== "PGRST202") return false;

  const combined =
    `${error.message || ""} ${error.details || ""}`.toLowerCase();
  return combined.includes("toggle_visible_agent_carrier_contract");
}

class ContractingService {
  async getContracts(
    filters?: ContractFilters,
    page = 1,
    limit = 50,
  ): Promise<PaginatedContracts> {
    let query = supabase.from("carrier_contracts").select(
      `
        *,
        agent:agent_id(id, email, first_name, last_name),
        carrier:carrier_id(id, name, code)
      `,
      { count: "exact" },
    );

    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      query = query.in("status", filters.status);
    }
    if (filters?.agent_id) {
      query = query.eq("agent_id", filters.agent_id);
    }
    if (filters?.carrier_id) {
      query = query.eq("carrier_id", filters.carrier_id);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Sort by updated_at desc
    query = query.order("updated_at", { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching contracts:", error);
      throw error;
    }

    // If search filter is provided, filter client-side for agent name/email
    let filteredData = (data || []) as ContractWithDetails[];
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredData = filteredData.filter((c) => {
        const agentName =
          `${c.agent?.first_name || ""} ${c.agent?.last_name || ""}`.toLowerCase();
        const agentEmail = c.agent?.email?.toLowerCase() || "";
        const carrierName = c.carrier?.name?.toLowerCase() || "";
        return (
          agentName.includes(searchLower) ||
          agentEmail.includes(searchLower) ||
          carrierName.includes(searchLower)
        );
      });
    }

    return {
      data: filteredData,
      count: filters?.search ? filteredData.length : count || 0,
      page,
      limit,
      totalPages: Math.ceil(
        (filters?.search ? filteredData.length : count || 0) / limit,
      ),
    };
  }

  async getContractById(id: string): Promise<ContractWithDetails | null> {
    const { data, error } = await supabase
      .from("carrier_contracts")
      .select(
        `
        *,
        agent:agent_id(id, email, first_name, last_name),
        carrier:carrier_id(id, name, code)
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching contract:", error);
      throw error;
    }

    return data as ContractWithDetails;
  }

  async createContract(
    contract: CarrierContractInsert,
  ): Promise<ContractWithDetails> {
    const { data, error } = await supabase
      .from("carrier_contracts")
      .insert(contract)
      .select(
        `
        *,
        agent:agent_id(id, email, first_name, last_name),
        carrier:carrier_id(id, name, code)
      `,
      )
      .single();

    if (error) {
      console.error("Error creating contract:", error);
      throw error;
    }

    return data as ContractWithDetails;
  }

  async updateContract(
    id: string,
    updates: CarrierContractUpdate,
  ): Promise<ContractWithDetails> {
    const { data, error } = await supabase
      .from("carrier_contracts")
      .update(updates)
      .eq("id", id)
      .select(
        `
        *,
        agent:agent_id(id, email, first_name, last_name),
        carrier:carrier_id(id, name, code)
      `,
      )
      .single();

    if (error) {
      console.error("Error updating contract:", error);
      throw error;
    }

    return data as ContractWithDetails;
  }

  async deleteContract(id: string): Promise<void> {
    const { error } = await supabase
      .from("carrier_contracts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting contract:", error);
      throw error;
    }
  }

  async getContractStats(): Promise<{
    total: number;
    pending: number;
    submitted: number;
    approved: number;
    rejected: number;
  }> {
    const { data, error } = await supabase
      .from("carrier_contracts")
      .select("status");

    if (error) {
      console.error("Error fetching contract stats:", error);
      throw error;
    }

    const contracts = data || [];
    return {
      total: contracts.length,
      pending: contracts.filter((c) => c.status === "pending").length,
      submitted: contracts.filter((c) => c.status === "submitted").length,
      approved: contracts.filter((c) => c.status === "approved").length,
      rejected: contracts.filter((c) => c.status === "rejected").length,
    };
  }

  async getContractsByAgentId(agentId: string): Promise<ContractWithDetails[]> {
    const { data, error } = await supabase
      .from("carrier_contracts")
      .select(
        `
        *,
        carrier:carrier_id(id, name, code)
      `,
      )
      .eq("agent_id", agentId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching agent contracts:", error);
      throw error;
    }

    return (data || []) as ContractWithDetails[];
  }

  async getVisibleAgentContracts(
    agentId: string,
  ): Promise<VisibleAgentCarrierContract[]> {
    const { data, error } = await supabase.rpc("get_agent_carrier_contracts", {
      p_agent_id: agentId,
    });

    if (error) {
      console.error("Error fetching visible agent contracts:", error);
      throw error;
    }

    return (data || []) as VisibleAgentCarrierContract[];
  }

  async getActiveCarriersForAgent(
    agentId: string,
  ): Promise<AgentContractToggleCarrier[]> {
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("imo_id")
      .eq("id", agentId)
      .single();

    if (profileError) {
      console.error("Error fetching agent profile for carriers:", profileError);
      throw profileError;
    }

    if (!profile?.imo_id) return [];

    const { data, error } = await supabase
      .from("carriers")
      .select("id, name")
      .eq("imo_id", profile.imo_id)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching active carriers for agent:", error);
      throw error;
    }

    return (data || []) as AgentContractToggleCarrier[];
  }

  async toggleContract(carrierId: string, active: boolean): Promise<void> {
    const { error } = await supabase.rpc("toggle_agent_carrier_contract", {
      p_carrier_id: carrierId,
      p_active: active,
    });

    if (error) {
      console.error("Error toggling contract:", error);
      throw error;
    }
  }

  async toggleVisibleAgentContract(
    agentId: string,
    carrierId: string,
    active: boolean,
  ): Promise<void> {
    const { error } = await supabase.rpc(
      "toggle_visible_agent_carrier_contract",
      {
        p_target_agent_id: agentId,
        p_carrier_id: carrierId,
        p_active: active,
      },
    );

    if (!error) return;

    // Backward-compatible fallback: if the new visible-agent RPC has not been
    // deployed yet, allow self toggles to use the existing self-service RPC.
    if (isMissingVisibleToggleRpc(error)) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id === agentId) {
        const { error: fallbackError } = await supabase.rpc(
          "toggle_agent_carrier_contract",
          {
            p_carrier_id: carrierId,
            p_active: active,
          },
        );

        if (!fallbackError) return;

        console.error(
          "Fallback self contract toggle failed after missing visible-agent RPC:",
          fallbackError,
        );
        throw fallbackError;
      }

      const deploymentError = new Error(
        "Team carrier toggle RPC is not deployed yet. Apply migration 20260224101500_hierarchy_licensing_page_access_and_contract_rpc.sql.",
      );
      console.error("Missing visible-agent contract toggle RPC:", error);
      throw deploymentError;
    }

    if (error) {
      console.error("Error toggling visible agent contract:", error);
      throw error;
    }
  }

  async getActiveCarrierIds(agentId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("carrier_contracts")
      .select("carrier_id")
      .eq("agent_id", agentId)
      .eq("status", "approved");

    if (error) {
      console.error("Error fetching active carrier IDs:", error);
      throw error;
    }

    return (data || []).map((d) => d.carrier_id);
  }
}

export const contractingService = new ContractingService();
