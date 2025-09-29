// src/services/settings/CompGuideRepository.ts
import { BaseRepository } from '../base/BaseRepository';
import { CompGuideEntry } from '../../types/compGuide.types';

export interface CompGuideCreateData {
  carrier_name: string;
  product_name: string;
  contract_level: number;
  commission_percentage: number;
  first_year_percentage?: number;
  renewal_percentage?: number;
  trail_percentage?: number;
  effective_date: Date;
  expiration_date?: Date;
  is_active?: boolean;
  notes?: string;
}

export interface CompGuideUpdateData extends Partial<CompGuideCreateData> {}

export interface CompGuideDBRecord {
  id: string;
  carrier_name: string;
  product_name: string;
  contract_level: number;
  commission_percentage: number;
  first_year_percentage?: number;
  renewal_percentage?: number;
  trail_percentage?: number;
  effective_date: string;
  expiration_date?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface CompGuideFilters {
  carrier_name?: string;
  product_name?: string;
  contract_level?: number;
  is_active?: boolean;
  min_commission?: number;
  max_commission?: number;
}

export class CompGuideRepository extends BaseRepository<
  CompGuideEntry,
  CompGuideCreateData,
  CompGuideUpdateData
> {
  constructor() {
    super('comp_guide');
  }

  protected transformFromDB(dbRecord: CompGuideDBRecord): CompGuideEntry {
    return {
      id: dbRecord.id,
      carrier_name: dbRecord.carrier_name,
      product_name: dbRecord.product_name,
      contract_level: dbRecord.contract_level,
      commission_percentage: dbRecord.commission_percentage,
      first_year_percentage: dbRecord.first_year_percentage,
      renewal_percentage: dbRecord.renewal_percentage,
      trail_percentage: dbRecord.trail_percentage,
      effective_date: new Date(dbRecord.effective_date),
      expiration_date: dbRecord.expiration_date ? new Date(dbRecord.expiration_date) : undefined,
      is_active: dbRecord.is_active,
      notes: dbRecord.notes,
      created_at: new Date(dbRecord.created_at),
      updated_at: dbRecord.updated_at ? new Date(dbRecord.updated_at) : undefined
    };
  }

  protected transformToDB(data: CompGuideCreateData | CompGuideUpdateData, isUpdate = false): any {
    const dbData: any = {};

    if (data.carrier_name !== undefined) dbData.carrier_name = data.carrier_name;
    if (data.product_name !== undefined) dbData.product_name = data.product_name;
    if (data.contract_level !== undefined) dbData.contract_level = data.contract_level;
    if (data.commission_percentage !== undefined) dbData.commission_percentage = data.commission_percentage;
    if (data.first_year_percentage !== undefined) dbData.first_year_percentage = data.first_year_percentage;
    if (data.renewal_percentage !== undefined) dbData.renewal_percentage = data.renewal_percentage;
    if (data.trail_percentage !== undefined) dbData.trail_percentage = data.trail_percentage;
    if (data.effective_date !== undefined) dbData.effective_date = data.effective_date.toISOString();
    if (data.expiration_date !== undefined) {
      dbData.expiration_date = data.expiration_date ? data.expiration_date.toISOString() : null;
    }
    if (data.is_active !== undefined) dbData.is_active = data.is_active;
    if (data.notes !== undefined) dbData.notes = data.notes;

    // Set defaults for create operations
    if (!isUpdate) {
      if (dbData.is_active === undefined) dbData.is_active = true;
    }

    return dbData;
  }

  // Comp guide specific methods with carrier joins
  async findAllWithCarriers(): Promise<CompGuideEntry[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .order('carrier_name')
        .order('product_name')
        .order('contract_level');

      if (error) {
        throw this.handleError(error, 'findAllWithCarriers');
      }

      return data?.map((record: any) => this.transformFromDB(record)) || [];
    } catch (error) {
      throw this.wrapError(error, 'findAllWithCarriers');
    }
  }

  async findByCarrier(carrierName: string): Promise<CompGuideEntry[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('carrier_name', carrierName)
        .order('product_name')
        .order('contract_level');

      if (error) {
        throw this.handleError(error, 'findByCarrier');
      }

      return data?.map((record: any) => this.transformFromDB(record)) || [];
    } catch (error) {
      throw this.wrapError(error, 'findByCarrier');
    }
  }

  async findByProduct(productName: string): Promise<CompGuideEntry[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('product_name', productName)
        .order('carrier_name')
        .order('contract_level');

      if (error) {
        throw this.handleError(error, 'findByProduct');
      }

      return data?.map((record: any) => this.transformFromDB(record)) || [];
    } catch (error) {
      throw this.wrapError(error, 'findByProduct');
    }
  }

  async findByContractLevel(contractLevel: number): Promise<CompGuideEntry[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('contract_level', contractLevel)
        .order('carrier_name')
        .order('product_name');

      if (error) {
        throw this.handleError(error, 'findByContractLevel');
      }

      return data?.map((record: any) => this.transformFromDB(record)) || [];
    } catch (error) {
      throw this.wrapError(error, 'findByContractLevel');
    }
  }

  async findByFiltersWithCarriers(filters: CompGuideFilters): Promise<CompGuideEntry[]> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('*');

      // Apply filters
      if (filters.carrier_name) {
        query = query.eq('carrier_name', filters.carrier_name);
      }
      if (filters.product_name) {
        query = query.ilike('product_name', `%${filters.product_name}%`);
      }
      if (filters.contract_level) {
        query = query.eq('contract_level', filters.contract_level);
      }
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters.min_commission) {
        query = query.gte('commission_percentage', filters.min_commission);
      }
      if (filters.max_commission) {
        query = query.lte('commission_percentage', filters.max_commission);
      }

      query = query.order('carrier_name').order('product_name').order('contract_level');

      const { data, error } = await query;

      if (error) {
        throw this.handleError(error, 'findByFiltersWithCarriers');
      }

      return data?.map((record: any) => this.transformFromDB(record)) || [];
    } catch (error) {
      throw this.wrapError(error, 'findByFiltersWithCarriers');
    }
  }

  async findExistingEntry(
    carrierName: string,
    productName: string,
    contractLevel: number,
    excludeId?: string
  ): Promise<CompGuideEntry | null> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('*')
        .eq('carrier_name', carrierName)
        .eq('product_name', productName)
        .eq('contract_level', contractLevel);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw this.handleError(error, 'findExistingEntry');
      }

      return data ? this.transformFromDB(data) : null;
    } catch (error) {
      throw this.wrapError(error, 'findExistingEntry');
    }
  }

  async getContractLevels(): Promise<number[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('contract_level')
        .order('contract_level');

      if (error) {
        throw this.handleError(error, 'getContractLevels');
      }

      const levels = [...new Set(data?.map(item => item.contract_level) || [])];
      return levels.sort((a, b) => a - b);
    } catch (error) {
      throw this.wrapError(error, 'getContractLevels');
    }
  }

  async getProductsByCarrier(carrierName: string): Promise<string[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('product_name')
        .eq('carrier_name', carrierName)
        .order('product_name');

      if (error) {
        throw this.handleError(error, 'getProductsByCarrier');
      }

      return [...new Set(data?.map(item => item.product_name) || [])];
    } catch (error) {
      throw this.wrapError(error, 'getProductsByCarrier');
    }
  }

  async getCommissionRate(
    carrierName: string,
    productName: string,
    contractLevel: number
  ): Promise<number | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('commission_percentage')
        .eq('carrier_name', carrierName)
        .eq('product_name', productName)
        .eq('contract_level', contractLevel)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw this.handleError(error, 'getCommissionRate');
      }

      return data?.commission_percentage || null;
    } catch (error) {
      throw this.wrapError(error, 'getCommissionRate');
    }
  }

  // Bulk operations for data import
  async bulkInsert(entries: CompGuideCreateData[]): Promise<CompGuideEntry[]> {
    try {
      const dbEntries = entries.map(entry => this.transformToDB(entry));

      const { data, error } = await this.client
        .from(this.tableName)
        .insert(dbEntries)
        .select();

      if (error) {
        throw this.handleError(error, 'bulkInsert');
      }

      return data?.map(this.transformFromDB.bind(this)) || [];
    } catch (error) {
      throw this.wrapError(error, 'bulkInsert');
    }
  }
}