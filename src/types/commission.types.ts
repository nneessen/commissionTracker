export interface Client {
  name: string;
  age: number;
  state: string;
}

export type CommissionType = 'first_year' | 'renewal' | 'trail' | 'bonus' | 'override';
export type CommissionStatus = 'pending' | 'paid' | 'clawback' | 'cancelled';
export type CalculationBasis = 'premium' | 'fixed' | 'tiered';

export interface Commission {
  id: string;
  policyId?: string; // Links to Policy when available
  client: Client;
  carrierId: string;
  product: ProductType;

  // Commission Details
  type: CommissionType;
  status: CommissionStatus;
  calculationBasis: CalculationBasis;

  // Financial
  annualPremium: number;
  commissionAmount: number;
  commissionRate: number;

  // Dates
  expectedDate?: Date;
  actualDate?: Date;
  paidDate?: Date;
  createdAt: Date;
  updatedAt?: Date;

  // Additional
  notes?: string;
}

export type ProductType =
  | "whole_life"
  | "term_life"
  | "universal_life"
  | "indexed_universal_life"
  | "accidental_life";

export interface NewCommissionForm {
  clientName: string;
  clientAge: number;
  clientState: string;
  carrierId: string;
  product: ProductType;
  annualPremium: number;
  policyId?: string;
  type?: CommissionType;
  status?: CommissionStatus;
  calculationBasis?: CalculationBasis;
  expectedDate?: Date | string;
  actualDate?: Date | string;
  paidDate?: Date | string;
  notes?: string;
}

export interface CommissionSummary {
  totalCommissions: number;
  totalPremiums: number;
  averageCommissionRate: number;
  commissionCount: number;
  topCarriers: Array<{
    carrierId: string;
    carrierName: string;
    totalCommissions: number;
    count: number;
  }>;
  productBreakdown: Array<{
    product: ProductType;
    count: number;
    totalCommissions: number;
  }>;
  stateBreakdown: Array<{
    state: string;
    count: number;
    totalCommissions: number;
  }>;
  statusBreakdown?: Array<{
    status: CommissionStatus;
    count: number;
    totalCommissions: number;
  }>;
}

export interface CommissionFilters {
  startDate?: Date;
  endDate?: Date;
  carrierId?: string;
  product?: ProductType;
  state?: string;
  status?: CommissionStatus;
  type?: CommissionType;
  minPremium?: number;
  maxPremium?: number;
  policyId?: string;
}