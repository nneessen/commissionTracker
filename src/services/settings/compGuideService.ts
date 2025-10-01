// src/services/settings/compGuideService.ts
import { logger } from '../base/logger';

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
   * Retrieves all compensation guide entries with carrier details
   *
   * @returns Promise resolving to Supabase query result with comp guide entries and carrier info
   *
   * @example
   * ```ts
   * const { data, error } = await compGuideService.getAllEntries();
   * if (!error) {
   *   data.forEach(entry => console.log(`${entry.carriers.name}: ${entry.commission_percentage}%`));
   * }
   * ```
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
   * Retrieves a single compensation guide entry by its unique identifier
   *
   * @param id - The unique identifier of the comp guide entry
   * @returns Promise resolving to Supabase query result with entry and carrier info
   *
   * @example
   * ```ts
   * const { data, error } = await compGuideService.getEntryById('entry-123');
   * ```
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
   * Creates a new compensation guide entry in the database
   *
   * @param data - The comp guide entry data to create
   * @returns Promise resolving to Supabase query result with created entry
   *
   * @example
   * ```ts
   * const { data, error } = await compGuideService.createEntry({
   *   carrier_id: 'carrier-123',
   *   product_type: 'whole_life',
   *   comp_level: 85,
   *   commission_percentage: 95,
   *   effective_date: '2024-01-01'
   * });
   * ```
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
   * Updates an existing compensation guide entry
   *
   * @param id - The unique identifier of the entry to update
   * @param data - Partial entry data with fields to update
   * @returns Promise resolving to Supabase query result with updated entry
   *
   * @example
   * ```ts
   * const { data, error } = await compGuideService.updateEntry('entry-123', {
   *   commission_percentage: 97
   * });
   * ```
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
   * Deletes a compensation guide entry from the database
   *
   * @param id - The unique identifier of the entry to delete
   * @returns Promise resolving to Supabase query result
   *
   * @example
   * ```ts
   * const { error } = await compGuideService.deleteEntry('entry-123');
   * ```
   */
  async deleteEntry(id: string) {
    return await supabase
      .from('comp_guide')
      .delete()
      .eq('id', id);
  }

  /**
   * Retrieves the commission rate for a specific carrier, product type, and compensation level
   *
   * @param carrierName - The name of the insurance carrier
   * @param productType - The insurance product type enum value
   * @param compLevel - The compensation level enum value
   * @returns Promise resolving to object with commission percentage or null if not found
   *
   * @example
   * ```ts
   * const result = await compGuideService.getCommissionRate(
   *   'Acme Insurance',
   *   'whole_life',
   *   85
   * );
   * if (!result.error && result.data) {
   *   console.log(`Commission rate: ${result.data}%`);
   * }
   * ```
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
   * Searches compensation guide entries by product name or contract level
   *
   * @param query - The search query string
   * @returns Promise resolving to Supabase query result with matching entries
   *
   * @example
   * ```ts
   * const { data, error } = await compGuideService.searchEntries('whole life');
   * ```
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
   * Retrieves all compensation guide entries for a specific carrier
   *
   * @param carrierId - The unique identifier of the carrier
   * @returns Promise resolving to Supabase query result with carrier's entries
   *
   * @example
   * ```ts
   * const { data, error } = await compGuideService.getEntriesByCarrier('carrier-123');
   * ```
   */
  async getEntriesByCarrier(carrierId: string) {
    return await supabase
      .from('comp_guide')
      .select('*')
      .eq('carrier_id', carrierId)
      .order('product_name', { ascending: true });
  }

  /**
   * Retrieves all active compensation guide entries with carrier details
   *
   * @returns Promise resolving to Supabase query result with active entries
   *
   * @example
   * ```ts
   * const { data, error } = await compGuideService.getActiveEntries();
   * ```
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
   * Bulk imports multiple compensation guide entries in a single operation
   *
   * @param entries - Array of comp guide entries to create
   * @returns Promise resolving to Supabase query result with created entries
   *
   * @example
   * ```ts
   * const { data, error } = await compGuideService.bulkImport([
   *   {
   *     carrier_id: 'carrier-123',
   *     product_type: 'whole_life',
   *     comp_level: 85,
   *     commission_percentage: 95,
   *     effective_date: '2024-01-01'
   *   },
   *   {
   *     carrier_id: 'carrier-123',
   *     product_type: 'term',
   *     comp_level: 85,
   *     commission_percentage: 90,
   *     effective_date: '2024-01-01'
   *   }
   * ]);
   * ```
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