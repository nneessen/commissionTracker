// src/services/compGuideService.ts

import { supabase, TABLES } from '../base/supabase';
import { CompGuideEntry, CompGuideLookup, CommissionCalculation } from '../../types/product.types';

class CompGuideService {
  async getAll(): Promise<CompGuideEntry[]> {
    const { data, error } = await supabase
      .from(TABLES.COMP_GUIDE)
      .select('*')
      .order('carrier_name', { ascending: true })
      .order('product_name', { ascending: true })
      .order('contract_level', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch comp guide entries: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getByCarrier(carrierName: string): Promise<CompGuideEntry[]> {
    const { data, error } = await supabase
      .from(TABLES.COMP_GUIDE)
      .select('*')
      .eq('carrier_name', carrierName)
      .order('product_name', { ascending: true })
      .order('contract_level', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch comp guide entries for carrier: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getByCarrierAndProduct(carrierName: string, productName: string): Promise<CompGuideEntry[]> {
    const { data, error } = await supabase
      .from(TABLES.COMP_GUIDE)
      .select('*')
      .eq('carrier_name', carrierName)
      .eq('product_name', productName)
      .order('contract_level', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch comp guide entries for carrier and product: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getCommissionPercentage(lookup: CompGuideLookup): Promise<number | null> {
    const { data, error } = await supabase
      .from(TABLES.COMP_GUIDE)
      .select('commission_percentage')
      .eq('carrier_name', lookup.carrierName)
      .eq('product_name', lookup.productName)
      .eq('contract_level', lookup.contractLevel)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch commission percentage: ${error.message}`);
    }

    return data ? parseFloat(data.commission_percentage) : null;
  }

  async calculateCommission(
    monthlyPremium: number,
    carrierName: string,
    productName: string,
    contractLevel: number,
    advanceMonths: number = 9
  ): Promise<CommissionCalculation | null> {
    const commissionPercentage = await this.getCommissionPercentage({
      carrierName,
      productName,
      contractLevel,
    });

    if (commissionPercentage === null) {
      return null;
    }

    const totalCommission = monthlyPremium * advanceMonths * (commissionPercentage / 100);

    return {
      monthlyPremium,
      commissionPercentage,
      advanceMonths,
      totalCommission,
    };
  }

  async getUniqueCarriers(): Promise<string[]> {
    const { data, error } = await supabase
      .from(TABLES.COMP_GUIDE)
      .select('carrier_name')
      .order('carrier_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch unique carriers: ${error.message}`);
    }

    const uniqueCarriers = Array.from(new Set(data?.map(item => item.carrier_name) || []));
    return uniqueCarriers;
  }

  async getProductsByCarrier(carrierName: string): Promise<string[]> {
    const { data, error } = await supabase
      .from(TABLES.COMP_GUIDE)
      .select('product_name')
      .eq('carrier_name', carrierName)
      .order('product_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch products for carrier: ${error.message}`);
    }

    const uniqueProducts = Array.from(new Set(data?.map(item => item.product_name) || []));
    return uniqueProducts;
  }

  async getContractLevels(): Promise<number[]> {
    const { data, error } = await supabase
      .from(TABLES.COMP_GUIDE)
      .select('contract_level')
      .order('contract_level', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch contract levels: ${error.message}`);
    }

    const uniqueLevels = Array.from(new Set(data?.map(item => item.contract_level) || []));
    return uniqueLevels;
  }

  async getContractLevelsByCarrierAndProduct(carrierName: string, productName: string): Promise<number[]> {
    const { data, error } = await supabase
      .from(TABLES.COMP_GUIDE)
      .select('contract_level')
      .eq('carrier_name', carrierName)
      .eq('product_name', productName)
      .order('contract_level', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch contract levels for carrier and product: ${error.message}`);
    }

    return data?.map(item => item.contract_level) || [];
  }

  private transformFromDB(dbRecord: any): CompGuideEntry {
    return {
      id: dbRecord.id,
      carrierName: dbRecord.carrier_name,
      productName: dbRecord.product_name,
      contractLevel: dbRecord.contract_level,
      commissionPercentage: parseFloat(dbRecord.commission_percentage),
      productType: dbRecord.product_type || 'term',
      isActive: dbRecord.is_active !== false,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: new Date(dbRecord.updated_at),
    };
  }
}

export const compGuideService = new CompGuideService();