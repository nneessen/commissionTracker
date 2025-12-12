// src/services/settings/constantsService.ts
import {logger} from '../base/logger';
import {supabase} from '../base/supabase';

interface ConstantRow {
  key: string;
  value: number;
  description?: string;
}

export interface Constants {
  avgAP: number;
  target1: number;
  target2: number;
}

const DEFAULT_CONSTANTS: Constants = {
  avgAP: 0,
  target1: 0,
  target2: 0,
};

export const constantsService = {
  async getAll(): Promise<Constants> {
    try {
      const { data, error } = await supabase.from('constants').select('key, value');

      if (error) {
        throw new Error(`Failed to fetch constants: ${error.message}`);
      }

      // Transform key-value rows into object format
      if (data && data.length > 0) {
        const constantsObj: Partial<Constants> = {};

        data.forEach((row: ConstantRow) => {
          if (row.key === 'avgAP' || row.key === 'target1' || row.key === 'target2') {
            constantsObj[row.key] = Number(row.value);
          }
        });

        // Merge with defaults for any missing values
        return {
          avgAP: constantsObj.avgAP ?? DEFAULT_CONSTANTS.avgAP,
          target1: constantsObj.target1 ?? DEFAULT_CONSTANTS.target1,
          target2: constantsObj.target2 ?? DEFAULT_CONSTANTS.target2,
        };
      }

      // Return defaults if no data
      return DEFAULT_CONSTANTS;
    } catch (error) {
      logger.error('Error fetching constants', error instanceof Error ? error : String(error), 'ConstantsService');
      throw error;
    }
  },

  async getConstants(): Promise<Constants> {
    return this.getAll();
  },

  async updateConstants(data: Constants): Promise<Constants> {
    try {
      // Update each constant as a separate row
      const updates = Object.entries(data).map(([key, value]) =>
        supabase
          .from('constants')
          .update({ value })
          .eq('key', key)
      );

      const results = await Promise.all(updates);

      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to update constants: ${errors.map(e => e.error?.message).join(', ')}`);
      }

      return data;
    } catch (error) {
      logger.error('Error updating constants', error instanceof Error ? error : String(error), 'ConstantsService');
      throw error;
    }
  },

  async updateMultiple(updates: { key: string; value: number }[]): Promise<Constants> {
    try {
      const promises = updates.map(({ key, value }) =>
        supabase
          .from('constants')
          .update({ value })
          .eq('key', key)
      );

      const results = await Promise.all(promises);

      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to update constants: ${errors.map(e => e.error?.message).join(', ')}`);
      }

      // Return updated constants
      return this.getAll();
    } catch (error) {
      logger.error('Error updating multiple constants', error instanceof Error ? error : String(error), 'ConstantsService');
      throw error;
    }
  },

  async setValue(field: string, value: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('constants')
        .update({ value })
        .eq('key', field);

      if (error) {
        throw new Error(`Failed to update constant ${field}: ${error.message}`);
      }
    } catch (error) {
      logger.error(`Error updating constant ${field}`, error instanceof Error ? error : String(error), 'ConstantsService');
      throw error;
    }
  }
};