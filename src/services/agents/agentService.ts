// src/services/agentService.ts
// TODO: check CLAUDE.md in this folder

import { supabase, TABLES } from "../base/supabase";
import {
  Agent,
  CreateAgentData,
  UpdateAgentData,
} from "../../types/user.types";

export type { CreateAgentData, UpdateAgentData };

class AgentService {
  async getAll(): Promise<Agent[]> {
    const { data, error } = await supabase
      .from(TABLES.AGENTS)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch agents: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getById(id: string): Promise<Agent | null> {
    const { data, error } = await supabase
      .from(TABLES.AGENTS)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to fetch agent: ${error.message}`);
    }

    return data ? this.transformFromDB(data) : null;
  }

  async getActive(): Promise<Agent[]> {
    const { data, error } = await supabase
      .from(TABLES.AGENTS)
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch active agents: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async create(agentData: CreateAgentData): Promise<Agent> {
    const dbData = this.transformToDB(agentData);

    const { data, error } = await supabase
      .from(TABLES.AGENTS)
      .insert([dbData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create agent: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async update(id: string, updates: Partial<CreateAgentData>): Promise<Agent> {
    const dbData = this.transformToDB(updates, true);

    const { data, error } = await supabase
      .from(TABLES.AGENTS)
      .update(dbData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update agent: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLES.AGENTS).delete().eq("id", id);

    if (error) {
      throw new Error(`Failed to delete agent: ${error.message}`);
    }
  }

  async getByContractLevel(contractLevel: number): Promise<Agent[]> {
    const { data, error } = await supabase
      .from(TABLES.AGENTS)
      .select("*")
      .eq("contract_comp_level", contractLevel)
      .order("name", { ascending: true });

    if (error) {
      throw new Error(
        `Failed to fetch agents by contract level: ${error.message}`,
      );
    }

    return data?.map(this.transformFromDB) || [];
  }

  private transformFromDB(dbRecord: any): Agent {
    return {
      id: dbRecord.id,
      name: dbRecord.name,
      email: dbRecord.email,
      contractCompLevel: dbRecord.contract_comp_level,
      isActive: dbRecord.is_active,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: new Date(dbRecord.updated_at),
    };
  }

  private transformToDB(data: Partial<CreateAgentData>, isUpdate = false): any {
    const dbData: any = {};

    if (data.name !== undefined) dbData.name = data.name;
    if (data.email !== undefined) dbData.email = data.email;
    if (data.contractCompLevel !== undefined)
      dbData.contract_comp_level = data.contractCompLevel;
    if (data.isActive !== undefined) dbData.is_active = data.isActive;

    return dbData;
  }
}

export const agentService = new AgentService();

