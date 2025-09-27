// /home/nneessen/projects/commissionTracker/src/types/policy.types.ts

import { ProductType } from './commission.types';

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
  agentId?: string; // Optional for backward compatibility
  product: ProductType;
  effectiveDate: Date;
  termLength?: number; // in years
  expirationDate?: Date;

  // Financial Details
  annualPremium: number;
  monthlyPremium?: number; // Optional for backward compatibility
  paymentFrequency: PaymentFrequency;
  commissionPercentage: number; // Override carrier default if needed
  advanceMonths?: number; // Optional for backward compatibility

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
  product: ProductType;
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

// Service layer types - backward compatible
export interface CreatePolicyData {
  policyNumber: string;
  client: PolicyClient | PolicyClientExtended; // Support both formats
  carrierId: string;
  agentId?: string; // Optional for backward compatibility
  product: ProductType;
  effectiveDate: Date;
  termLength?: number;
  expirationDate?: Date;
  annualPremium: number;
  monthlyPremium?: number; // Optional
  paymentFrequency: PaymentFrequency;
  commissionPercentage: number;
  advanceMonths?: number; // Optional
  createdBy?: string;
  notes?: string;
  status?: PolicyStatus; // Optional, defaults to 'active'
}

export type UpdatePolicyData = Partial<CreatePolicyData>;