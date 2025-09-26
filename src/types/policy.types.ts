// /home/nneessen/projects/commissionTracker/src/types/policy.types.ts

import { ProductType } from './commission.types';

export type PolicyStatus = 'pending' | 'active' | 'lapsed' | 'cancelled' | 'matured';
export type PaymentFrequency = 'annual' | 'semi-annual' | 'quarterly' | 'monthly';

export interface PolicyClient {
  name: string;
  state: string;
  age: number;
  email?: string;
  phone?: string;
}

export interface Policy {
  id: string;
  policyNumber: string;
  status: PolicyStatus;

  // Client Information
  client: PolicyClient;

  // Policy Details
  carrierId: string;
  product: ProductType;
  effectiveDate: Date;
  termLength?: number; // in years
  expirationDate?: Date;

  // Financial Details
  annualPremium: number;
  paymentFrequency: PaymentFrequency;
  commissionPercentage: number; // Override carrier default if needed

  // Metadata
  createdAt: Date;
  updatedAt: Date;
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