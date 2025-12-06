// src/services/agents/agentService.ts
// REFACTORED: This service was using a non-existent 'agents' table.
// Now properly uses user_profiles table which is the single source of truth for all users.

import { supabase } from "../base/supabase";
import {
  Agent,
  CreateAgentData,
  UpdateAgentData,
} from "../../types/user.types";

export type { CreateAgentData, UpdateAgentData };

class AgentService {
  /**
   * Get all agents (users with 'agent' role who are not deleted)
   */
  async getAll(): Promise<Agent[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select("*")
      .contains('roles', ['agent'])
      .neq('is_deleted', true)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch agents: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  /**
   * Get agent by ID - works with both user_profiles.id and user_profiles.user_id
   */
  async getById(id: string): Promise<Agent | null> {
    // Try by profile ID first
    let { data, error } = await supabase
      .from('user_profiles')
      .select("*")
      .eq("id", id)
      .neq('is_deleted', true)
      .single();

    // If not found, try by user_id (auth.users reference)
    if (error?.code === "PGRST116" || !data) {
      const result = await supabase
        .from('user_profiles')
        .select("*")
        .eq("user_id", id)
        .neq('is_deleted', true)
        .single();

      data = result.data;
      error = result.error;
    }

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to fetch agent: ${error.message}`);
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Alias for getById - used by CommissionCalculationService
   */
  async getAgentById(id: string): Promise<Agent | null> {
    return this.getById(id);
  }

  /**
   * Get all active agents (users with 'agent' role, not deleted, approved)
   */
  async getActive(): Promise<Agent[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select("*")
      .contains('roles', ['agent'])
      .neq('is_deleted', true)
      .eq('approval_status', 'approved')
      .order("first_name", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch active agents: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  /**
   * Create agent - creates a user profile with 'agent' role
   */
  async create(agentData: CreateAgentData): Promise<Agent> {
    const dbData = this.transformToDB(agentData);

    const { data, error } = await supabase
      .from('user_profiles')
      .insert([{
        ...dbData,
        roles: ['agent'],
        approval_status: 'approved',
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create agent: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  /**
   * Update agent profile
   */
  async update(id: string, updates: Partial<CreateAgentData>): Promise<Agent> {
    const dbData = this.transformToDB(updates, true);

    const { data, error } = await supabase
      .from('user_profiles')
      .update(dbData)
      .eq("id", id)
      .neq('is_deleted', true)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update agent: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  /**
   * Hard delete an agent - permanently removes user and all related data
   */
  async delete(id: string): Promise<void> {
    const { data, error } = await supabase.rpc('admin_delete_user', {
      target_user_id: id
    });

    if (error) {
      throw new Error(`Failed to delete agent: ${error.message}`);
    }

    // Check if the RPC returned an error
    if (data && typeof data === 'object' && data.success === false) {
      throw new Error(data.error || 'Failed to delete agent');
    }
  }

  /**
   * Get agents by contract level
   */
  async getByContractLevel(contractLevel: number): Promise<Agent[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select("*")
      .contains('roles', ['agent'])
      .eq("contract_level", contractLevel)
      .neq('is_deleted', true)
      .order("first_name", { ascending: true });

    if (error) {
      throw new Error(
        `Failed to fetch agents by contract level: ${error.message}`,
      );
    }

    return data?.map(this.transformFromDB) || [];
  }

  /**
   * Transform user_profiles record to Agent type
   */
  private transformFromDB(dbRecord: any): Agent {
    const fullName = [dbRecord.first_name, dbRecord.last_name]
      .filter(Boolean)
      .join(' ') || dbRecord.email;

    return {
      id: dbRecord.id,
      name: fullName,
      email: dbRecord.email,
      contractCompLevel: dbRecord.contract_level,
      isActive: dbRecord.approval_status === 'approved' && !dbRecord.is_deleted,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: new Date(dbRecord.updated_at),
      raw_user_meta_data: {},
    };
  }

  /**
   * Transform Agent type to user_profiles update data
   */
  private transformToDB(data: Partial<CreateAgentData>, isUpdate = false): any {
    const dbData: any = {};

    if (data.name !== undefined) {
      // Split name into first/last
      const parts = data.name.split(' ');
      dbData.first_name = parts[0] || '';
      dbData.last_name = parts.slice(1).join(' ') || '';
    }
    if (data.email !== undefined) dbData.email = data.email;
    if (data.contractCompLevel !== undefined)
      dbData.contract_level = data.contractCompLevel;
    if (data.isActive !== undefined) {
      // isActive maps to approval_status
      dbData.approval_status = data.isActive ? 'approved' : 'pending';
    }

    return dbData;
  }
}

export const agentService = new AgentService();
