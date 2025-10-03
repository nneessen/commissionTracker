// src/services/policies/PolicyRepository.ts
import { BaseRepository } from '../base/BaseRepository';
import { TABLES } from '../base/supabase';
import { Policy, CreatePolicyData, UpdatePolicyData } from '../../types/policy.types';

export class PolicyRepository extends BaseRepository<Policy, CreatePolicyData, UpdatePolicyData> {
  constructor() {
    super(TABLES.POLICIES);
  }

  async findByPolicyNumber(policyNumber: string): Promise<Policy | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('policy_number', policyNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw this.handleError(error, 'findByPolicyNumber');
      }

      return data ? this.transformFromDB(data) : null;
    } catch (error) {
      throw this.wrapError(error, 'findByPolicyNumber');
    }
  }

  async findByCarrier(carrierId: string): Promise<Policy[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('carrier_id', carrierId)
        .order('created_at', { ascending: false });

      if (error) {
        throw this.handleError(error, 'findByCarrier');
      }

      return data?.map(this.transformFromDB) || [];
    } catch (error) {
      throw this.wrapError(error, 'findByCarrier');
    }
  }

  async findByAgent(userId: string): Promise<Policy[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw this.handleError(error, 'findByAgent');
      }

      return data?.map(this.transformFromDB) || [];
    } catch (error) {
      throw this.wrapError(error, 'findByAgent');
    }
  }

  async findActiveByDateRange(startDate: Date, endDate: Date): Promise<Policy[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('status', 'active')
        .gte('effective_date', startDate.toISOString().split('T')[0])
        .lte('effective_date', endDate.toISOString().split('T')[0])
        .order('effective_date', { ascending: false });

      if (error) {
        throw this.handleError(error, 'findActiveByDateRange');
      }

      return data?.map(this.transformFromDB) || [];
    } catch (error) {
      throw this.wrapError(error, 'findActiveByDateRange');
    }
  }

  async getTotalAnnualPremiumByCarrier(carrierId: string): Promise<number> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('annual_premium')
        .eq('carrier_id', carrierId)
        .eq('status', 'active');

      if (error) {
        throw this.handleError(error, 'getTotalAnnualPremiumByCarrier');
      }

      return data?.reduce((total, policy) => total + parseFloat(policy.annual_premium || '0'), 0) || 0;
    } catch (error) {
      throw this.wrapError(error, 'getTotalAnnualPremiumByCarrier');
    }
  }

  async getMonthlyMetrics(year: number, month: number): Promise<{
    totalPolicies: number;
    totalPremium: number;
    averagePremium: number;
    newPolicies: number;
  }> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const [allPolicies, newPolicies] = await Promise.all([
        this.client
          .from(this.tableName)
          .select('annual_premium')
          .eq('status', 'active')
          .lte('effective_date', endDate.toISOString().split('T')[0]),
        this.client
          .from(this.tableName)
          .select('annual_premium')
          .gte('effective_date', startDate.toISOString().split('T')[0])
          .lte('effective_date', endDate.toISOString().split('T')[0])
      ]);

      if (allPolicies.error) {
        throw this.handleError(allPolicies.error, 'getMonthlyMetrics');
      }

      if (newPolicies.error) {
        throw this.handleError(newPolicies.error, 'getMonthlyMetrics');
      }

      const totalPolicies = allPolicies.data?.length || 0;
      const totalPremium = allPolicies.data?.reduce((sum, p) => sum + parseFloat(p.annual_premium || '0'), 0) || 0;
      const averagePremium = totalPolicies > 0 ? totalPremium / totalPolicies : 0;
      const newPolicyCount = newPolicies.data?.length || 0;

      return {
        totalPolicies,
        totalPremium,
        averagePremium,
        newPolicies: newPolicyCount
      };
    } catch (error) {
      throw this.wrapError(error, 'getMonthlyMetrics');
    }
  }

  protected transformFromDB(dbRecord: any): Policy {
    return {
      id: dbRecord.id,
      policyNumber: dbRecord.policy_number,
      status: dbRecord.status,
      client: dbRecord.client, // JSONB field
      carrierId: dbRecord.carrier_id,
      productId: dbRecord.product_id, // NEW: Product ID field
      userId: dbRecord.user_id,
      product: dbRecord.product,
      productDetails: dbRecord.products || undefined, // NEW: Joined product data if available
      effectiveDate: new Date(dbRecord.effective_date),
      termLength: dbRecord.term_length,
      expirationDate: dbRecord.expiration_date ? new Date(dbRecord.expiration_date) : undefined,
      annualPremium: parseFloat(dbRecord.annual_premium || '0'),
      monthlyPremium: parseFloat(dbRecord.monthly_premium || '0'),
      paymentFrequency: dbRecord.payment_frequency,
      commissionPercentage: parseFloat(dbRecord.commission_percentage || '0'),
      advanceMonths: dbRecord.advance_months || 0,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: new Date(dbRecord.updated_at),
      created_at: new Date(dbRecord.created_at),
      updated_at: new Date(dbRecord.updated_at),
      createdBy: dbRecord.created_by,
      notes: dbRecord.notes,
    };
  }

  protected transformToDB(data: any, isUpdate = false): any {
    const dbData: any = {};

    if (data.policyNumber !== undefined) dbData.policy_number = data.policyNumber;
    if (data.status !== undefined) dbData.status = data.status;
    if (data.client !== undefined) dbData.client = data.client;
    if (data.carrierId !== undefined) dbData.carrier_id = data.carrierId;
    if (data.productId !== undefined) dbData.product_id = data.productId; // NEW: Product ID field
    if (data.userId !== undefined) dbData.user_id = data.userId;
    if (data.product !== undefined) dbData.product = data.product;
    if (data.effectiveDate !== undefined) {
      dbData.effective_date = data.effectiveDate instanceof Date
        ? data.effectiveDate.toISOString().split('T')[0]
        : data.effectiveDate;
    }
    if (data.termLength !== undefined) dbData.term_length = data.termLength;
    if (data.expirationDate !== undefined) {
      dbData.expiration_date = data.expirationDate instanceof Date
        ? data.expirationDate.toISOString().split('T')[0]
        : data.expirationDate;
    }
    if (data.annualPremium !== undefined) dbData.annual_premium = data.annualPremium;
    if (data.monthlyPremium !== undefined) dbData.monthly_premium = data.monthlyPremium;
    if (data.paymentFrequency !== undefined) dbData.payment_frequency = data.paymentFrequency;
    if (data.commissionPercentage !== undefined) dbData.commission_percentage = data.commissionPercentage;
    if (data.advanceMonths !== undefined) dbData.advance_months = data.advanceMonths;
    if (data.createdBy !== undefined) dbData.created_by = data.createdBy;
    if (data.notes !== undefined) dbData.notes = data.notes;

    return dbData;
  }
}