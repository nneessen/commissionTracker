// Import and re-export ProductType from product.types.ts instead of redefining
import type {ProductType} from './product.types';
import type {Database} from './database.types';

// ============================================================================
// Comp Guide Types (DB-first pattern from comp_guide table)
// ============================================================================

/** Raw database row from comp_guide table */
export type CompGuideRow = Database['public']['Tables']['comp_guide']['Row'];
/** Insert type for comp_guide table */
export type CompGuideInsert = Database['public']['Tables']['comp_guide']['Insert'];
/** Update type for comp_guide table */
export type CompGuideUpdate = Database['public']['Tables']['comp_guide']['Update'];

/**
 * Comp Guide entry - carrier product compensation rates
 * Extends database row with camelCase aliases for UI consistency
 */
export interface Comp extends CompGuideRow {
  // No additional fields needed - database schema is the source of truth
}

/** Create compensation guide data (form input) */
export interface CreateCompData {
  carrier_id: string;
  product_type: Database['public']['Enums']['product_type'];
  contract_level: number;
  product_id?: string;
  commission_percentage: number;
  bonus_percentage?: number;
  effective_date: string;
  expiration_date?: string;
  minimum_premium?: number;
  maximum_premium?: number;
}

/** Update compensation guide data */
export interface UpdateCompData {
  carrier_id?: string;
  product_type?: Database['public']['Enums']['product_type'];
  contract_level?: number;
  product_id?: string;
  commission_percentage?: number;
  bonus_percentage?: number;
  effective_date?: string;
  expiration_date?: string;
  minimum_premium?: number;
  maximum_premium?: number;
}

/** Filters for querying comp guide entries */
export interface CompFilters {
  carrier_id?: string;
  product_type?: Database['public']['Enums']['product_type'];
  contract_level?: number;
  product_id?: string;
  effective_from?: string;
  effective_to?: string;
}

/** Product summary statistics from comp guide */
export interface ProductSummary {
  product_type: Database['public']['Enums']['product_type'];
  carrier_count: number;
  avg_commission: number;
  min_contract_level: number;
  max_contract_level: number;
}

// ============================================================================
// Commission Types
// ============================================================================

/**
 * Minimal client info for commission records
 * This is NOT the full Client entity - use client.types.ts for that
 * This is just the embedded client snapshot in a commission
 */
export interface CommissionClientInfo {
  name: string;
  age: number;
  state: string;
}

/**
 * @deprecated Use CommissionClientInfo instead
 * Kept for backward compatibility
 */
export type Client = CommissionClientInfo;

export type CommissionType = 'first_year' | 'renewal' | 'trail' | 'bonus' | 'override';

/**
 * Commission Status Lifecycle
 *
 * USER-CONTROLLABLE STATUSES (Normal lifecycle):
 * - pending: Policy not active yet, no commission owed
 * - earned: Policy active, commission earned but not paid yet (money not received)
 * - paid: Money actually received in bank account
 *
 * AUTOMATIC TERMINAL STATUSES (Set by database triggers only):
 * - charged_back: Chargeback applied when policy lapses/cancels before fully earned (AUTOMATIC)
 * - cancelled: Commission cancelled when policy cancelled/lapsed (AUTOMATIC)
 * - clawback: Commission was paid but later clawed back (AUTOMATIC)
 *
 * IMPORTANT:
 * - charged_back, cancelled, and clawback should NEVER be set manually via UI
 * - These statuses are set automatically by database triggers when policies lapse/cancel
 * - User should use policy action buttons (Cancel Policy, Mark as Lapsed) instead
 * - Commission status FOLLOWS policy status, not vice versa
 */
export type CommissionStatus = 'pending' | 'earned' | 'paid' | 'clawback' | 'charged_back' | 'cancelled';
export type CalculationBasis = 'premium' | 'fixed' | 'tiered';

export interface Commission {
  id: string;
  policyId?: string; // Links to Policy when available
  userId: string; // Links to auth.users (required)
  client: CommissionClientInfo;
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