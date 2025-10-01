// src/services/commissions/CommissionRepository.ts
import { logger } from '../base/logger';
import { BaseRepository } from '../base/BaseRepository';
import { TABLES } from '../base/supabase';
import { Commission, CreateCommissionData, UpdateCommissionData } from '../../types/commission.types';
import { caches, DataLoader } from '../../utils/cache';
import { batchLoadByIds, batchLoadByForeignKey } from '../../utils/queryBatch';
import { queryPerformance, measureAsync } from '../../utils/performance';

export class CommissionRepository extends BaseRepository<Commission, CreateCommissionData, UpdateCommissionData> {
  // DataLoader for batching findById requests
  private idLoader = new DataLoader<string, Commission>(
    async (ids: string[]) => {
      const resultMap = await batchLoadByIds<any>(TABLES.COMMISSIONS, ids);
      return ids.map(id => {
        const data = resultMap.get(id);
        return data ? this.transformFromDB(data) : null as any;
      });
    },
    { maxBatchSize: 100, batchWindowMs: 10 }
  );

  constructor() {
    super(TABLES.COMMISSIONS);
  }

  /**
   * Override findById to use caching and batching
   */
  async findById(id: string): Promise<Commission | null> {
    // Check cache first
    const cacheKey = `commission:${id}`;
    const cached = caches.commissions.get(cacheKey);
    if (cached) {
      return cached as Commission;
    }

    try {
      // Use DataLoader for automatic batching
      const commission = await this.idLoader.load(id);

      // Cache the result
      if (commission) {
        caches.commissions.set(cacheKey, commission);
      }

      return commission;
    } catch (error) {
      // Fallback to base implementation
      return super.findById(id);
    }
  }

  /**
   * Batch load commissions by IDs
   */
  async findByIds(ids: string[]): Promise<Commission[]> {
    if (ids.length === 0) return [];

    try {
      const resultMap = await batchLoadByIds<any>(TABLES.COMMISSIONS, ids);
      return ids
        .map(id => resultMap.get(id))
        .filter(Boolean)
        .map(data => this.transformFromDB(data));
    } catch (error) {
      throw this.wrapError(error, 'findByIds');
    }
  }

  async findByPolicy(policyId: string): Promise<Commission[]> {
    return queryPerformance.trackQuery('findByPolicy', 'commissions', async () => {
      try {
        const { data, error } = await this.client
          .from(this.tableName)
          .select('*')
          .eq('policy_id', policyId)
          .order('created_at', { ascending: false });

        if (error) {
          throw this.handleError(error, 'findByPolicy');
        }

        return data?.map(this.transformFromDB) || [];
      } catch (error) {
        throw this.wrapError(error, 'findByPolicy');
      }
    });
  }

  async findByAgent(userId: string): Promise<Commission[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('expected_date', { ascending: false });

      if (error) {
        throw this.handleError(error, 'findByAgent');
      }

      return data?.map(this.transformFromDB) || [];
    } catch (error) {
      throw this.wrapError(error, 'findByAgent');
    }
  }

  async findByStatus(status: string): Promise<Commission[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('status', status)
        .order('expected_date', { ascending: false });

      if (error) {
        throw this.handleError(error, 'findByStatus');
      }

      return data?.map(this.transformFromDB) || [];
    } catch (error) {
      throw this.wrapError(error, 'findByStatus');
    }
  }

  async findByCarrier(carrierId: string): Promise<Commission[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('carrier_id', carrierId)
        .order('expected_date', { ascending: false });

      if (error) {
        throw this.handleError(error, 'findByCarrier');
      }

      return data?.map(this.transformFromDB) || [];
    } catch (error) {
      throw this.wrapError(error, 'findByCarrier');
    }
  }

  async findByDateRange(startDate: Date, endDate: Date, dateField: 'expected_date' | 'actual_date' = 'expected_date'): Promise<Commission[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .gte(dateField, startDate.toISOString().split('T')[0])
        .lte(dateField, endDate.toISOString().split('T')[0])
        .order(dateField, { ascending: false });

      if (error) {
        throw this.handleError(error, 'findByDateRange');
      }

      return data?.map(this.transformFromDB) || [];
    } catch (error) {
      throw this.wrapError(error, 'findByDateRange');
    }
  }

  async getMonthlyEarnings(userId: string, year: number, month: number): Promise<{
    expected: number;
    actual: number;
    pending: number;
    count: number;
  }> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const { data, error } = await this.client
        .from(this.tableName)
        .select('commission_amount, status, actual_date')
        .eq('user_id', userId)
        .gte('month_earned', month)
        .eq('year_earned', year);

      if (error) {
        throw this.handleError(error, 'getMonthlyEarnings');
      }

      const commissions = data || [];
      const expected = commissions.reduce((sum, c) => sum + parseFloat(c.commission_amount || '0'), 0);
      const actual = commissions
        .filter(c => c.status === 'paid' && c.actual_date)
        .reduce((sum, c) => sum + parseFloat(c.commission_amount || '0'), 0);
      const pending = commissions
        .filter(c => c.status === 'expected')
        .reduce((sum, c) => sum + parseFloat(c.commission_amount || '0'), 0);

      return {
        expected,
        actual,
        pending,
        count: commissions.length
      };
    } catch (error) {
      throw this.wrapError(error, 'getMonthlyEarnings');
    }
  }

  async getYearToDateSummary(userId: string, year: number): Promise<{
    totalExpected: number;
    totalActual: number;
    totalPending: number;
    monthlyBreakdown: Array<{
      month: number;
      expected: number;
      actual: number;
      pending: number;
    }>;
  }> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('commission_amount, status, month_earned, year_earned')
        .eq('user_id', userId)
        .eq('year_earned', year)
        .order('month_earned', { ascending: true });

      if (error) {
        throw this.handleError(error, 'getYearToDateSummary');
      }

      const commissions = data || [];

      // Calculate totals
      const totalExpected = commissions.reduce((sum, c) => sum + parseFloat(c.commission_amount || '0'), 0);
      const totalActual = commissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + parseFloat(c.commission_amount || '0'), 0);
      const totalPending = commissions
        .filter(c => c.status === 'expected')
        .reduce((sum, c) => sum + parseFloat(c.commission_amount || '0'), 0);

      // Group by month
      const monthlyMap = new Map<number, { expected: number; actual: number; pending: number }>();

      commissions.forEach(c => {
        const month = c.month_earned;
        const amount = parseFloat(c.commission_amount || '0');

        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { expected: 0, actual: 0, pending: 0 });
        }

        const monthData = monthlyMap.get(month)!;
        monthData.expected += amount;

        if (c.status === 'paid') {
          monthData.actual += amount;
        } else if (c.status === 'expected') {
          monthData.pending += amount;
        }
      });

      const monthlyBreakdown = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        ...data
      }));

      return {
        totalExpected,
        totalActual,
        totalPending,
        monthlyBreakdown
      };
    } catch (error) {
      throw this.wrapError(error, 'getYearToDateSummary');
    }
  }

  async getCarrierPerformance(carrierId: string, year: number): Promise<{
    totalCommissions: number;
    averageCommission: number;
    policyCount: number;
    conversionRate: number;
  }> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('commission_amount, policy_id')
        .eq('carrier_id', carrierId)
        .eq('year_earned', year);

      if (error) {
        throw this.handleError(error, 'getCarrierPerformance');
      }

      const commissions = data || [];
      const totalCommissions = commissions.reduce((sum, c) => sum + parseFloat(c.commission_amount || '0'), 0);
      const uniquePolicies = new Set(commissions.map(c => c.policy_id)).size;
      const averageCommission = commissions.length > 0 ? totalCommissions / commissions.length : 0;

      return {
        totalCommissions,
        averageCommission,
        policyCount: uniquePolicies,
        conversionRate: uniquePolicies > 0 ? (commissions.length / uniquePolicies) : 0
      };
    } catch (error) {
      throw this.wrapError(error, 'getCarrierPerformance');
    }
  }

  protected transformFromDB(dbRecord: any): Commission {
    return {
      id: dbRecord.id,
      policyId: dbRecord.policy_id,
      userId: dbRecord.user_id,
      client: dbRecord.client, // JSONB field
      carrierId: dbRecord.carrier_id,
      product: dbRecord.product,
      type: dbRecord.type,
      status: dbRecord.status,
      calculationBasis: dbRecord.calculation_basis,
      annualPremium: parseFloat(dbRecord.annual_premium || '0'),
      monthlyPremium: parseFloat(dbRecord.monthly_premium || '0'),
      commissionAmount: parseFloat(dbRecord.commission_amount || '0'),
      commissionRate: parseFloat(dbRecord.commission_rate || '0'),
      advanceMonths: dbRecord.advance_months || 0,
      monthEarned: dbRecord.month_earned,
      yearEarned: dbRecord.year_earned,
      quarterEarned: dbRecord.quarter_earned,
      expectedDate: dbRecord.expected_date ? new Date(dbRecord.expected_date) : undefined,
      actualDate: dbRecord.actual_date ? new Date(dbRecord.actual_date) : undefined,
      paidDate: dbRecord.paid_date ? new Date(dbRecord.paid_date) : undefined,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: new Date(dbRecord.updated_at),
      created_at: new Date(dbRecord.created_at),
      updated_at: new Date(dbRecord.updated_at),
      notes: dbRecord.notes,
    };
  }

  protected transformToDB(data: any, isUpdate = false): any {
    const dbData: any = {};

    if (data.policyId !== undefined) dbData.policy_id = data.policyId;
    if (data.userId !== undefined) dbData.user_id = data.userId;
    if (data.client !== undefined) dbData.client = data.client;
    if (data.carrierId !== undefined) dbData.carrier_id = data.carrierId;
    if (data.product !== undefined) dbData.product = data.product;
    if (data.type !== undefined) dbData.type = data.type;
    if (data.status !== undefined) dbData.status = data.status;
    if (data.calculationBasis !== undefined) dbData.calculation_basis = data.calculationBasis;
    if (data.annualPremium !== undefined) dbData.annual_premium = data.annualPremium;
    if (data.monthlyPremium !== undefined) dbData.monthly_premium = data.monthlyPremium;
    if (data.commissionAmount !== undefined) dbData.commission_amount = data.commissionAmount;
    if (data.commissionRate !== undefined) dbData.commission_rate = data.commissionRate;
    if (data.advanceMonths !== undefined) dbData.advance_months = data.advanceMonths;
    if (data.monthEarned !== undefined) dbData.month_earned = data.monthEarned;
    if (data.yearEarned !== undefined) dbData.year_earned = data.yearEarned;
    if (data.quarterEarned !== undefined) dbData.quarter_earned = data.quarterEarned;
    if (data.expectedDate !== undefined) {
      dbData.expected_date = data.expectedDate instanceof Date
        ? data.expectedDate.toISOString().split('T')[0]
        : data.expectedDate;
    }
    if (data.actualDate !== undefined) {
      dbData.actual_date = data.actualDate instanceof Date
        ? data.actualDate.toISOString().split('T')[0]
        : data.actualDate;
    }
    if (data.paidDate !== undefined) {
      dbData.paid_date = data.paidDate instanceof Date
        ? data.paidDate.toISOString().split('T')[0]
        : data.paidDate;
    }
    if (data.notes !== undefined) dbData.notes = data.notes;

    return dbData;
  }
}