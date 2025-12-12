// Compensation (comp_guide table) types for carrier product compensation rates

import {Database} from "./database.types";

// Main compensation entry type
export interface Comp {
  id: string;
  carrier_id: string;
  product_type: Database["public"]["Enums"]["product_type"];
  contract_level: number; // Changed from comp_level enum to contract_level integer (80-145)
  product_id?: string; // Added product_id field
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
  contract_level: number; // Changed from comp_level enum to contract_level integer (80-145)
  product_id?: string; // Added product_id field
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
  contract_level?: number; // Changed from comp_level enum to contract_level integer (80-145)
  product_id?: string; // Added product_id field
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
  contract_level?: number; // Changed from comp_level enum to contract_level integer (80-145)
  product_id?: string; // Added product_id field
  effective_from?: string;
  effective_to?: string;
}

// Product summary statistics
export interface ProductSummary {
  product_type: Database["public"]["Enums"]["product_type"];
  carrier_count: number;
  avg_commission: number;
  min_contract_level: number; // Changed from comp_level to contract_level
  max_contract_level: number; // Changed from comp_level to contract_level
}
