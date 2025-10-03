// /home/nneessen/projects/commissionTracker/src/services/commissions/commissionCalculationService.ts
// Service for automatically calculating commissions based on comp guide data

import { supabase } from '@/services/base/supabase';
import { Database } from '@/types/database.types';
import { ProductType } from '@/types/commission.types';
import { logger } from '@/services/base/logger';

type CompGuideEntry = Database['public']['Tables']['comp_guide']['Row'];

export interface CommissionCalculationParams {
  carrierName?: string; // Use carrier name instead of ID
  carrierId?: string; // Keep for compatibility, will look up name
  productName?: string; // Actual product name
  productType?: ProductType; // Product type for filtering
  annualPremium: number;
  agentId?: string; // Use agent ID instead of user ID
  contractLevelOverride?: number;
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
    carrierName: string,
    productName: string,
    contractLevel: number
  ): Promise<{ rate: number; compGuideId?: string }> {
    try {
      const { data, error } = await supabase
        .from('comp_guide')
        .select('id, commission_percentage')
        .eq('carrier_name', carrierName)
        .eq('product_name', productName)
        .eq('contract_level', contractLevel)
        .maybeSingle();

      if (error) {
        logger.error('CommissionCalculation', 'Error fetching commission rate', error);
        return { rate: 0 };
      }

      if (!data) {
        // Try to find by product type if product name not found
        logger.warn('CommissionCalculation', 'No comp guide entry found by product name', {
          carrierName,
          productName,
          contractLevel
        });
        return { rate: 0 };
      }

      return {
        rate: Number(data.commission_percentage),
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
      carrierName,
      carrierId,
      productName,
      annualPremium,
      agentId,
      contractLevelOverride
    } = params;

    try {
      // Get carrier name if only ID provided
      let actualCarrierName = carrierName;
      if (!actualCarrierName && carrierId) {
        actualCarrierName = await this.getCarrierName(carrierId) || '';
      }

      if (!actualCarrierName) {
        throw new Error('Carrier name not found');
      }

      // Get contract level (use override or fetch from agent)
      let contractLevel = contractLevelOverride || 100;
      if (!contractLevelOverride && agentId) {
        contractLevel = await this.getAgentContractLevel(agentId);
      }

      // Get commission rate from comp guide
      const { rate, compGuideId } = await this.getCommissionRate(
        actualCarrierName,
        productName || '',
        contractLevel
      );

      // Calculate commission amount
      const commissionAmount = (annualPremium * rate) / 100;

      logger.info('CommissionCalculation', 'Commission calculated', {
        carrierName: actualCarrierName,
        productName,
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
   * Get available products for a carrier by name
   */
  async getCarrierProductsByName(carrierName: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('comp_guide')
        .select('product_name')
        .eq('carrier_name', carrierName)
        .order('product_name');

      if (error) {
        logger.error('CommissionCalculation', 'Error fetching carrier products', error);
        return [];
      }

      // Get unique product names
      const uniqueProducts = Array.from(new Set(data?.map(item => item.product_name) || []));
      return uniqueProducts;
    } catch (error) {
      logger.error('CommissionCalculation', 'Failed to get carrier products', error);
      return [];
    }
  }

  /**
   * Get available products for a carrier by ID
   */
  async getCarrierProducts(carrierId: string): Promise<string[]> {
    const carrierName = await this.getCarrierName(carrierId);
    if (!carrierName) return [];
    return this.getCarrierProductsByName(carrierName);
  }

  /**
   * Validate if a commission rate exists for given parameters
   */
  async hasCommissionRate(
    carrierName: string,
    productName: string,
    contractLevel: number
  ): Promise<boolean> {
    const { rate } = await this.getCommissionRate(carrierName, productName, contractLevel);
    return rate > 0;
  }

  /**
   * Get all commission rates for a carrier
   */
  async getCarrierCommissionRates(carrierName: string): Promise<CompGuideEntry[]> {
    try {
      const { data, error } = await supabase
        .from('comp_guide')
        .select('*')
        .eq('carrier_name', carrierName)
        .order('product_name, contract_level');

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
  async getProductCommissionRates(carrierName: string, productName: string): Promise<CompGuideEntry[]> {
    try {
      const { data, error } = await supabase
        .from('comp_guide')
        .select('*')
        .eq('carrier_name', carrierName)
        .eq('product_name', productName)
        .order('contract_level DESC');

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