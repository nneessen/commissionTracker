// src/services/settings/carrierService.ts
import { logger } from '../base/logger';

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
   * Retrieves all carriers from the database, ordered alphabetically by name
   *
   * @returns Promise resolving to Supabase query result with carrier data
   *
   * @example
   * ```ts
   * const { data, error } = await carrierService.getAllCarriers();
   * if (!error) {
   *   data.forEach(carrier => console.log(carrier.name));
   * }
   * ```
   */
  async getAllCarriers() {
    return await supabase
      .from('carriers')
      .select('*')
      .order('name', { ascending: true });
  }

  /**
   * Retrieves all carriers (hook-compatible alias)
   *
   * @returns Promise resolving to ServiceResponse containing array of carriers
   *
   * @example
   * ```ts
   * const response = await carrierService.getAll();
   * if (response.success) {
   *   console.log(`Found ${response.data.length} carriers`);
   * }
   * ```
   */
  async getAll(): Promise<ServiceResponse<Carrier[]>> {
    const result = await this.getAllCarriers();
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data || [] };
  }

  /**
   * Retrieves a single carrier by its unique identifier
   *
   * @param id - The unique identifier of the carrier
   * @returns Promise resolving to Supabase query result with carrier data
   *
   * @example
   * ```ts
   * const { data, error } = await carrierService.getCarrierById('carrier-123');
   * ```
   */
  async getCarrierById(id: string) {
    return await supabase
      .from('carriers')
      .select('*')
      .eq('id', id)
      .single();
  }

  /**
   * Retrieves a carrier by ID (hook-compatible alias)
   *
   * @param id - The unique identifier of the carrier
   * @returns Promise resolving to ServiceResponse containing the carrier
   *
   * @example
   * ```ts
   * const response = await carrierService.getById('carrier-123');
   * if (response.success) {
   *   console.log(`Carrier: ${response.data.name}`);
   * }
   * ```
   */
  async getById(id: string): Promise<ServiceResponse<Carrier>> {
    const result = await this.getCarrierById(id);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data };
  }

  /**
   * Creates a new carrier record in the database
   *
   * @param data - The carrier information to create
   * @returns Promise resolving to Supabase query result with created carrier
   *
   * @example
   * ```ts
   * const { data, error } = await carrierService.createCarrier({
   *   name: 'Acme Insurance',
   *   short_name: 'ACME',
   *   contact_info: { email: 'info@acme.com' }
   * });
   * ```
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
   * Creates a new carrier (hook-compatible alias)
   *
   * @param data - The carrier information to create
   * @returns Promise resolving to ServiceResponse with created carrier
   *
   * @example
   * ```ts
   * const response = await carrierService.create({
   *   name: 'Acme Insurance',
   *   short_name: 'ACME'
   * });
   * ```
   */
  async create(data: NewCarrierForm): Promise<ServiceResponse<Carrier>> {
    const result = await this.createCarrier(data);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data };
  }

  /**
   * Updates an existing carrier's information
   *
   * @param id - The unique identifier of the carrier to update
   * @param data - Partial carrier data with fields to update
   * @returns Promise resolving to Supabase query result with updated carrier
   *
   * @example
   * ```ts
   * const { data, error } = await carrierService.updateCarrier('carrier-123', {
   *   contact_info: { phone: '555-1234' }
   * });
   * ```
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
   * Updates a carrier (hook-compatible alias)
   *
   * @param id - The unique identifier of the carrier to update
   * @param data - Partial carrier data with fields to update
   * @returns Promise resolving to ServiceResponse with updated carrier
   *
   * @example
   * ```ts
   * const response = await carrierService.update('carrier-123', {
   *   name: 'Updated Name'
   * });
   * ```
   */
  async update(id: string, data: Partial<NewCarrierForm>): Promise<ServiceResponse<Carrier>> {
    const result = await this.updateCarrier(id, data);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data };
  }

  /**
   * Deletes a carrier from the database
   *
   * @param id - The unique identifier of the carrier to delete
   * @returns Promise resolving to Supabase query result
   *
   * @example
   * ```ts
   * const { error } = await carrierService.deleteCarrier('carrier-123');
   * ```
   */
  async deleteCarrier(id: string) {
    return await supabase
      .from('carriers')
      .delete()
      .eq('id', id);
  }

  /**
   * Deletes a carrier (hook-compatible alias)
   *
   * @param id - The unique identifier of the carrier to delete
   * @returns Promise resolving to ServiceResponse
   *
   * @example
   * ```ts
   * const response = await carrierService.delete('carrier-123');
   * if (response.success) {
   *   console.log('Carrier deleted successfully');
   * }
   * ```
   */
  async delete(id: string): Promise<ServiceResponse<void>> {
    const result = await this.deleteCarrier(id);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true };
  }

  /**
   * Searches carriers by name or code using case-insensitive matching
   *
   * @param query - The search query string
   * @returns Promise resolving to ServiceResponse with matching carriers
   *
   * @example
   * ```ts
   * const response = await carrierService.searchCarriers('acme');
   * if (response.success) {
   *   console.log(`Found ${response.data.length} matching carriers`);
   * }
   * ```
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
   * Retrieves all active carriers (currently returns all carriers as is_active field doesn't exist)
   *
   * @returns Promise resolving to ServiceResponse with active carriers
   *
   * @example
   * ```ts
   * const response = await carrierService.getActiveCarriers();
   * if (response.success) {
   *   response.data.forEach(carrier => console.log(carrier.name));
   * }
   * ```
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