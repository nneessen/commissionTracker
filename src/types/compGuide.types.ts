export interface CompGuideEntry {
  id: string;
  carrier_name: string;
  product_name: string;
  contract_level: number; // 80-145
  commission_percentage: number;
  first_year_percentage?: number;
  renewal_percentage?: number;
  trail_percentage?: number;
  effective_date: Date;
  expiration_date?: Date;
  is_active: boolean;
  notes?: string;
  created_at: Date;
  updated_at?: Date;
}

export interface NewCompGuideForm {
  carrier_name: string;
  product_name: string;
  contract_level: number;
  commission_percentage: number;
  first_year_percentage?: number;
  renewal_percentage?: number;
  trail_percentage?: number;
  effective_date: Date;
  expiration_date?: Date;
  is_active?: boolean;
  notes?: string;
}

export interface CompGuideFilters {
  carrier_name?: string;
  product_name?: string;
  contract_level?: number;
  is_active?: boolean;
  effective_from?: Date;
  effective_to?: Date;
}

export interface ProductSummary {
  product_name: string;
  carrier_count: number;
  avg_commission: number;
  min_contract_level: number;
  max_contract_level: number;
  is_active: boolean;
}