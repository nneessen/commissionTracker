// src/services/agentSettingsService.ts

import { supabase, TABLES } from '../base/supabase';
import { AgentSettings, NewAgentSettingsForm, UpdateAgentSettingsForm } from '../../types/agent.types';

export interface CreateAgentSettingsData {
  agentId: string;
  contractLevel: number;
  firstName?: string;
  lastName?: string;
  agentCode?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  licenseState?: string;
}

export interface UpdateAgentSettingsData extends Partial<CreateAgentSettingsData> {
  id: string;
}

class AgentSettingsService {
  async getAll(): Promise<AgentSettings[]> {
    const { data, error } = await supabase
      .from(TABLES.AGENT_SETTINGS)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch agent settings: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getByAgentId(agentId: string): Promise<AgentSettings | null> {
    const { data, error } = await supabase
      .from(TABLES.AGENT_SETTINGS)
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch agent settings: ${error.message}`);
    }

    return data ? this.transformFromDB(data) : null;
  }

  async getById(id: string): Promise<AgentSettings | null> {
    const { data, error } = await supabase
      .from(TABLES.AGENT_SETTINGS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch agent settings: ${error.message}`);
    }

    return data ? this.transformFromDB(data) : null;
  }

  async getCurrentAgentSettings(): Promise<AgentSettings | null> {
    // For now, we'll get the first agent settings or create a default one
    // In a multi-agent system, this would be based on the current logged-in user
    const { data, error } = await supabase
      .from(TABLES.AGENT_SETTINGS)
      .select('*')
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch current agent settings: ${error.message}`);
    }

    return data ? this.transformFromDB(data) : null;
  }

  async create(settingsData: CreateAgentSettingsData): Promise<AgentSettings> {
    const dbData = this.transformToDB(settingsData);

    const { data, error } = await supabase
      .from(TABLES.AGENT_SETTINGS)
      .insert(dbData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create agent settings: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async update(id: string, updates: Partial<CreateAgentSettingsData>): Promise<AgentSettings> {
    const dbData = this.transformToDB(updates);
    dbData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(TABLES.AGENT_SETTINGS)
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update agent settings: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async updateByAgentId(agentId: string, updates: Partial<CreateAgentSettingsData>): Promise<AgentSettings> {
    const dbData = this.transformToDB(updates);
    dbData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(TABLES.AGENT_SETTINGS)
      .update(dbData)
      .eq('agent_id', agentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update agent settings: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.AGENT_SETTINGS)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete agent settings: ${error.message}`);
    }
  }

  async updateContractLevel(agentId: string, contractLevel: number): Promise<AgentSettings> {
    // Validate contract level
    if (contractLevel < 80 || contractLevel > 145 || contractLevel % 5 !== 0) {
      throw new Error('Contract level must be between 80 and 145 in increments of 5');
    }

    const existingSettings = await this.getByAgentId(agentId);

    if (existingSettings) {
      return this.updateByAgentId(agentId, { contractLevel });
    } else {
      return this.create({ agentId, contractLevel });
    }
  }

  async getContractLevel(agentId?: string): Promise<number> {
    const defaultLevel = 100; // Default contract level

    if (!agentId) {
      const currentSettings = await this.getCurrentAgentSettings();
      return currentSettings?.contractLevel || defaultLevel;
    }

    const settings = await this.getByAgentId(agentId);
    return settings?.contractLevel || defaultLevel;
  }

  private transformFromDB(dbData: any): AgentSettings {
    return {
      id: dbData.id,
      agentId: dbData.agent_id,
      contractLevel: dbData.contract_level,
      firstName: dbData.first_name,
      lastName: dbData.last_name,
      agentCode: dbData.agent_code,
      email: dbData.email,
      phone: dbData.phone,
      licenseNumber: dbData.license_number,
      licenseState: dbData.license_state,
      createdAt: new Date(dbData.created_at),
      updatedAt: dbData.updated_at ? new Date(dbData.updated_at) : undefined,
    };
  }

  private transformToDB(data: Partial<CreateAgentSettingsData>): any {
    const dbData: any = {};

    if (data.agentId !== undefined) dbData.agent_id = data.agentId;
    if (data.contractLevel !== undefined) dbData.contract_level = data.contractLevel;
    if (data.firstName !== undefined) dbData.first_name = data.firstName;
    if (data.lastName !== undefined) dbData.last_name = data.lastName;
    if (data.agentCode !== undefined) dbData.agent_code = data.agentCode;
    if (data.email !== undefined) dbData.email = data.email;
    if (data.phone !== undefined) dbData.phone = data.phone;
    if (data.licenseNumber !== undefined) dbData.license_number = data.licenseNumber;
    if (data.licenseState !== undefined) dbData.license_state = data.licenseState;

    return dbData;
  }
}

export const agentSettingsService = new AgentSettingsService();