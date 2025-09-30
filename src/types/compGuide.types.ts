// /home/nneessen/projects/commissionTracker/src/types/compGuide.types.ts

import { Database } from "./database.types";

export interface CompGuideEntry {
  id: string;
  carrier_id: string; // Changed from carrier_name
  product_type: Database["public"]["Enums"]["product_type"]; // Changed from product_name
  comp_level: Database["public"]["Enums"]["comp_level"]; // Changed from contract_level (number)
  commission_percentage: number;
  bonus_percentage?: number;
  effective_date: string; // Changed from Date
  expiration_date?: string; // Changed from Date
  minimum_premium?: number;
  maximum_premium?: number;
  created_at: string;
  updated_at?: string;
}

export interface NewCompGuideForm {
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

export interface CompGuideFilters {
  carrier_id?: string;
  product_type?: Database["public"]["Enums"]["product_type"];
  comp_level?: Database["public"]["Enums"]["comp_level"];
  effective_from?: string;
  effective_to?: string;
}

export interface ProductSummary {
  product_type: Database["public"]["Enums"]["product_type"];
  carrier_count: number;
  avg_commission: number;
  min_comp_level: Database["public"]["Enums"]["comp_level"];
  max_comp_level: Database["public"]["Enums"]["comp_level"];
}