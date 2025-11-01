// src/services/commissionRateService.ts
import { logger } from '../base/logger';

import { supabase, TABLES } from '../base/supabase';
import {
  CommissionRate,
  NewCommissionRateForm,
  UpdateCommissionRateForm,
  UserCommissionProfile,
  ProductCommissionBreakdown,
  CommissionDataQuality
} from '../../types/product.types';

export interface CreateCommissionRateData {
  carrierId: string;
  productId: string;
  contractLevel: number;
  commissionPercentage: number;
}

export interface UpdateCommissionRateData extends Partial<CreateCommissionRateData> {
  id: string;
}

class CommissionRateService {
  async getAll(): Promise<CommissionRate[]> {
    const { data, error } = await supabase
      .from(TABLES.COMMISSION_RATES)
      .select('*')
      .order('contract_level', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch commission rates: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getByProduct(productId: string): Promise<CommissionRate[]> {
    const { data, error } = await supabase
      .from(TABLES.COMMISSION_RATES)
      .select('*')
      .eq('product_id', productId)
      .order('contract_level', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch commission rates for product: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getByCarrier(carrierId: string): Promise<CommissionRate[]> {
    const { data, error } = await supabase
      .from(TABLES.COMMISSION_RATES)
      .select('*')
      .eq('carrier_id', carrierId)
      .order('contract_level', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch commission rates for carrier: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getByCarrierAndProduct(carrierId: string, productId: string): Promise<CommissionRate[]> {
    const { data, error } = await supabase
      .from(TABLES.COMMISSION_RATES)
      .select('*')
      .eq('carrier_id', carrierId)
      .eq('product_id', productId)
      .order('contract_level', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch commission rates for carrier and product: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getByContractLevel(contractLevel: number): Promise<CommissionRate[]> {
    const { data, error } = await supabase
      .from(TABLES.COMMISSION_RATES)
      .select(`
        *,
        carriers!inner(name),
        products!inner(product_name, product_type)
      `)
      .eq('contract_level', contractLevel)
      .order('carriers(name)', { ascending: true })
      .order('products(product_name)', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch commission rates for contract level: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getRate(carrierId: string, productId: string, contractLevel: number): Promise<number | null> {
    const { data, error } = await supabase
      .from(TABLES.COMMISSION_RATES)
      .select('commission_percentage')
      .eq('carrier_id', carrierId)
      .eq('product_id', productId)
      .eq('contract_level', contractLevel)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch commission rate: ${error.message}`);
    }

    return data ? parseFloat(data.commission_percentage) : null;
  }

  async create(rateData: CreateCommissionRateData): Promise<CommissionRate> {
    const dbData = this.transformToDB(rateData);

    const { data, error } = await supabase
      .from(TABLES.COMMISSION_RATES)
      .insert(dbData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create commission rate: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async createBulk(ratesData: CreateCommissionRateData[]): Promise<CommissionRate[]> {
    const dbData = ratesData.map(this.transformToDB);

    const { data, error } = await supabase
      .from(TABLES.COMMISSION_RATES)
      .insert(dbData)
      .select();

    if (error) {
      throw new Error(`Failed to create commission rates: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async update(id: string, updates: Partial<CreateCommissionRateData>): Promise<CommissionRate> {
    const dbData = this.transformToDB(updates);
    dbData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(TABLES.COMMISSION_RATES)
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update commission rate: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.COMMISSION_RATES)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete commission rate: ${error.message}`);
    }
  }

  async deleteByProduct(productId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.COMMISSION_RATES)
      .delete()
      .eq('product_id', productId);

    if (error) {
      throw new Error(`Failed to delete commission rates for product: ${error.message}`);
    }
  }

  async deleteByCarrier(carrierId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.COMMISSION_RATES)
      .delete()
      .eq('carrier_id', carrierId);

    if (error) {
      throw new Error(`Failed to delete commission rates for carrier: ${error.message}`);
    }
  }

  private transformFromDB(dbData: any): CommissionRate {
    return {
      id: dbData.id,
      carrierId: dbData.carrier_id,
      productId: dbData.product_id,
      contractLevel: dbData.contract_level,
      commissionPercentage: parseFloat(dbData.commission_percentage),
      createdAt: new Date(dbData.created_at),
      updatedAt: dbData.updated_at ? new Date(dbData.updated_at) : undefined,
    };
  }

  private transformToDB(data: Partial<CreateCommissionRateData>): any {
    const dbData: any = {};

    if (data.carrierId !== undefined) dbData.carrier_id = data.carrierId;
    if (data.productId !== undefined) dbData.product_id = data.productId;
    if (data.contractLevel !== undefined) dbData.contract_level = data.contractLevel;
    if (data.commissionPercentage !== undefined) dbData.commission_percentage = data.commissionPercentage;

    return dbData;
  }

  // ============================================================================
  // User Commission Profile Methods
  // ============================================================================

  /**
   * Get comprehensive commission rate profile for a user
   * Calculates weighted average based on actual sales mix and contract level
   *
   * @param userId - User ID to calculate profile for
   * @param lookbackMonths - How many months of sales history to analyze (default: 12)
   * @returns UserCommissionProfile with rates, breakdown, and data quality
   * @throws Error if user not found or contract level not configured
   */
  async getUserCommissionProfile(
    userId: string,
    lookbackMonths: number = 12
  ): Promise<UserCommissionProfile> {
    try {
      // Call the PostgreSQL function that does the heavy lifting
      const { data, error } = await supabase.rpc('get_user_commission_profile', {
        p_user_id: userId,
        p_lookback_months: lookbackMonths
      });

      if (error) {
        logger.error('Failed to get user commission profile', { error, userId, lookbackMonths });
        throw new Error(`Failed to calculate commission profile: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No commission rate data available for user');
      }

      const result = data[0];

      // Parse the JSONB product breakdown
      const breakdown: ProductCommissionBreakdown[] = (result.product_breakdown || []).map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        carrierName: item.carrierName,
        commissionRate: parseFloat(item.commissionRate),
        premiumWeight: parseFloat(item.premiumWeight),
        totalPremium: parseFloat(item.totalPremium),
        policyCount: parseInt(item.policyCount, 10),
        effectiveDate: new Date(item.effectiveDate)
      }));

      // Determine recommended rate based on data quality
      const dataQuality: CommissionDataQuality = result.data_quality;
      const useWeighted = dataQuality === 'HIGH' || dataQuality === 'MEDIUM';
      const recommendedRate = useWeighted
        ? parseFloat(result.weighted_avg_rate)
        : parseFloat(result.simple_avg_rate);

      logger.info('User commission profile calculated', {
        userId,
        contractLevel: result.contract_level,
        dataQuality,
        recommendedRate,
        lookbackMonths
      });

      return {
        userId,
        contractLevel: result.contract_level,
        simpleAverageRate: parseFloat(result.simple_avg_rate),
        weightedAverageRate: parseFloat(result.weighted_avg_rate),
        recommendedRate,
        productBreakdown: breakdown,
        dataQuality,
        calculatedAt: new Date(result.calculated_at),
        lookbackMonths
      };
    } catch (error) {
      logger.error('Error in getUserCommissionProfile', { error, userId, lookbackMonths });
      throw error;
    }
  }

  /**
   * Get just the recommended commission rate for a user (convenience method)
   *
   * @param userId - User ID
   * @param lookbackMonths - Lookback period (default: 12)
   * @returns Recommended commission rate as decimal (e.g., 0.85 for 85%)
   */
  async getUserRecommendedRate(userId: string, lookbackMonths: number = 12): Promise<number> {
    const profile = await this.getUserCommissionProfile(userId, lookbackMonths);
    return profile.recommendedRate;
  }

  /**
   * Check if user has sufficient data for accurate commission rate calculations
   *
   * @param userId - User ID
   * @returns true if data quality is HIGH or MEDIUM
   */
  async hasGoodCommissionData(userId: string): Promise<boolean> {
    try {
      const profile = await this.getUserCommissionProfile(userId);
      return profile.dataQuality === 'HIGH' || profile.dataQuality === 'MEDIUM';
    } catch (error) {
      logger.warn('Unable to check commission data quality', { error, userId });
      return false;
    }
  }
}

export const commissionRateService = new CommissionRateService();