// src/services/settings/CarrierRepository.ts
import { BaseRepository } from '../base/BaseRepository';
import { Carrier } from '../../types/carrier.types';

export interface CarrierCreateData {
  name: string;
  short_name?: string;
  is_active?: boolean;
  default_commission_rates?: Record<string, number>;
  contact_info?: {
    email?: string;
    phone?: string;
    website?: string;
    rep_name?: string;
    rep_email?: string;
    rep_phone?: string;
  };
  notes?: string;
}

export interface CarrierUpdateData extends Partial<CarrierCreateData> {}

export interface CarrierDBRecord {
  id: string;
  name: string;
  short_name?: string;
  is_active: boolean;
  default_commission_rates: any; // JSONB
  contact_info: any; // JSONB
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export class CarrierRepository extends BaseRepository<
  Carrier,
  CarrierCreateData,
  CarrierUpdateData
> {
  constructor() {
    super('carriers');
  }

  protected transformFromDB(dbRecord: CarrierDBRecord): Carrier {
    return {
      id: dbRecord.id,
      name: dbRecord.name,
      short_name: dbRecord.short_name,
      is_active: dbRecord.is_active,
      default_commission_rates: dbRecord.default_commission_rates || {},
      contact_info: dbRecord.contact_info || {},
      notes: dbRecord.notes,
      created_at: new Date(dbRecord.created_at),
      updated_at: dbRecord.updated_at ? new Date(dbRecord.updated_at) : undefined
    };
  }

  protected transformToDB(data: CarrierCreateData | CarrierUpdateData, isUpdate = false): any {
    const dbData: any = {};

    if (data.name !== undefined) dbData.name = data.name;
    if (data.short_name !== undefined) dbData.short_name = data.short_name;
    if (data.is_active !== undefined) dbData.is_active = data.is_active;
    if (data.default_commission_rates !== undefined) {
      dbData.default_commission_rates = data.default_commission_rates;
    }
    if (data.contact_info !== undefined) {
      dbData.contact_info = data.contact_info;
    }
    if (data.notes !== undefined) dbData.notes = data.notes;

    // Set defaults for create operations
    if (!isUpdate) {
      if (dbData.is_active === undefined) dbData.is_active = true;
      if (dbData.default_commission_rates === undefined) dbData.default_commission_rates = {};
      if (dbData.contact_info === undefined) dbData.contact_info = {};
    }

    return dbData;
  }

  // Carrier-specific methods
  async findByName(name: string): Promise<Carrier | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('name', name)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw this.handleError(error, 'findByName');
      }

      return data ? this.transformFromDB(data) : null;
    } catch (error) {
      throw this.wrapError(error, 'findByName');
    }
  }

  async findActiveCarriers(): Promise<Carrier[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        throw this.handleError(error, 'findActiveCarriers');
      }

      return data?.map(this.transformFromDB.bind(this)) || [];
    } catch (error) {
      throw this.wrapError(error, 'findActiveCarriers');
    }
  }

  async searchByName(searchTerm: string): Promise<Carrier[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .or(`name.ilike.%${searchTerm}%,short_name.ilike.%${searchTerm}%`)
        .order('name');

      if (error) {
        throw this.handleError(error, 'searchByName');
      }

      return data?.map(this.transformFromDB.bind(this)) || [];
    } catch (error) {
      throw this.wrapError(error, 'searchByName');
    }
  }

  async checkNameExists(name: string, excludeId?: string): Promise<boolean> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('id')
        .eq('name', name);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) {
        throw this.handleError(error, 'checkNameExists');
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      throw this.wrapError(error, 'checkNameExists');
    }
  }
}