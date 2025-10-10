// /home/nneessen/projects/commissionTracker/src/types/policy.types.ts

import { ProductType } from './commission.types';
import { Product } from './product.types';

export type PolicyStatus = 'pending' | 'active' | 'lapsed' | 'cancelled' | 'matured';
export type PaymentFrequency = 'annual' | 'semi-annual' | 'quarterly' | 'monthly';

// Base client interface with common properties
export interface PolicyClientBase {
  name: string;
  state: string;
  age: number;
  email?: string;
  phone?: string;
}

// Legacy client interface (same as base for backward compatibility)
export interface PolicyClient extends PolicyClientBase {}

// Extended client interface for new service architecture
export interface PolicyClientExtended extends PolicyClientBase {
  firstName: string;
  lastName: string;
  address?: string;
  city?: string;
  zipCode?: string;
}

export interface Policy {
  id: string;
  policyNumber: string;
  status: PolicyStatus;

  // Client Information - flexible to support both formats
  client: PolicyClient | PolicyClientExtended;

  // Policy Details
  carrierId: string;
  productId?: string; // Links to products table (NEW)
  userId?: string; // Links to auth.users
  product: ProductType; // Product type enum (kept for backward compatibility)
  productDetails?: Product; // Full product object when joined (NEW)
  effectiveDate: Date;
  termLength?: number; // in years
  expirationDate?: Date;

  // Financial Details
  annualPremium: number;
  monthlyPremium?: number; // Optional for backward compatibility
  paymentFrequency: PaymentFrequency;
  commissionPercentage: number; // Commission rate as decimal (e.g., 0.95 for 95%)
  // Note: advanceMonths removed - now only stored in commissions table

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  created_at?: Date; // Optional for BaseEntity compatibility
  updated_at?: Date; // Optional for BaseEntity compatibility
  createdBy?: string;
  notes?: string;
}

export interface NewPolicyForm {
  policyNumber: string;
  status: PolicyStatus;

  // Client fields
  clientName: string;
  clientState: string;
  clientAge: number;
  clientEmail?: string;
  clientPhone?: string;

  // Policy fields
  carrierId: string;
  productId?: string; // NEW: Actual product selection
  product: ProductType; // Keep for backward compatibility
  effectiveDate: string; // ISO date string for form
  expirationDate?: string;
  termLength?: number;

  // Financial fields
  premium: number; // Payment amount (monthly, quarterly, etc.)
  annualPremium?: number; // Calculated annual premium
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
  minPremium?: number;
  maxPremium?: number;
}

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

// Service layer types - matches actual database schema
export interface CreatePolicyData {
  policyNumber: string;
  clientId: string; // Foreign key to clients table
  carrierId: string;
  userId: string; // Required for RLS compliance - links to auth.users
  product: ProductType; // Product enum type
  effectiveDate: Date;
  termLength?: number;
  expirationDate?: Date;
  annualPremium: number;
  monthlyPremium: number; // Required field in database
  paymentFrequency: PaymentFrequency;
  commissionPercentage: number; // Stored as decimal (e.g., 0.1025 for 102.5%)
  notes?: string;
  status?: PolicyStatus; // Optional, defaults to 'pending'
}

export type UpdatePolicyData = Partial<CreatePolicyData>;