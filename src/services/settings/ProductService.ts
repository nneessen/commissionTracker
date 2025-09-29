// src/services/settings/ProductService.ts

import { supabase } from '../base/supabase';
import { CompGuideEntry } from '../../types/compGuide.types';
import { ProductSummary } from '../../types/compGuide.types';

interface ProductInfo {
  product_name: string;
  carrier_count: number;
  avg_commission: number;
  min_contract_level: number;
  max_contract_level: number;
  is_active: boolean;
  carrier_names?: string[];
}

interface ProductByCarrier {
  carrier_id: string;
  carrier_name: string;
  product_name: string;
  product_count: number;
  avg_commission: number;
  contract_levels: number[];
}

export interface ServiceResponse<T> {
  data?: T;
  success: boolean;
  error?: string;
}

class ProductService {
  private readonly tableName = 'comp_guide';

  async getAllProducts(): Promise<ServiceResponse<ProductInfo[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          product_name,
          contract_level,
          commission_percentage,
          is_active,
          carriers(name)
        `)
        .order('product_name');

      if (error) {
        throw new Error(`Failed to fetch products: ${error.message}`);
      }

      // Aggregate products
      const productMap = new Map<string, any>();

      data?.forEach((item: any) => {
        const key = item.product_name;
        if (!productMap.has(key)) {
          productMap.set(key, {
            product_name: key,
            carriers: new Set(),
            commissions: [],
            contract_levels: new Set(),
            is_active: false
          });
        }

        const product = productMap.get(key);
        if (item.carriers?.name) {
          product.carriers.add(item.carriers.name);
        }
        product.commissions.push(parseFloat(item.commission_percentage));
        product.contract_levels.add(item.contract_level);
        if (item.is_active) {
          product.is_active = true;
        }
      });

      const products: ProductInfo[] = Array.from(productMap.values()).map(product => ({
        product_name: product.product_name,
        carrier_count: product.carriers.size,
        avg_commission: product.commissions.reduce((a: number, b: number) => a + b, 0) / product.commissions.length,
        min_contract_level: Math.min(...product.contract_levels),
        max_contract_level: Math.max(...product.contract_levels),
        is_active: product.is_active,
        carrier_names: Array.from(product.carriers)
      }));

      return {
        data: products,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getProductsByCarrier(carrierId: string): Promise<ServiceResponse<ProductByCarrier[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          product_name,
          contract_level,
          commission_percentage,
          carriers(name)
        `)
        .eq('carrier_id', carrierId)
        .eq('is_active', true)
        .order('product_name');

      if (error) {
        throw new Error(`Failed to fetch products by carrier: ${error.message}`);
      }

      // Aggregate by product
      const productMap = new Map<string, any>();
      let carrierName = '';

      data?.forEach((item: any) => {
        if (!carrierName && item.carriers?.name) {
          carrierName = item.carriers.name;
        }

        const key = item.product_name;
        if (!productMap.has(key)) {
          productMap.set(key, {
            product_name: key,
            commissions: [],
            contract_levels: new Set()
          });
        }

        const product = productMap.get(key);
        product.commissions.push(parseFloat(item.commission_percentage));
        product.contract_levels.add(item.contract_level);
      });

      const products: ProductByCarrier[] = Array.from(productMap.values()).map(product => ({
        carrier_id: carrierId,
        carrier_name: carrierName,
        product_name: product.product_name,
        product_count: 1,
        avg_commission: product.commissions.reduce((a: number, b: number) => a + b, 0) / product.commissions.length,
        contract_levels: Array.from(product.contract_levels).sort((a, b) => a - b)
      }));

      return {
        data: products,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getUniqueProductNames(): Promise<ServiceResponse<string[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('product_name')
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to fetch product names: ${error.message}`);
      }

      const uniqueNames = [...new Set(data?.map(item => item.product_name) || [])];
      uniqueNames.sort();

      return {
        data: uniqueNames,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async searchProducts(searchTerm: string): Promise<ServiceResponse<ProductInfo[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          product_name,
          contract_level,
          commission_percentage,
          is_active,
          carriers(name)
        `)
        .ilike('product_name', `%${searchTerm}%`)
        .order('product_name');

      if (error) {
        throw new Error(`Failed to search products: ${error.message}`);
      }

      // Aggregate products (same logic as getAllProducts)
      const productMap = new Map<string, any>();

      data?.forEach((item: any) => {
        const key = item.product_name;
        if (!productMap.has(key)) {
          productMap.set(key, {
            product_name: key,
            carriers: new Set(),
            commissions: [],
            contract_levels: new Set(),
            is_active: false
          });
        }

        const product = productMap.get(key);
        if (item.carriers?.name) {
          product.carriers.add(item.carriers.name);
        }
        product.commissions.push(parseFloat(item.commission_percentage));
        product.contract_levels.add(item.contract_level);
        if (item.is_active) {
          product.is_active = true;
        }
      });

      const products: ProductInfo[] = Array.from(productMap.values()).map(product => ({
        product_name: product.product_name,
        carrier_count: product.carriers.size,
        avg_commission: product.commissions.reduce((a: number, b: number) => a + b, 0) / product.commissions.length,
        min_contract_level: Math.min(...product.contract_levels),
        max_contract_level: Math.max(...product.contract_levels),
        is_active: product.is_active,
        carrier_names: Array.from(product.carriers)
      }));

      return {
        data: products,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getProductSummary(productName: string): Promise<ServiceResponse<ProductSummary>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          commission_percentage,
          contract_level,
          is_active,
          carriers(name)
        `)
        .eq('product_name', productName);

      if (error) {
        throw new Error(`Failed to fetch product summary: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return {
          error: 'Product not found',
          success: false
        };
      }

      const carriers = new Set<string>();
      const commissions: number[] = [];
      const contractLevels: number[] = [];
      let isActive = false;

      data.forEach((item: any) => {
        if (item.carriers?.name) {
          carriers.add(item.carriers.name);
        }
        commissions.push(parseFloat(item.commission_percentage));
        contractLevels.push(item.contract_level);
        if (item.is_active) {
          isActive = true;
        }
      });

      const summary: ProductSummary = {
        product_name: productName,
        carrier_count: carriers.size,
        avg_commission: commissions.reduce((a, b) => a + b, 0) / commissions.length,
        min_contract_level: Math.min(...contractLevels),
        max_contract_level: Math.max(...contractLevels),
        is_active: isActive
      };

      return {
        data: summary,
        success: true
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      };
    }
  }

  async getCarriersForProduct(productName: string): Promise<ServiceResponse<{ carrier_id: string; carrier_name: string; }[]>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          carrier_id,
          carriers(name)
        `)
        .eq('product_name', productName)
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to fetch carriers for product: ${error.message}`);
      }

      const carriersMap = new Map<string, string>();

      data?.forEach((item: any) => {
        if (item.carriers?.name) {
          carriersMap.set(item.carrier_id, item.carriers.name);
        }
      });

      const carriers = Array.from(carriersMap.entries()).map(([id, name]) => ({
        carrier_id: id,
        carrier_name: name
      }));

      return {
        data: carriers,
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
  async getAll(): Promise<ProductInfo[]> {
    const result = await this.getAllProducts();
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get products');
  }

  async getByCarrier(carrierId: string): Promise<ProductByCarrier[]> {
    const result = await this.getProductsByCarrier(carrierId);
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get products by carrier');
  }

  async search(searchTerm: string): Promise<ProductInfo[]> {
    const result = await this.searchProducts(searchTerm);
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to search products');
  }
}

export const productService = new ProductService();