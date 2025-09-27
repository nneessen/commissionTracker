import { supabase, TABLES } from '../base/supabase';
import { Constants } from '../../types/expense.types';

interface ConstantRecord {
  id: string;
  key: string;
  value: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

class ConstantsService {
  async getAll(): Promise<Constants> {
    const { data, error } = await supabase
      .from(TABLES.CONSTANTS)
      .select('*');

    if (error) {
      throw new Error(`Failed to fetch constants: ${error.message}`);
    }

    return this.transformFromDB(data || []);
  }

  async getValue(key: keyof Constants): Promise<number> {
    const { data, error } = await supabase
      .from(TABLES.CONSTANTS)
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      throw new Error(`Failed to fetch constant ${key}: ${error.message}`);
    }

    return parseFloat(data.value);
  }

  async setValue(key: keyof Constants, value: number): Promise<void> {
    const { error } = await supabase
      .from(TABLES.CONSTANTS)
      .upsert([{ key, value }], { onConflict: 'key' });

    if (error) {
      throw new Error(`Failed to update constant ${key}: ${error.message}`);
    }
  }

  async updateMultiple(constants: Partial<Constants>): Promise<Constants> {
    const updates = Object.entries(constants).map(([key, value]) => ({
      key,
      value,
    }));

    const { error } = await supabase
      .from(TABLES.CONSTANTS)
      .upsert(updates, { onConflict: 'key' });

    if (error) {
      throw new Error(`Failed to update constants: ${error.message}`);
    }

    return this.getAll();
  }

  private transformFromDB(records: ConstantRecord[]): Constants {
    const constants: Partial<Constants> = {};

    records.forEach((record) => {
      const key = record.key as keyof Constants;
      constants[key] = parseFloat(record.value.toString());
    });

    // Provide defaults if missing
    return {
      avgAP: constants.avgAP || 5000,
      commissionRate: constants.commissionRate || 0.05,
      target1: constants.target1 || 100000,
      target2: constants.target2 || 200000,
    };
  }
}

export const constantsService = new ConstantsService();