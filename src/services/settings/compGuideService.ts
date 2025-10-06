// src/services/settings/compGuideService.ts
import { logger } from "../base/logger";

import { supabase } from "../base/supabase";
import { Database } from "../../types/database.types";

type CompGuideRow = Database["public"]["Tables"]["comp_guide"]["Row"];
type CompGuideInsert = Database["public"]["Tables"]["comp_guide"]["Insert"];
type CompGuideUpdate = Database["public"]["Tables"]["comp_guide"]["Update"];

// Re-export for backward compatibility
export interface CompGuideEntry extends CompGuideRow {}

export interface CompGuideCreateData {
  carrier_id: string;
  product_id?: string;
  product_type: Database["public"]["Enums"]["product_type"];
  contract_level: number;
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
      .from("comp_guide")
      .select(
        `
        *,
        carriers:carrier_id (
          id,
          name,
          short_name
        )
      `,
      )
      .order("product_name", { ascending: true });
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
      .from("comp_guide")
      .select(
        `
        *,
        carriers:carrier_id (
          id,
          name,
          short_name
        )
      `,
      )
      .eq("id", id)
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
      product_id: data.product_id,
      product_type: data.product_type,
      contract_level: data.contract_level,
      commission_percentage: data.commission_percentage,
      bonus_percentage: data.bonus_percentage,
      effective_date: data.effective_date,
      expiration_date: data.expiration_date,
      minimum_premium: data.minimum_premium,
      maximum_premium: data.maximum_premium,
    };

    return await supabase
      .from("comp_guide")
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
      ...(data.contract_level && { contract_level: data.contract_level }),
      ...(data.commission_percentage !== undefined && {
        commission_percentage: data.commission_percentage,
      }),
      ...(data.bonus_percentage !== undefined && {
        bonus_percentage: data.bonus_percentage,
      }),
      ...(data.effective_date !== undefined && {
        effective_date: data.effective_date,
      }),
      ...(data.expiration_date !== undefined && {
        expiration_date: data.expiration_date,
      }),
      ...(data.minimum_premium !== undefined && {
        minimum_premium: data.minimum_premium,
      }),
      ...(data.maximum_premium !== undefined && {
        maximum_premium: data.maximum_premium,
      }),
    };

    return await supabase
      .from("comp_guide")
      .update(updateData)
      .eq("id", id)
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
    return await supabase.from("comp_guide").delete().eq("id", id);
  }

  /**
   * Retrieves the commission rate for a specific carrier, product type, and contract level
   *
   * @param carrierName - The name of the insurance carrier
   * @param productType - The insurance product type enum value
   * @param contractLevel - The contract level (integer 80-145)
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
    productType: Database["public"]["Enums"]["product_type"],
    contractLevel: number, // Changed from comp_level enum to contract_level integer
  ) {
    // First get the carrier ID
    const { data: carrier, error: carrierError } = await supabase
      .from("carriers")
      .select("id")
      .eq("name", carrierName)
      .single();

    if (carrierError || !carrier) {
      return {
        data: null,
        error: carrierError || new Error("Carrier not found"),
      };
    }

    // Then get the commission rate using contract_level instead of comp_level
    const { data, error } = await supabase
      .from("comp_guide")
      .select("commission_percentage")
      .eq("carrier_id", carrier.id)
      .eq("product_type", productType)
      .eq("contract_level", contractLevel) // Changed from comp_level to contract_level
      .single();

    return {
      data: data?.commission_percentage || null,
      error,
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
      .from("comp_guide")
      .select(
        `
        *,
        carriers:carrier_id (
          id,
          name,
          short_name
        )
      `,
      )
      .or(`product_name.ilike.%${query}%,contract_level.ilike.%${query}%`)
      .order("product_name", { ascending: true });
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
      .from("comp_guide")
      .select("*")
      .eq("carrier_id", carrierId)
      .order("contract_level", { ascending: true });
  }

  /**
   * Retrieves all compensation guide entries for a specific product
   *
   * @param productId - The unique identifier of the product
   * @returns Promise resolving to Supabase query result with product's entries
   *
   * @example
   * ```ts
   * const { data, error } = await compGuideService.getEntriesByProduct('product-123');
   * ```
   */
  async getEntriesByProduct(productId: string) {
    return await supabase
      .from("comp_guide")
      .select("*")
      .eq("product_id", productId)
      .order("contract_level", { ascending: true });
  }

  /**
   * Creates multiple comp guide entries in a single operation (for new products)
   *
   * @param entries - Array of comp guide entries to create
   * @returns Promise resolving to Supabase query result with created entries
   *
   * @example
   * ```ts
   * const { data, error } = await compGuideService.createBulkEntries([...]);
   * ```
   */
  async createBulkEntries(entries: CompGuideInsert[]) {
    return await supabase.from("comp_guide").insert(entries).select();
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
      .from("comp_guide")
      .select(
        `
        *,
        carriers:carrier_id (
          id,
          name,
          short_name
        )
      `,
      )
      .eq("is_active", true)
      .order("product_name", { ascending: true });
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
  /**
   * Get all commission data in a unified format for the grid
   * Returns carriers with their products and all commission rates
   */
  async getAllCommissionData() {
    const { data, error } = await supabase
      .from('carriers')
      .select(`
        id,
        name,
        products!products_carrier_id_fkey (
          id,
          name,
          product_type,
          is_active
        ),
        comp_guide!comp_guide_carrier_id_fkey (
          id,
          product_id,
          contract_level,
          commission_percentage
        )
      `)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    
    // Transform the data into a grid-friendly format
    const gridData = [];
    
    for (const carrier of data || []) {
      // Get unique products
      const productsMap = new Map();
      
      // Add products from products table
      for (const product of carrier.products || []) {
        if (!productsMap.has(product.id)) {
          productsMap.set(product.id, {
            carrierId: carrier.id,
            carrierName: carrier.name,
            productId: product.id,
            productName: product.name,
            productType: product.product_type,
            isActive: product.is_active,
            rates: {}
          });
        }
      }
      
      // Add commission rates to products
      for (const compEntry of carrier.comp_guide || []) {
        if (compEntry.product_id && productsMap.has(compEntry.product_id)) {
          const product = productsMap.get(compEntry.product_id);
          product.rates[compEntry.contract_level] = compEntry.commission_percentage;
        }
      }
      
      // Add products without specific product_id (carrier-level rates)
      const carrierLevelRates = (carrier.comp_guide || [])
        .filter((entry: any) => !entry.product_id)
        .reduce((acc: Record<number, number>, entry: any) => {
          acc[entry.contract_level] = entry.commission_percentage;
          return acc;
        }, {} as Record<number, number>);
      
      // If there are carrier-level rates but no products, add a placeholder
      if (Object.keys(carrierLevelRates).length > 0 && productsMap.size === 0) {
        gridData.push({
          carrierId: carrier.id,
          carrierName: carrier.name,
          productId: null,
          productName: 'Default Rates',
          productType: null,
          isActive: true,
          rates: carrierLevelRates
        });
      }
      
      // Add all products to grid data
      for (const product of productsMap.values()) {
        // If product has no rates, use carrier-level rates
        if (Object.keys(product.rates).length === 0 && Object.keys(carrierLevelRates).length > 0) {
          product.rates = carrierLevelRates;
        }
        gridData.push(product);
      }
    }
    
    return gridData;
  }

  async bulkImport(entries: CompGuideCreateData[]) {
    const entryData: CompGuideInsert[] = entries.map((entry) => ({
      carrier_id: entry.carrier_id,
      product_id: entry.product_id,
      product_type: entry.product_type,
      contract_level: entry.contract_level,
      commission_percentage: entry.commission_percentage,
      bonus_percentage: entry.bonus_percentage,
      effective_date: entry.effective_date,
      expiration_date: entry.expiration_date,
      minimum_premium: entry.minimum_premium,
      maximum_premium: entry.maximum_premium,
    }));

    return await supabase.from("comp_guide").insert(entryData).select();
  }
}

export const compGuideService = new CompGuideService();

