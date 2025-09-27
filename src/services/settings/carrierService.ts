import { supabase, TABLES } from '../base/supabase';
import { Carrier } from '../../types/carrier.types';

export interface CreateCarrierData {
  name: string;
  isActive?: boolean;
}

export interface UpdateCarrierData extends Partial<CreateCarrierData> {
  id: string;
}

class CarrierService {
  async getAll(): Promise<Carrier[]> {
    const { data, error } = await supabase
      .from(TABLES.CARRIERS)
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch carriers: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getActive(): Promise<Carrier[]> {
    const { data, error } = await supabase
      .from(TABLES.CARRIERS)
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch active carriers: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getById(id: string): Promise<Carrier | null> {
    const { data, error } = await supabase
      .from(TABLES.CARRIERS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch carrier: ${error.message}`);
    }

    return data ? this.transformFromDB(data) : null;
  }

  async create(carrierData: CreateCarrierData): Promise<Carrier> {
    const dbData = this.transformToDB(carrierData);

    const { data, error } = await supabase
      .from(TABLES.CARRIERS)
      .insert([dbData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create carrier: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async update(id: string, updates: Partial<CreateCarrierData>): Promise<Carrier> {
    const dbData = this.transformToDB(updates, true);

    const { data, error } = await supabase
      .from(TABLES.CARRIERS)
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update carrier: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.CARRIERS)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete carrier: ${error.message}`);
    }
  }

  async setActive(id: string, isActive: boolean): Promise<Carrier> {
    const { data, error } = await supabase
      .from(TABLES.CARRIERS)
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update carrier status: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async toggleActive(id: string): Promise<Carrier> {
    const carrier = await this.getById(id);
    if (!carrier) {
      throw new Error('Carrier not found');
    }

    return this.setActive(id, !carrier.isActive);
  }

  private transformFromDB(dbRecord: any): Carrier {
    return {
      id: dbRecord.id,
      name: dbRecord.name,
      isActive: dbRecord.is_active,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: dbRecord.updated_at ? new Date(dbRecord.updated_at) : undefined,
    };
  }

  private transformToDB(data: Partial<CreateCarrierData>, isUpdate = false): any {
    const dbData: any = {};

    if (data.name !== undefined) dbData.name = data.name;
    if (data.isActive !== undefined) dbData.is_active = data.isActive;

    if (isUpdate) {
      dbData.updated_at = new Date().toISOString();
    }

    return dbData;
  }
}

export const carrierService = new CarrierService();