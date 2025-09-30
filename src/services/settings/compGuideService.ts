// src/services/settings/compGuideService.ts

import { supabase } from '../base/supabase';
import { Database } from '../../types/database.types';

type CompGuideRow = Database['public']['Tables']['comp_guide']['Row'];
type CompGuideInsert = Database['public']['Tables']['comp_guide']['Insert'];
type CompGuideUpdate = Database['public']['Tables']['comp_guide']['Update'];

// Re-export for backward compatibility
export interface CompGuideEntry extends CompGuideRow {}

export interface CompGuideCreateData {
  carrier_id: string;
  product_type: Database['public']['Enums']['product_type'];
  comp_level: Database['public']['Enums']['comp_level'];
  commission_percentage: number;
  bonus_percentage?: number;
  effective_date: string;
  expiration_date?: string;
  minimum_premium?: number;
  maximum_premium?: number;
}

class CompGuideService {
  /**
   * Get all comp guide entries
   */
  async getAllEntries() {
    return await supabase
      .from('comp_guide')
      .select(`
        *,
        carriers:carrier_id (
          id,
          name,
          short_name
        )
      `)
      .order('product_name', { ascending: true });
  }

  /**
   * Get entry by ID
   */
  async getEntryById(id: string) {
    return await supabase
      .from('comp_guide')
      .select(`
        *,
        carriers:carrier_id (
          id,
          name,
          short_name
        )
      `)
      .eq('id', id)
      .single();
  }

  /**
   * Create a new entry
   */
  async createEntry(data: CompGuideCreateData) {
    const entryData: CompGuideInsert = {
      carrier_id: data.carrier_id,
      product_type: data.product_type,
      comp_level: data.comp_level,
      commission_percentage: data.commission_percentage,
      bonus_percentage: data.bonus_percentage,
      effective_date: data.effective_date,
      expiration_date: data.expiration_date,
      minimum_premium: data.minimum_premium,
      maximum_premium: data.maximum_premium
    };

    return await supabase
      .from('comp_guide')
      .insert(entryData)
      .select()
      .single();
  }

  /**
   * Update an entry
   */
  async updateEntry(id: string, data: Partial<CompGuideCreateData>) {
    const updateData: CompGuideUpdate = {
      ...(data.carrier_id && { carrier_id: data.carrier_id }),
      ...(data.product_type && { product_type: data.product_type }),
      ...(data.comp_level && { comp_level: data.comp_level }),
      ...(data.commission_percentage !== undefined && { commission_percentage: data.commission_percentage }),
      ...(data.bonus_percentage !== undefined && { bonus_percentage: data.bonus_percentage }),
      ...(data.effective_date !== undefined && { effective_date: data.effective_date }),
      ...(data.expiration_date !== undefined && { expiration_date: data.expiration_date }),
      ...(data.minimum_premium !== undefined && { minimum_premium: data.minimum_premium }),
      ...(data.maximum_premium !== undefined && { maximum_premium: data.maximum_premium })
    };

    return await supabase
      .from('comp_guide')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
  }

  /**
   * Delete an entry
   */
  async deleteEntry(id: string) {
    return await supabase
      .from('comp_guide')
      .delete()
      .eq('id', id);
  }

  /**
   * Get commission rate for a specific carrier, product type, and comp level
   */
  async getCommissionRate(
    carrierName: string,
    productType: Database['public']['Enums']['product_type'],
    compLevel: Database['public']['Enums']['comp_level']
  ) {
    // First get the carrier ID
    const { data: carrier, error: carrierError } = await supabase
      .from('carriers')
      .select('id')
      .eq('name', carrierName)
      .single();

    if (carrierError || !carrier) {
      return { data: null, error: carrierError || new Error('Carrier not found') };
    }

    // Then get the commission rate
    const { data, error } = await supabase
      .from('comp_guide')
      .select('commission_percentage')
      .eq('carrier_id', carrier.id)
      .eq('product_type', productType)
      .eq('comp_level', compLevel)
      .single();

    return {
      data: data?.commission_percentage || null,
      error
    };
  }

  /**
   * Search entries
   */
  async searchEntries(query: string) {
    return await supabase
      .from('comp_guide')
      .select(`
        *,
        carriers:carrier_id (
          id,
          name,
          short_name
        )
      `)
      .or(`product_name.ilike.%${query}%,contract_level.ilike.%${query}%`)
      .order('product_name', { ascending: true });
  }

  /**
   * Get entries by carrier
   */
  async getEntriesByCarrier(carrierId: string) {
    return await supabase
      .from('comp_guide')
      .select('*')
      .eq('carrier_id', carrierId)
      .order('product_name', { ascending: true });
  }

  /**
   * Get active entries
   */
  async getActiveEntries() {
    return await supabase
      .from('comp_guide')
      .select(`
        *,
        carriers:carrier_id (
          id,
          name,
          short_name
        )
      `)
      .eq('is_active', true)
      .order('product_name', { ascending: true });
  }

  /**
   * Bulk import entries
   */
  async bulkImport(entries: CompGuideCreateData[]) {
    const entryData: CompGuideInsert[] = entries.map(entry => ({
      carrier_id: entry.carrier_id,
      product_type: entry.product_type,
      comp_level: entry.comp_level,
      commission_percentage: entry.commission_percentage,
      bonus_percentage: entry.bonus_percentage,
      effective_date: entry.effective_date,
      expiration_date: entry.expiration_date,
      minimum_premium: entry.minimum_premium,
      maximum_premium: entry.maximum_premium
    }));

    return await supabase
      .from('comp_guide')
      .insert(entryData)
      .select();
  }
}

export const compGuideService = new CompGuideService();