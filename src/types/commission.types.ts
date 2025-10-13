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
  userId: string; // Links to auth.users (required)
  client: Client;
  carrierId: string;
  product: ProductType;

  // Commission Details
  type: CommissionType;
  status: CommissionStatus;
  calculationBasis: CalculationBasis;

  // Financial - Commission Advance Model
  annualPremium: number;
  monthlyPremium?: number; // Optional for backward compatibility

  // ADVANCE (upfront payment)
  advanceAmount: number;        // The upfront commission payment (monthly_premium × 9 × rate)
  advanceMonths: number;         // Number of months in advance (default 9)

  // EARNING TRACKING (as client pays premiums)
  monthsPaid: number;            // How many premiums the client has paid
  earnedAmount: number;          // Portion of advance that's been earned
  unearnedAmount: number;        // Portion of advance still at risk of chargeback
  lastPaymentDate?: Date;        // When the last premium was paid

  // COMMISSION RATE
  commissionRate: number;        // Commission rate as DECIMAL from comp guide (e.g., 0.95 for 95%)

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