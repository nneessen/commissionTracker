// src/services/settings/AgentRepository.ts
import { BaseRepository } from '../base/BaseRepository';
import { Agent } from '../../types/user.types';

export interface AgentCreateData {
  name: string;
  email?: string;
  phone?: string;
  contract_comp_level: number;
  license_number?: string;
  license_states?: string[];
  hire_date?: Date;
  is_active?: boolean;
  ytd_commission?: number;
  ytd_premium?: number;
}

export interface AgentUpdateData extends Partial<AgentCreateData> {}

export interface AgentDBRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  contract_comp_level: number;
  license_number?: string;
  license_states?: string[];
  hire_date?: string;
  is_active: boolean;
  ytd_commission?: number;
  ytd_premium?: number;
  created_at: string;
  updated_at?: string;
}

export class AgentRepository extends BaseRepository<
  Agent,
  AgentCreateData,
  AgentUpdateData
> {
  constructor() {
    super('agents');
  }

  protected transformFromDB(dbRecord: AgentDBRecord): Agent {
    return {
      id: dbRecord.id,
      name: dbRecord.name,
      email: dbRecord.email,
      contractCompLevel: dbRecord.contract_comp_level,
      isActive: dbRecord.is_active,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: dbRecord.updated_at ? new Date(dbRecord.updated_at) : new Date(),
      phone: dbRecord.phone,
      licenseNumber: dbRecord.license_number,
      licenseStates: dbRecord.license_states || [],
      hireDate: dbRecord.hire_date ? new Date(dbRecord.hire_date) : undefined,
      ytdCommission: dbRecord.ytd_commission || 0,
      ytdPremium: dbRecord.ytd_premium || 0
    };
  }

  protected transformToDB(data: AgentCreateData | AgentUpdateData, isUpdate = false): any {
    const dbData: any = {};

    if (data.name !== undefined) dbData.name = data.name;
    if (data.email !== undefined) dbData.email = data.email;
    if (data.phone !== undefined) dbData.phone = data.phone;
    if (data.contract_comp_level !== undefined) dbData.contract_comp_level = data.contract_comp_level;
    if (data.license_number !== undefined) dbData.license_number = data.license_number;
    if (data.license_states !== undefined) dbData.license_states = data.license_states;
    if (data.hire_date !== undefined) dbData.hire_date = data.hire_date ? data.hire_date.toISOString().split('T')[0] : null;
    if (data.is_active !== undefined) dbData.is_active = data.is_active;
    if (data.ytd_commission !== undefined) dbData.ytd_commission = data.ytd_commission;
    if (data.ytd_premium !== undefined) dbData.ytd_premium = data.ytd_premium;

    // Set defaults for create operations
    if (!isUpdate) {
      if (dbData.is_active === undefined) dbData.is_active = true;
      if (dbData.contract_comp_level === undefined) dbData.contract_comp_level = 100;
      if (dbData.ytd_commission === undefined) dbData.ytd_commission = 0;
      if (dbData.ytd_premium === undefined) dbData.ytd_premium = 0;
    }

    return dbData;
  }

  // Agent-specific methods
  async findActiveAgents(): Promise<Agent[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        throw this.handleError(error, 'findActiveAgents');
      }

      return data?.map(this.transformFromDB.bind(this)) || [];
    } catch (error) {
      throw this.wrapError(error, 'findActiveAgents');
    }
  }

  async findByContractLevel(contractLevel: number): Promise<Agent[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('contract_comp_level', contractLevel)
        .order('name');

      if (error) {
        throw this.handleError(error, 'findByContractLevel');
      }

      return data?.map(this.transformFromDB.bind(this)) || [];
    } catch (error) {
      throw this.wrapError(error, 'findByContractLevel');
    }
  }

  async findByEmail(email: string): Promise<Agent | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw this.handleError(error, 'findByEmail');
      }

      return data ? this.transformFromDB(data) : null;
    } catch (error) {
      throw this.wrapError(error, 'findByEmail');
    }
  }

  async checkEmailExists(email: string, excludeId?: string): Promise<boolean> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('id')
        .eq('email', email);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) {
        throw this.handleError(error, 'checkEmailExists');
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      throw this.wrapError(error, 'checkEmailExists');
    }
  }

  async searchByName(searchTerm: string): Promise<Agent[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .order('name');

      if (error) {
        throw this.handleError(error, 'searchByName');
      }

      return data?.map(this.transformFromDB.bind(this)) || [];
    } catch (error) {
      throw this.wrapError(error, 'searchByName');
    }
  }

  async updateYtdStats(agentId: string, commission: number, premium: number): Promise<void> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .update({
          ytd_commission: commission,
          ytd_premium: premium,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId);

      if (error) {
        throw this.handleError(error, 'updateYtdStats');
      }
    } catch (error) {
      throw this.wrapError(error, 'updateYtdStats');
    }
  }
}