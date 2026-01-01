// Product-related types for The Standard HQ application

import { Database } from "./database.types";

// ProductType is the database enum for product types
export type ProductType = Database["public"]["Enums"]["product_type"];

// Compensation levels matching database enum
// NOTE: what is this for? this is not relevant to my project. there aren't named comp levels. comp levels are numbers only, so
// where is this type being used? they need to be removed if they are being used
export type CompLevel =
  | "street"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond";

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
  imo_id?: string | null; // IMO this product belongs to
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSONB field for extra data
  metadata?: Record<string, any>;
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
  imo_id?: string;
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

// ============================================================================
// User Commission Profile Types
// ============================================================================

// Data quality levels for commission rate calculations
// NOTE: this is probably not really useful
export type CommissionDataQuality =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "DEFAULT"
  | "NONE"
  | "INSUFFICIENT";

// Individual product's contribution to weighted average
export interface ProductCommissionBreakdown {
  productId: string;
  productName: string;
  carrierName: string;
  commissionRate: number; // e.g., 0.85 for 85%
  premiumWeight: number; // e.g., 0.35 for 35% of total premium volume
  totalPremium: number; // Total premium for this product in lookback period
  policyCount: number; // Number of policies sold for this product
  effectiveDate: Date; // When this commission rate became effective
}

// Complete commission rate profile for a user
export interface UserCommissionProfile {
  userId: string;
  contractLevel: number; // e.g., 100, 105, 110
  simpleAverageRate: number; // Simple avg of all products at contract level
  weightedAverageRate: number; // Premium-weighted avg based on user's mix
  recommendedRate: number; // Either weighted or simple based on data quality
  productBreakdown: ProductCommissionBreakdown[]; // Detailed product-level breakdown
  dataQuality: CommissionDataQuality; // Quality indicator for the calculation
  calculatedAt: Date; // Timestamp of calculation
  lookbackMonths: number; // How many months of history used (typically 12)
}

// Commission rate interface
export interface CommissionRate {
  id: string;
  carrierId: string;
  productId: string;
  contractLevel: number;
  commissionPercentage: number;
  createdAt: Date;
  updatedAt?: Date;
}

// Form types for commission rates
export interface NewCommissionRateForm {
  carrierId: string;
  productId: string;
  contractLevel: number;
  commissionPercentage: number;
}

export interface UpdateCommissionRateForm extends Partial<NewCommissionRateForm> {
  id: string;
}
