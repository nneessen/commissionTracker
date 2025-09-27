// src/services/commissions/CommissionService.ts
import { BaseService, ValidationRule } from '../base/BaseService';
import { CommissionRepository } from './CommissionRepository';
import { Commission, CreateCommissionData, UpdateCommissionData } from '../../types/commission.types';

export class CommissionService extends BaseService<Commission, CreateCommissionData, UpdateCommissionData> {
  private commissionRepository: CommissionRepository;

  constructor() {
    const repository = new CommissionRepository();
    super(repository);
    this.commissionRepository = repository;
  }

  async getByPolicy(policyId: string) {
    try {
      const commissions = await this.commissionRepository.findByPolicy(policyId);
      return { data: commissions, success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error', success: false };
    }
  }

  async getByAgent(agentId: string) {
    try {
      const commissions = await this.commissionRepository.findByAgent(agentId);
      return { data: commissions, success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error', success: false };
    }
  }

  async getByStatus(status: string) {
    try {
      const commissions = await this.commissionRepository.findByStatus(status);
      return { data: commissions, success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error', success: false };
    }
  }

  async getMonthlyEarnings(agentId: string, year: number, month: number) {
    try {
      const earnings = await this.commissionRepository.getMonthlyEarnings(agentId, year, month);
      return { data: earnings, success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error', success: false };
    }
  }

  async getYearToDateSummary(agentId: string, year: number) {
    try {
      const summary = await this.commissionRepository.getYearToDateSummary(agentId, year);
      return { data: summary, success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error', success: false };
    }
  }

  async getCarrierPerformance(carrierId: string, year: number) {
    try {
      const performance = await this.commissionRepository.getCarrierPerformance(carrierId, year);
      return { data: performance, success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error', success: false };
    }
  }

  protected validateCreate(data: CreateCommissionData): { isValid: boolean; errors: string[] } {
    const rules: ValidationRule[] = [
      { field: 'policyId', required: true, type: 'uuid' },
      { field: 'agentId', required: true, type: 'uuid' },
      { field: 'carrierId', required: true, type: 'uuid' },
      { field: 'product', required: true, type: 'string', minLength: 1 },
      { field: 'type', required: true, type: 'string' },
      { field: 'status', required: true, type: 'string' },
      { field: 'annualPremium', required: true, type: 'number', min: 0 },
      { field: 'commissionAmount', required: true, type: 'number', min: 0 },
      { field: 'commissionRate', required: true, type: 'number', min: 0, max: 200 },
    ];

    return this.validate(data, rules);
  }

  protected validateUpdate(data: UpdateCommissionData): { isValid: boolean; errors: string[] } {
    const rules: ValidationRule[] = [
      { field: 'policyId', type: 'uuid' },
      { field: 'agentId', type: 'uuid' },
      { field: 'carrierId', type: 'uuid' },
      { field: 'product', type: 'string', minLength: 1 },
      { field: 'annualPremium', type: 'number', min: 0 },
      { field: 'commissionAmount', type: 'number', min: 0 },
      { field: 'commissionRate', type: 'number', min: 0, max: 200 },
    ];

    return this.validate(data, rules);
  }

  protected async beforeCreate(data: CreateCommissionData): Promise<CreateCommissionData> {
    const now = new Date();
    const expectedDate = data.expectedDate || new Date(now.getFullYear(), now.getMonth() + 1, 15);

    return {
      ...data,
      expectedDate,
      monthEarned: expectedDate.getMonth() + 1,
      yearEarned: expectedDate.getFullYear(),
      quarterEarned: Math.floor(expectedDate.getMonth() / 3) + 1,
    };
  }
}

export const commissionService = new CommissionService();