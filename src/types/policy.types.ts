// src/types/policy.types.ts
// Policy type definitions - DATABASE-FIRST pattern with app-level transformations

import type { Database } from "./database.types";
import type { ProductType } from "./product.types";
import type { Product } from "./product.types";

// =============================================================================
// DATABASE-DERIVED TYPES (Source of Truth)
// =============================================================================

/** Raw database row type for policies table */
export type PolicyRow = Database["public"]["Tables"]["policies"]["Row"];

/** Insert type for creating new policies */
export type PolicyInsert = Database["public"]["Tables"]["policies"]["Insert"];

/** Update type for modifying policies */
export type PolicyUpdate = Database["public"]["Tables"]["policies"]["Update"];

/** Payment frequency enum from database */
export type PaymentFrequencyDB =
  Database["public"]["Enums"]["payment_frequency"];

/** Lead source type enum from database */
export type LeadSourceType = Database["public"]["Enums"]["lead_source_type"];

// =============================================================================
// APP-LEVEL TYPES (CamelCase for React components)
// =============================================================================

export type PolicyStatus =
  | "pending"
  | "active"
  | "lapsed"
  | "cancelled"
  | "matured";
export type PaymentFrequency =
  | "annual"
  | "semi-annual"
  | "quarterly"
  | "monthly";

// Base client interface with common properties
export interface PolicyClientBase {
  name: string;
  state: string;
  age: number;
  dateOfBirth?: string; // ISO date string (YYYY-MM-DD)
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  zipCode?: string;
}

// Legacy client interface (same as base for backward compatibility)
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PolicyClient extends PolicyClientBase {}

// Extended client interface for new service architecture
export interface PolicyClientExtended extends PolicyClientBase {
  firstName: string;
  lastName: string;
  address?: string;
  city?: string;
  zipCode?: string;
}

/**
 * Policy - App-level interface with camelCase fields
 *
 * This is transformed from PolicyRow for use in React components.
 * Use PolicyRow for direct database operations.
 */
export interface Policy {
  id: string;
  policyNumber: string | null;
  status: PolicyStatus;

  // Client Information - flexible to support both formats
  client: PolicyClient | PolicyClientExtended;

  // Policy Details
  carrierId: string;
  productId?: string; // Links to products table
  userId?: string; // Links to auth.users
  product: ProductType; // Product type enum
  productDetails?: Product; // Full product object when joined
  submitDate?: string; // Date string in YYYY-MM-DD format
  effectiveDate: string; // Date string in YYYY-MM-DD format
  termLength?: number; // in years
  expirationDate?: string; // Date string in YYYY-MM-DD format

  // Financial Details
  annualPremium: number;
  monthlyPremium?: number;
  paymentFrequency: PaymentFrequency;
  commissionPercentage: number; // Commission rate as decimal (e.g., 0.95 for 95%)

  // Metadata
  createdAt: string;
  updatedAt: string;
  created_at?: Date; // Optional for BaseEntity compatibility
  updated_at?: Date; // Optional for BaseEntity compatibility
  createdBy?: string;
  notes?: string;

  // Lead source tracking
  leadPurchaseId?: string | null;
  leadSourceType?: LeadSourceType | null;
}

// =============================================================================
// FORM TYPES
// =============================================================================

export interface NewPolicyForm {
  policyNumber: string;
  status: PolicyStatus;

  // Client fields
  clientName: string;
  clientState: string;
  clientDOB: string; // ISO date string (YYYY-MM-DD)
  clientEmail?: string;
  clientPhone?: string;
  clientStreet?: string;
  clientCity?: string;
  clientZipCode?: string;

  // Policy fields
  carrierId: string;
  productId?: string;
  product: ProductType;
  submitDate?: string;
  effectiveDate: string;
  expirationDate?: string;
  termLength?: number;

  // Financial fields
  premium: number;
  annualPremium?: number;
  paymentFrequency: PaymentFrequency;
  commissionPercentage: number;

  notes?: string;
}

export interface PolicyFilters {
  status?: PolicyStatus;
  carrierId?: string;
  product?: ProductType;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
  startDate?: Date;
  endDate?: Date;
  effectiveDateFrom?: string;
  effectiveDateTo?: string;
  minPremium?: number;
  maxPremium?: number;
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface PolicySummary {
  totalPolicies: number;
  activePolicies: number;
  pendingPolicies: number;
  lapsedPolicies: number;
  totalAnnualPremium: number;
  totalExpectedCommission: number;
  averagePolicyValue: number;
  policiesByStatus: Record<PolicyStatus, number>;
  policiesByProduct: Record<ProductType, number>;
}

// =============================================================================
// SERVICE LAYER TYPES
// =============================================================================

/**
 * Data for creating a new policy
 * Uses camelCase for app layer, transforms to snake_case for DB
 */
export interface CreatePolicyData {
  policyNumber?: string | null;
  clientId: string;
  carrierId: string;
  productId?: string;
  userId: string;
  product: ProductType;
  effectiveDate: Date;
  termLength?: number;
  expirationDate?: Date;
  annualPremium: number;
  monthlyPremium: number;
  paymentFrequency: PaymentFrequency;
  commissionPercentage: number;
  notes?: string;
  status?: PolicyStatus;
  // Lead source tracking
  leadPurchaseId?: string | null;
  leadSourceType?: LeadSourceType | null;
}

export type UpdatePolicyData = Partial<CreatePolicyData>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Transform database row to app-level Policy
 */
export function policyRowToPolicy(
  row: PolicyRow,
  client: PolicyClient | PolicyClientExtended,
): Policy {
  return {
    id: row.id,
    policyNumber: row.policy_number,
    status: row.status as PolicyStatus,
    client,
    carrierId: row.carrier_id,
    productId: row.product_id || undefined,
    userId: row.user_id || undefined,
    product: row.product,
    effectiveDate: row.effective_date,
    termLength: row.term_length || undefined,
    expirationDate: row.expiration_date || undefined,
    annualPremium: row.annual_premium || 0,
    monthlyPremium: row.monthly_premium,
    paymentFrequency: (row.payment_frequency as PaymentFrequency) || "monthly",
    commissionPercentage: row.commission_percentage || 0,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    notes: row.notes || undefined,
    leadPurchaseId: row.lead_purchase_id,
    leadSourceType: row.lead_source_type,
  };
}

/**
 * Transform app-level data to database insert
 */
export function createPolicyDataToInsert(data: CreatePolicyData): PolicyInsert {
  return {
    policy_number: data.policyNumber,
    client_id: data.clientId,
    carrier_id: data.carrierId,
    user_id: data.userId,
    product: data.product,
    effective_date: data.effectiveDate.toISOString().split("T")[0],
    term_length: data.termLength,
    expiration_date: data.expirationDate?.toISOString().split("T")[0],
    annual_premium: data.annualPremium,
    monthly_premium: data.monthlyPremium,
    payment_frequency: data.paymentFrequency as PaymentFrequencyDB,
    commission_percentage: data.commissionPercentage,
    notes: data.notes,
    status: data.status || "pending",
  };
}
