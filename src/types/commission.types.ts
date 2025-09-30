// Import and re-export ProductType from product.types.ts instead of redefining
import type { ProductType } from './product.types';

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
  userId?: string; // Links to auth.users
  agentId?: string; // Deprecated - use userId instead
  client: Client;
  carrierId: string;
  product: ProductType;

  // Commission Details
  type: CommissionType;
  status: CommissionStatus;
  calculationBasis: CalculationBasis;

  // Financial - Enhanced for 9-month advance model
  annualPremium: number;
  monthlyPremium?: number; // Optional for backward compatibility
  commissionAmount: number;
  commissionRate: number; // Auto-calculated from comp guide or manual override
  advanceMonths?: number; // Optional for backward compatibility

  // Comp Guide Integration
  contractCompLevel?: number; // Agent's contract level (80-145)
  isAutoCalculated?: boolean; // True if comp rate was looked up from comp guide
  compGuidePercentage?: number; // Original percentage from comp guide

  // Performance tracking fields (generated columns) - optional for backward compatibility
  monthEarned?: number; // 1-12
  yearEarned?: number; // e.g., 2024
  quarterEarned?: number; // 1-4

  // Dates
  expectedDate?: Date;
  actualDate?: Date;
  paidDate?: Date;
  createdAt: Date;
  updatedAt?: Date; // Optional for backward compatibility
  created_at?: Date; // Optional for BaseEntity compatibility
  updated_at?: Date; // Optional for BaseEntity compatibility

  // Additional
  notes?: string;
}

export type { ProductType } from './product.types';

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

// Service layer types
export type CreateCommissionData = Omit<Commission, 'id' | 'createdAt' | 'updatedAt' | 'created_at' | 'updated_at'>;
export type UpdateCommissionData = Partial<CreateCommissionData>;