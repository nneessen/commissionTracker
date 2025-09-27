// src/services/policies/PolicyService.ts
import { BaseService, ValidationRule } from '../base/BaseService';
import { PolicyRepository } from './PolicyRepository';
import { Policy, CreatePolicyData, UpdatePolicyData } from '../../types/policy.types';

export class PolicyService extends BaseService<Policy, CreatePolicyData, UpdatePolicyData> {
  private policyRepository: PolicyRepository;

  constructor() {
    const repository = new PolicyRepository();
    super(repository);
    this.policyRepository = repository;
  }

  async getByPolicyNumber(policyNumber: string) {
    try {
      const policy = await this.policyRepository.findByPolicyNumber(policyNumber);
      return {
        data: policy,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getByCarrier(carrierId: string) {
    try {
      const policies = await this.policyRepository.findByCarrier(carrierId);
      return {
        data: policies,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getByAgent(agentId: string) {
    try {
      const policies = await this.policyRepository.findByAgent(agentId);
      return {
        data: policies,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getActiveByDateRange(startDate: Date, endDate: Date) {
    try {
      const policies = await this.policyRepository.findActiveByDateRange(startDate, endDate);
      return {
        data: policies,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getCarrierMetrics(carrierId: string) {
    try {
      const [policies, totalPremium] = await Promise.all([
        this.policyRepository.findByCarrier(carrierId),
        this.policyRepository.getTotalAnnualPremiumByCarrier(carrierId)
      ]);

      const activePolicies = policies.filter(p => p.status === 'active');
      const avgPremium = activePolicies.length > 0 ? totalPremium / activePolicies.length : 0;

      return {
        data: {
          totalPolicies: policies.length,
          activePolicies: activePolicies.length,
          totalPremium,
          averagePremium: avgPremium
        },
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getMonthlyMetrics(year: number, month: number) {
    try {
      const metrics = await this.policyRepository.getMonthlyMetrics(year, month);
      return {
        data: metrics,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  protected validateCreate(data: CreatePolicyData): { isValid: boolean; errors: string[] } {
    const rules: ValidationRule[] = [
      { field: 'policyNumber', required: true, type: 'string', minLength: 1, maxLength: 100 },
      { field: 'client', required: true, type: 'string' },
      { field: 'carrierId', required: true, type: 'uuid' },
      { field: 'agentId', required: true, type: 'uuid' },
      { field: 'product', required: true, type: 'string', minLength: 1, maxLength: 100 },
      { field: 'effectiveDate', required: true, type: 'date' },
      { field: 'annualPremium', required: true, type: 'number', min: 0 },
      { field: 'paymentFrequency', required: true, type: 'string' },
      { field: 'commissionPercentage', required: true, type: 'number', min: 0, max: 200 },
      {
        field: 'status',
        custom: (value) => {
          const validStatuses = ['active', 'lapsed', 'cancelled', 'suspended'];
          return validStatuses.includes(value) || `Status must be one of: ${validStatuses.join(', ')}`;
        }
      },
      {
        field: 'paymentFrequency',
        custom: (value) => {
          const validFrequencies = ['annual', 'semi-annual', 'quarterly', 'monthly'];
          return validFrequencies.includes(value) || `Payment frequency must be one of: ${validFrequencies.join(', ')}`;
        }
      }
    ];

    return this.validate(data, rules);
  }

  protected validateUpdate(data: UpdatePolicyData): { isValid: boolean; errors: string[] } {
    const rules: ValidationRule[] = [
      { field: 'policyNumber', type: 'string', minLength: 1, maxLength: 100 },
      { field: 'carrierId', type: 'uuid' },
      { field: 'agentId', type: 'uuid' },
      { field: 'product', type: 'string', minLength: 1, maxLength: 100 },
      { field: 'effectiveDate', type: 'date' },
      { field: 'annualPremium', type: 'number', min: 0 },
      { field: 'commissionPercentage', type: 'number', min: 0, max: 200 },
      {
        field: 'status',
        custom: (value) => {
          if (value === undefined) return true;
          const validStatuses = ['active', 'lapsed', 'cancelled', 'suspended'];
          return validStatuses.includes(value) || `Status must be one of: ${validStatuses.join(', ')}`;
        }
      },
      {
        field: 'paymentFrequency',
        custom: (value) => {
          if (value === undefined) return true;
          const validFrequencies = ['annual', 'semi-annual', 'quarterly', 'monthly'];
          return validFrequencies.includes(value) || `Payment frequency must be one of: ${validFrequencies.join(', ')}`;
        }
      }
    ];

    return this.validate(data, rules);
  }

  protected async beforeCreate(data: CreatePolicyData): Promise<CreatePolicyData> {
    // Calculate monthly premium if not provided
    if (!data.monthlyPremium && data.annualPremium) {
      const monthly = data.annualPremium / 12;
      return { ...data, monthlyPremium: Math.round(monthly * 100) / 100 };
    }

    // Set default advance months if not provided
    if (data.advanceMonths === undefined) {
      return { ...data, advanceMonths: 9 }; // Default 9 months advance
    }

    return data;
  }

  protected async beforeUpdate(id: string, data: UpdatePolicyData): Promise<UpdatePolicyData> {
    // Recalculate monthly premium if annual premium is updated
    if (data.annualPremium && !data.monthlyPremium) {
      const monthly = data.annualPremium / 12;
      return { ...data, monthlyPremium: Math.round(monthly * 100) / 100 };
    }

    return data;
  }

  protected async beforeDelete(id: string): Promise<{ allowed: boolean; reason?: string }> {
    // Check if policy has associated commissions
    try {
      // This would require commission service - for now allow deletion
      // In production, you'd check for dependent records
      return { allowed: true };
    } catch (error) {
      return { allowed: false, reason: 'Failed to check policy dependencies' };
    }
  }
}

export const policyService = new PolicyService();