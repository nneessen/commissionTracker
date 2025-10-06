// Product-related types for the commission tracker application

import { Database } from './database.types';

// ProductType is the database enum for product types
export type ProductType = Database["public"]["Enums"]["product_type"];

// Compensation levels matching database enum
export type CompLevel =
  | 'street'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond';

// Base product interface matching database schema
export interface Product {
  id: string;
  carrier_id: string;
  name: string; // e.g., "Mutual of Omaha Living Promise"
  code?: string; // Internal product code
  product_type: ProductType; // e.g., "whole_life"
  description?: string;
  min_premium?: number;
  max_premium?: number;
  min_age?: number;
  max_age?: number;
  commission_percentage?: number; // Default commission rate if not in comp_guide
  is_active: boolean;
  metadata?: Record<string, any>; // JSONB field for extra data
  created_at: Date;
  updated_at: Date;
}

// Product with carrier details (for joined queries)
export interface ProductWithCarrier extends Product {
  carrier: {
    id: string;
    name: string;
    code?: string;
  };
}

// Form data for creating/editing products
export interface ProductFormData {
  carrier_id: string;
  name: string;
  code?: string;
  product_type: ProductType;
  description?: string;
  min_premium?: number;
  max_premium?: number;
  min_age?: number;
  max_age?: number;
  commission_percentage?: number;
  is_active: boolean;
}

// Commission override for specific products
export interface ProductCommissionOverride {
  id: string;
  product_id: string;
  comp_level: CompLevel;
  commission_percentage: number;
  bonus_percentage?: number;
  effective_date: Date;
  expiration_date?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// Filter options for product queries
export interface ProductFilters {
  carrier_id?: string;
  product_type?: ProductType;
  is_active?: boolean;
  search?: string; // Search by name or code
}

// Product selection item for forms
export interface ProductOption {
  value: string; // product id
  label: string; // formatted display name
  carrier_name: string;
  product_type: ProductType;
  commission_percentage?: number;
}