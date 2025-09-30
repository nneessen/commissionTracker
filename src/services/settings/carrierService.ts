// src/services/settings/carrierService.ts

import { supabase } from '../base/supabase';
import { Database } from '../../types/database.types';
import { ServiceResponse } from '../base/BaseService';

type CarrierRow = Database['public']['Tables']['carriers']['Row'];
type CarrierInsert = Database['public']['Tables']['carriers']['Insert'];
type CarrierUpdate = Database['public']['Tables']['carriers']['Update'];

// Re-export for backward compatibility
export interface Carrier extends CarrierRow {}

export interface NewCarrierForm {
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

class CarrierService {
  /**
   * Get all carriers
   */
  async getAllCarriers() {
    return await supabase
      .from('carriers')
      .select('*')
      .order('name', { ascending: true });
  }

  /**
   * Get all carriers (alias for hooks compatibility)
   */
  async getAll(): Promise<ServiceResponse<Carrier[]>> {
    const result = await this.getAllCarriers();
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data || [] };
  }

  /**
   * Get carrier by ID
   */
  async getCarrierById(id: string) {
    return await supabase
      .from('carriers')
      .select('*')
      .eq('id', id)
      .single();
  }

  /**
   * Get carrier by ID (alias for hooks compatibility)
   */
  async getById(id: string): Promise<ServiceResponse<Carrier>> {
    const result = await this.getCarrierById(id);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data };
  }

  /**
   * Create a new carrier
   */
  async createCarrier(data: NewCarrierForm) {
    const carrierData: CarrierInsert = {
      name: data.name,
      code: data.short_name,
      commission_structure: data.default_commission_rates || {},
      contact_info: data.contact_info || {}
    };

    return await supabase
      .from('carriers')
      .insert(carrierData)
      .select()
      .single();
  }

  /**
   * Create a new carrier (alias for hooks compatibility)
   */
  async create(data: NewCarrierForm): Promise<ServiceResponse<Carrier>> {
    const result = await this.createCarrier(data);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data };
  }

  /**
   * Update a carrier
   */
  async updateCarrier(id: string, data: Partial<NewCarrierForm>) {
    const updateData: CarrierUpdate = {
      ...(data.name && { name: data.name }),
      ...(data.short_name !== undefined && { code: data.short_name }),
      ...(data.default_commission_rates && { commission_structure: data.default_commission_rates }),
      ...(data.contact_info && { contact_info: data.contact_info })
    };

    return await supabase
      .from('carriers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
  }

  /**
   * Update a carrier (alias for hooks compatibility)
   */
  async update(id: string, data: Partial<NewCarrierForm>): Promise<ServiceResponse<Carrier>> {
    const result = await this.updateCarrier(id, data);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data };
  }

  /**
   * Delete a carrier
   */
  async deleteCarrier(id: string) {
    return await supabase
      .from('carriers')
      .delete()
      .eq('id', id);
  }

  /**
   * Delete a carrier (alias for hooks compatibility)
   */
  async delete(id: string): Promise<ServiceResponse<void>> {
    const result = await this.deleteCarrier(id);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true };
  }

  /**
   * Search carriers by name
   */
  async searchCarriers(query: string): Promise<ServiceResponse<Carrier[]>> {
    const result = await supabase
      .from('carriers')
      .select('*')
      .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
      .order('name', { ascending: true });

    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data || [] };
  }

  /**
   * Get active carriers
   */
  async getActiveCarriers(): Promise<ServiceResponse<Carrier[]>> {
    // Since is_active doesn't exist in database, return all carriers
    const result = await supabase
      .from('carriers')
      .select('*')
      .order('name', { ascending: true });

    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data || [] };
  }
}

export const carrierService = new CarrierService();