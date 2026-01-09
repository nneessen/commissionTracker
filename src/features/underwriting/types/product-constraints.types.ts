// src/features/underwriting/types/product-constraints.types.ts

/**
 * Age tier for face amount limits
 * Defines maximum face amount allowed for a specific age range
 */
export interface AgeTier {
  minAge: number;
  maxAge: number;
  maxFaceAmount: number;
}

/**
 * Age-tiered face amount configuration
 * Allows different max face amounts for different age bands
 */
export interface AgeTieredFaceAmounts {
  tiers: AgeTier[];
}

/**
 * Knockout conditions configuration
 * Health conditions that automatically disqualify a client from this product
 */
export interface KnockoutConditions {
  /** Condition codes from underwriting_health_conditions table */
  conditionCodes: string[];
}

/**
 * Age band for full underwriting threshold
 * Different thresholds can apply to different age ranges
 */
export interface FullUnderwritingAgeBand {
  minAge: number;
  maxAge: number;
  threshold: number;
}

/**
 * Full underwriting threshold configuration
 * Defines when full medical underwriting is required vs simplified issue
 */
export interface FullUnderwritingThreshold {
  /** Base threshold - face amounts above this require full underwriting */
  faceAmountThreshold: number;
  /** Optional age-specific thresholds that override the base */
  ageBands?: FullUnderwritingAgeBand[];
}

/**
 * Complete underwriting constraints stored in product.metadata
 */
export interface ProductUnderwritingConstraints {
  ageTieredFaceAmounts?: AgeTieredFaceAmounts;
  knockoutConditions?: KnockoutConditions;
  fullUnderwritingThreshold?: FullUnderwritingThreshold;
}

/**
 * Product with underwriting constraint data
 * Extended product info used for eligibility checking
 */
export interface ProductWithConstraints {
  id: string;
  name: string;
  carrier_id: string;
  carrier_name: string;
  product_type: string;
  min_age: number | null;
  max_age: number | null;
  min_face_amount: number | null;
  max_face_amount: number | null;
  metadata: ProductUnderwritingConstraints | null;
}

/**
 * Result of checking a product's eligibility for a client
 */
export interface ProductEligibilityResult {
  productId: string;
  productName: string;
  carrierId: string;
  carrierName: string;
  productType: string;
  /** Whether the client is eligible for this product */
  isEligible: boolean;
  /** Reasons why the client is ineligible (if any) */
  ineligibilityReasons: string[];
  /** Maximum face amount allowed for this client's age */
  maxAllowedFaceAmount: number | null;
  /** Whether the requested amount requires full medical underwriting */
  requiresFullUnderwriting: boolean;
  /** The threshold above which full underwriting is required */
  fullUnderwritingThreshold: number | null;
}

/**
 * Client profile data needed for eligibility checking
 */
export interface EligibilityClientProfile {
  age: number;
  requestedFaceAmount: number;
  /** Health condition codes the client has disclosed */
  conditionCodes: string[];
}

/**
 * Result of filtering multiple products for eligibility
 */
export interface EligibilityFilterResult {
  eligible: ProductEligibilityResult[];
  ineligible: ProductEligibilityResult[];
}
