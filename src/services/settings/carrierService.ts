// src/services/settings/carrierService.ts

import { Carrier, NewCarrierForm } from '../../types/carrier.types';

export const carrierService = {
  async getAll(): Promise<Carrier[]> {
    // Placeholder implementation
    return [];
  },

  async getById(id: string): Promise<Carrier | null> {
    // Placeholder implementation
    return null;
  },

  async create(data: NewCarrierForm): Promise<Carrier> {
    // Placeholder implementation
    throw new Error('Not implemented');
  },

  async update(id: string, data: Partial<Carrier>): Promise<Carrier> {
    // Placeholder implementation
    throw new Error('Not implemented');
  },

  async delete(id: string): Promise<void> {
    // Placeholder implementation
    throw new Error('Not implemented');
  }
};