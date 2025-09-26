export interface Client {
  name: string;
  age: number;
  state: string;
}

export interface Commission {
  id: string;
  client: Client;
  carrierId: string;
  product: ProductType;
  annualPremium: number;
  commissionAmount: number;
  commissionRate: number;
  createdAt: Date;
  updatedAt?: Date;
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
}

export interface CommissionFilters {
  startDate?: Date;
  endDate?: Date;
  carrierId?: string;
  product?: ProductType;
  state?: string;
  minPremium?: number;
  maxPremium?: number;
}