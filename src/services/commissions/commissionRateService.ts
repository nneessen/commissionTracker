// src/services/commissionRateService.ts
import { logger } from '../base/logger';

import { supabase, TABLES } from '../base/supabase';
import { CommissionRate, NewCommissionRateForm, UpdateCommissionRateForm } from '../../types/product.types';

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
}

export const commissionRateService = new CommissionRateService();