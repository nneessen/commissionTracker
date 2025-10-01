// src/services/settings/constantsService.ts
import { logger } from '../base/logger';

import { supabase } from '../base/supabase';

export const constantsService = {
  async getAll(): Promise<any> {
    try {
      const { data, error } = await supabase.from('constants').select('*');

      if (error) {
        throw new Error(`Failed to fetch constants: ${error.message}`);
      }

      // Transform array to object format expected by the app
      if (data && data.length > 0) {
        const constants = data[0]; // Assuming single row for constants
        return {
          avgAP: constants.avgAP || 15000,
          commissionRate: constants.commissionRate || 0.2,
          target1: constants.target1 || 4000,
          target2: constants.target2 || 6500,
        };
      }

      // Return defaults if no data
      return {
        avgAP: 15000,
        commissionRate: 0.2,
        target1: 4000,
        target2: 6500,
      };
    } catch (error) {
      logger.error('Error fetching constants', error instanceof Error ? error : String(error), 'Migration');
      throw error;
    }
  },

  async getConstants(): Promise<any> {
    return this.getAll();
  },

  async updateConstants(data: any): Promise<any> {
    // Placeholder implementation
    throw new Error('Not implemented');
  },

  async updateMultiple(updates: any[]): Promise<any> {
    // Placeholder for bulk updates
    throw new Error('Not implemented');
  },

  async setValue(field: string, value: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('constants')
        .update({ [field]: value })
        .eq('id', 1); // Assuming single row with id 1

      if (error) {
        throw new Error(`Failed to update constant ${field}: ${error.message}`);
      }
    } catch (error) {
      logger.error(`Error updating constant ${field}`, error instanceof Error ? error : String(error), 'ConstantsService');
      throw error;
    }
  }
};