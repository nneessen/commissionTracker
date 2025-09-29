// src/services/settings/agentService.ts

import { BaseService } from '../base/BaseService';
import { Agent, CreateAgentData } from '../../types/user.types';
import {
  AgentRepository,
  AgentCreateData,
  AgentUpdateData
} from './AgentRepository';
import { ValidationRule } from '../base/BaseService';

export interface NewAgentForm {
  name: string;
  email?: string;
  phone?: string;
  contractCompLevel: number;
  licenseNumber?: string;
  licenseStates?: string[];
  hireDate?: Date;
  isActive?: boolean;
}

class AgentService extends BaseService<Agent, AgentCreateData, AgentUpdateData> {
  private agentRepository: AgentRepository;

  constructor() {
    const repository = new AgentRepository();
    super(repository);
    this.agentRepository = repository;
  }

  protected validateCreate(data: AgentCreateData): { isValid: boolean; errors: string[] } {
    const rules: ValidationRule[] = [
      {
        field: 'name',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 255
      },
      {
        field: 'email',
        type: 'email'
      },
      {
        field: 'phone',
        type: 'string',
        maxLength: 20
      },
      {
        field: 'contract_comp_level',
        required: true,
        type: 'number',
        min: 80,
        max: 145
      },
      {
        field: 'license_number',
        type: 'string',
        maxLength: 100
      },
      {
        field: 'hire_date',
        type: 'date'
      },
      {
        field: 'is_active',
        type: 'boolean'
      },
      {
        field: 'ytd_commission',
        type: 'number',
        min: 0
      },
      {
        field: 'ytd_premium',
        type: 'number',
        min: 0
      }
    ];

    const validation = this.validate(data, rules);

    // Additional custom validations
    if (data.contract_comp_level && (data.contract_comp_level % 5 !== 0)) {
      validation.errors.push('Contract level must be in increments of 5');
      validation.isValid = false;
    }

    if (data.hire_date && data.hire_date > new Date()) {
      validation.errors.push('Hire date cannot be in the future');
      validation.isValid = false;
    }

    return validation;
  }

  protected validateUpdate(data: AgentUpdateData): { isValid: boolean; errors: string[] } {
    const rules: ValidationRule[] = [
      {
        field: 'name',
        type: 'string',
        minLength: 1,
        maxLength: 255
      },
      {
        field: 'email',
        type: 'email'
      },
      {
        field: 'phone',
        type: 'string',
        maxLength: 20
      },
      {
        field: 'contract_comp_level',
        type: 'number',
        min: 80,
        max: 145
      },
      {
        field: 'license_number',
        type: 'string',
        maxLength: 100
      },
      {
        field: 'hire_date',
        type: 'date'
      },
      {
        field: 'is_active',
        type: 'boolean'
      },
      {
        field: 'ytd_commission',
        type: 'number',
        min: 0
      },
      {
        field: 'ytd_premium',
        type: 'number',
        min: 0
      }
    ];

    const validation = this.validate(data, rules);

    // Additional custom validations
    if (data.contract_comp_level && (data.contract_comp_level % 5 !== 0)) {
      validation.errors.push('Contract level must be in increments of 5');
      validation.isValid = false;
    }

    if (data.hire_date && data.hire_date > new Date()) {
      validation.errors.push('Hire date cannot be in the future');
      validation.isValid = false;
    }

    return validation;
  }

  protected async beforeCreate(data: AgentCreateData): Promise<AgentCreateData> {
    // Check for duplicate email
    if (data.email) {
      const existingAgent = await this.agentRepository.findByEmail(data.email);
      if (existingAgent) {
        throw new Error(`Agent with email "${data.email}" already exists`);
      }
    }

    return data;
  }

  protected async beforeUpdate(id: string, data: AgentUpdateData): Promise<AgentUpdateData> {
    // Check for duplicate email if email is being updated
    if (data.email) {
      const emailExists = await this.agentRepository.checkEmailExists(data.email, id);
      if (emailExists) {
        throw new Error(`Agent with email "${data.email}" already exists`);
      }
    }

    return data;
  }

  protected async beforeDelete(id: string): Promise<{ allowed: boolean; reason?: string }> {
    // Check if agent has associated policies or commissions
    // This would require checking other tables
    // For now, allow deletion (can be enhanced later)
    return { allowed: true };
  }

  // Transform CreateAgentData to AgentCreateData (for repository)
  private transformToRepositoryData(data: CreateAgentData): AgentCreateData {
    return {
      name: data.name,
      email: data.email,
      phone: data.phone,
      contract_comp_level: data.contractCompLevel,
      license_number: data.licenseNumber,
      license_states: data.licenseStates,
      hire_date: data.hireDate,
      is_active: data.isActive,
      ytd_commission: data.ytdCommission,
      ytd_premium: data.ytdPremium
    };
  }

  // Agent-specific methods
  async getActiveAgents() {
    try {
      const agents = await this.agentRepository.findActiveAgents();
      return {
        data: agents,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getByContractLevel(contractLevel: number) {
    try {
      const agents = await this.agentRepository.findByContractLevel(contractLevel);
      return {
        data: agents,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async searchAgents(searchTerm: string) {
    try {
      const agents = await this.agentRepository.searchByName(searchTerm);
      return {
        data: agents,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async updateYtdStats(agentId: string, commission: number, premium: number) {
    try {
      await this.agentRepository.updateYtdStats(agentId, commission, premium);
      return {
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  // Legacy interface methods for backward compatibility
  async getAll(): Promise<Agent[]> {
    const result = await super.getAll();
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get agents');
  }

  async getById(id: string): Promise<Agent | null> {
    const result = await super.getById(id);
    if (result.success) {
      return result.data || null;
    }
    throw new Error(result.error || 'Failed to get agent');
  }

  async create(data: CreateAgentData): Promise<Agent> {
    const repositoryData = this.transformToRepositoryData(data);
    const result = await super.create(repositoryData);
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to create agent');
  }

  async update(id: string, data: Partial<CreateAgentData>): Promise<Agent> {
    const repositoryData = this.transformToRepositoryData(data as CreateAgentData);
    const result = await super.update(id, repositoryData);
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to update agent');
  }

  async delete(id: string): Promise<void> {
    const result = await super.delete(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete agent');
    }
  }
}

export const agentService = new AgentService();