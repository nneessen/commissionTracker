// /home/nneessen/projects/commissionTracker/src/services/commissions/commissionCalculationService.ts
// Service for automatically calculating commissions based on comp guide data

import { supabase } from '@/services/base/supabase';
import { Database } from '@/types/database.types';
import { ProductType } from '@/types/commission.types';
import { logger } from '@/services/base/logger';

type CompGuideEntry = Database['public']['Tables']['comp_guide']['Row'];

export interface CommissionCalculationParams {
  carrierId: string; // Required: carrier UUID
  productType: ProductType; // Required: product type from enum
  annualPremium: number;
  agentId?: string; // Optional: use agent ID to get contract level
  contractLevelOverride?: number; // Optional: override agent's contract level
}

export interface CommissionCalculationResult {
  commissionPercentage: number;
  commissionAmount: number;
  contractLevel: number;
  compGuideId?: string;
  isAutoCalculated: boolean;
}

class CommissionCalculationService {
  private static instance: CommissionCalculationService;

  private constructor() {}

  public static getInstance(): CommissionCalculationService {
    if (!CommissionCalculationService.instance) {
      CommissionCalculationService.instance = new CommissionCalculationService();
    }
    return CommissionCalculationService.instance;
  }

  /**
   * Get carrier name from carrier ID
   */
  async getCarrierName(carrierId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('carriers')
        .select('name')
        .eq('id', carrierId)
        .single();

      if (error || !data) {
        logger.warn('CommissionCalculation', 'Carrier not found', { carrierId });
        return null;
      }

      return data.name;
    } catch (error) {
      logger.error('CommissionCalculation', 'Error getting carrier name', error);
      return null;
    }
  }

  /**
   * Get the agent's contract level
   */
  async getAgentContractLevel(agentId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('contract_comp_level')
        .eq('id', agentId)
        .single();

      if (error) {
        logger.warn('CommissionCalculation', 'No agent found, using default', { agentId });
        return 100; // Default contract level
      }

      return data?.contract_comp_level || 100;
    } catch (error) {
      logger.error('CommissionCalculation', 'Error getting agent contract level', error);
      return 100;
    }
  }

  /**
   * Get commission rate from comp guide using carrier name
   */
  async getCommissionRate(
    carrierId: string,
    productType: ProductType,
    contractLevel: number
  ): Promise<{ rate: number; compGuideId?: string }> {
    try {
      const { data, error } = await supabase
        .from('comp_guide')
        .select('id, commission_percentage')
        .eq('carrier_id', carrierId)
        .eq('product_type', productType)
        .eq('contract_level', contractLevel)
        .lte('effective_date', new Date().toISOString())
        .or(`expiration_date.is.null,expiration_date.gte.${new Date().toISOString()}`)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.error('CommissionCalculation', 'Error fetching commission rate', error);
        return { rate: 0 };
      }

      if (!data) {
        logger.warn('CommissionCalculation', 'No comp guide entry found', {
          carrierId,
          productType,
          contractLevel
        });
        return { rate: 0 };
      }

      return {
        rate: Number(data.commission_percentage) * 100, // Convert decimal to percentage
        compGuideId: data.id
      };
    } catch (error) {
      logger.error('CommissionCalculation', 'Failed to get commission rate', error);
      return { rate: 0 };
    }
  }

  /**
   * Calculate commission for a policy
   */
  async calculateCommission(params: CommissionCalculationParams): Promise<CommissionCalculationResult> {
    const {
      carrierId,
      productType,
      annualPremium,
      agentId,
      contractLevelOverride
    } = params;

    try {
      if (!carrierId || !productType) {
        throw new Error('Carrier ID and product type are required');
      }

      // Get contract level (use override or fetch from agent)
      let contractLevel = contractLevelOverride || 100;
      if (!contractLevelOverride && agentId) {
        contractLevel = await this.getAgentContractLevel(agentId);
      }

      // Get commission rate from comp guide
      const { rate, compGuideId } = await this.getCommissionRate(
        carrierId,
        productType,
        contractLevel
      );

      // Calculate commission amount
      const commissionAmount = (annualPremium * rate) / 100;

      logger.info('CommissionCalculation', 'Commission calculated', {
        carrierId,
        productType,
        contractLevel,
        rate,
        annualPremium,
        commissionAmount
      });

      return {
        commissionPercentage: rate,
        commissionAmount,
        contractLevel,
        compGuideId,
        isAutoCalculated: true
      };
    } catch (error) {
      logger.error('CommissionCalculation', 'Failed to calculate commission', error);

      // Return default values on error
      return {
        commissionPercentage: 0,
        commissionAmount: 0,
        contractLevel: contractLevelOverride || 100,
        isAutoCalculated: false
      };
    }
  }

  /**
   * Get available products for a carrier by ID
   */
  async getCarrierProducts(carrierId: string): Promise<ProductType[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('product_type')
        .eq('carrier_id', carrierId)
        .eq('is_active', true)
        .order('product_type');

      if (error) {
        logger.error('CommissionCalculation', 'Error fetching carrier products', error);
        return [];
      }

      // Get unique product types
      const uniqueTypes = Array.from(new Set(data?.map(item => item.product_type as ProductType) || []));
      return uniqueTypes;
    } catch (error) {
      logger.error('CommissionCalculation', 'Failed to get carrier products', error);
      return [];
    }
  }

  /**
   * Validate if a commission rate exists for given parameters
   */
  async hasCommissionRate(
    carrierId: string,
    productType: ProductType,
    contractLevel: number
  ): Promise<boolean> {
    const { rate } = await this.getCommissionRate(carrierId, productType, contractLevel);
    return rate > 0;
  }

  /**
   * Get all commission rates for a carrier
   */
  async getCarrierCommissionRates(carrierId: string): Promise<CompGuideEntry[]> {
    try {
      const { data, error } = await supabase
        .from('comp_guide')
        .select('*')
        .eq('carrier_id', carrierId)
        .order('product_type, contract_level');

      if (error) {
        logger.error('CommissionCalculation', 'Error fetching carrier rates', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('CommissionCalculation', 'Failed to get carrier rates', error);
      return [];
    }
  }

  /**
   * Get commission rates for a specific product
   */
  async getProductCommissionRates(carrierId: string, productType: ProductType): Promise<CompGuideEntry[]> {
    try {
      const { data, error } = await supabase
        .from('comp_guide')
        .select('*')
        .eq('carrier_id', carrierId)
        .eq('product_type', productType)
        .order('contract_level', { ascending: false });

      if (error) {
        logger.error('CommissionCalculation', 'Error fetching product rates', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('CommissionCalculation', 'Failed to get product rates', error);
      return [];
    }
  }
}

// Export singleton instance
export const commissionCalculationService = CommissionCalculationService.getInstance();