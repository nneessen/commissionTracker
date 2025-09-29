// src/services/settings/constantsService.ts

import { localApi } from '../base/localApi';

export const constantsService = {
  async getAll(): Promise<any> {
    try {
      const { data, error } = await localApi.from('constants').select('*');

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
      console.error('Error fetching constants:', error);
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
  }
};