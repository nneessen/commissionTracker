// Compensation (comp_guide table) types for carrier product compensation rates

import { Database } from "./database.types";

// Main compensation entry type
export interface Comp {
  id: string;
  carrier_id: string;
  product_type: Database["public"]["Enums"]["product_type"];
  comp_level: Database["public"]["Enums"]["comp_level"];
  commission_percentage: number;
  bonus_percentage?: number;
  effective_date: string;
  expiration_date?: string;
  minimum_premium?: number;
  maximum_premium?: number;
  created_at: string;
  updated_at?: string;
}

// Create compensation data (form input)
export interface CreateCompData {
  carrier_id: string;
  product_type: Database["public"]["Enums"]["product_type"];
  comp_level: Database["public"]["Enums"]["comp_level"];
  commission_percentage: number;
  bonus_percentage?: number;
  effective_date: string;
  expiration_date?: string;
  minimum_premium?: number;
  maximum_premium?: number;
}

// Update compensation data
export interface UpdateCompData {
  carrier_id?: string;
  product_type?: Database["public"]["Enums"]["product_type"];
  comp_level?: Database["public"]["Enums"]["comp_level"];
  commission_percentage?: number;
  bonus_percentage?: number;
  effective_date?: string;
  expiration_date?: string;
  minimum_premium?: number;
  maximum_premium?: number;
}

// Filters for querying compensations
export interface CompFilters {
  carrier_id?: string;
  product_type?: Database["public"]["Enums"]["product_type"];
  comp_level?: Database["public"]["Enums"]["comp_level"];
  effective_from?: string;
  effective_to?: string;
}

// Product summary statistics
export interface ProductSummary {
  product_type: Database["public"]["Enums"]["product_type"];
  carrier_count: number;
  avg_commission: number;
  min_comp_level: Database["public"]["Enums"]["comp_level"];
  max_comp_level: Database["public"]["Enums"]["comp_level"];
}
