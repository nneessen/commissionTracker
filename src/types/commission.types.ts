// Import and re-export ProductType from product.types.ts instead of redefining
import type { ProductType } from './product.types';

export interface Client {
  name: string;
  age: number;
  state: string;
}

export type CommissionType = 'first_year' | 'renewal' | 'trail' | 'bonus' | 'override';

/**
 * Commission Status Lifecycle
 * - pending: Policy not active yet, no commission owed
 * - earned: Policy active, commission earned but not paid yet (money not received)
 * - paid: Money actually received in bank account
 * - clawback: Commission was paid but clawed back
 * - charged_back: Chargeback has been applied due to policy lapse/cancellation
 * - cancelled: Commission cancelled (policy cancelled/lapsed)
 */
export type CommissionStatus = 'pending' | 'earned' | 'paid' | 'clawback' | 'charged_back' | 'cancelled';
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

  // ADVANCE (upfront payment) - Database field names
  amount: number;                // Total commission amount (maps to DB 'commission_amount' field)
  rate: number;                  // Commission rate as percentage (maps to DB 'rate' field)
  advanceMonths: number;         // Number of months in advance (default 9, maps to DB 'advance_months')

  // EARNING TRACKING (as client pays premiums) - Database field names
  monthsPaid: number;            // How many premiums the client has paid (maps to DB 'months_paid')
  earnedAmount: number;          // Portion of advance that's been earned (maps to DB 'earned_amount')
  unearnedAmount: number;        // Portion of advance still at risk of chargeback (maps to DB 'unearned_amount')
  lastPaymentDate?: Date;        // When the last premium was paid (maps to DB 'last_payment_date')

  // CHARGEBACK TRACKING (when policy lapses/cancels)
  chargebackAmount?: number;     // Amount that must be repaid if policy cancels/lapses (maps to DB 'chargeback_amount')
  chargebackDate?: Date;         // When the chargeback was applied (maps to DB 'chargeback_date')
  chargebackReason?: string;     // Reason for chargeback (maps to DB 'chargeback_reason')

  // DEPRECATED: Use 'amount' instead
  /** @deprecated Use 'amount' field instead - kept for backward compatibility */
  advanceAmount?: number;

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
  paymentDate?: Date | string; // Maps to DB field 'payment_date' - when commission was paid
  paidDate?: Date; // @deprecated - use paymentDate instead (kept for backward compatibility)
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