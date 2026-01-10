// supabase/functions/underwriting-ai-analyze/criteria-evaluator.ts
// Deterministic criteria evaluation for underwriting analysis
// Applies extracted and approved criteria rules before AI analysis
//
// SYNC: Types in this file must match src/features/underwriting/types/underwriting.types.ts
// When updating ExtractedCriteria or CriteriaEvaluationResult, update both locations.

// =============================================================================
// Constants
// =============================================================================

export const FILTER_RULES = {
  CRITERIA: "criteria",
  PRODUCT_METADATA: "product_metadata",
  DECISION_TREE: "decision_tree",
} as const;

export type FilterRule = (typeof FILTER_RULES)[keyof typeof FILTER_RULES];

// =============================================================================
// Types
// =============================================================================

export interface AgeTier {
  minAge: number;
  maxAge: number;
  maxFaceAmount: number;
}

export interface KnockoutDescription {
  code: string;
  name: string;
  severity: string;
}

export interface SmokingClassification {
  classification: string;
  requiresCleanMonths: number;
}

export interface ExtractedCriteria {
  ageLimits?: {
    minIssueAge: number;
    maxIssueAge: number;
  };
  faceAmountLimits?: {
    minimum: number;
    maximum: number;
    ageTiers?: AgeTier[];
  };
  knockoutConditions?: {
    conditionCodes: string[];
    descriptions: KnockoutDescription[];
  };
  buildRequirements?: {
    type: "height_weight" | "bmi";
    preferredPlusBmiMax?: number;
    preferredBmiMax?: number;
    standardBmiMax?: number;
  };
  tobaccoRules?: {
    smokingClassifications: SmokingClassification[];
    nicotineTestRequired: boolean;
  };
  medicationRestrictions?: {
    insulin?: { allowed: boolean; ratingImpact?: string };
    bloodThinners?: { allowed: boolean };
    opioids?: { allowed: boolean; timeSinceUse?: number };
    bpMedications?: { maxCount: number };
    cholesterolMedications?: { maxCount: number };
    antidepressants?: { allowed: boolean };
  };
  stateAvailability?: {
    availableStates: string[];
    unavailableStates: string[];
  };
}

export interface CriteriaEvaluationResult {
  eligible: boolean;
  reasons: string[];
  buildRating?:
    | "preferred_plus"
    | "preferred"
    | "standard"
    | "table_rated"
    | "decline";
  tobaccoClass?: string;
  medicationWarnings?: string[];
}

export interface CriteriaFilteredProduct {
  carrierId: string;
  carrierName: string;
  productId?: string;
  productName?: string;
  rule: string;
  reason: string;
}

export interface CarrierCriteriaEntry {
  carrierName: string;
  criteria: ExtractedCriteria;
  productId?: string;
}

export interface ClientProfile {
  age: number;
  state: string;
  bmi: number;
}

export interface HealthProfile {
  conditions: Array<{ code: string }>;
  tobacco: {
    currentUse: boolean;
    lastUseDate?: string;
    type?: string;
  };
  medications?: {
    bpMedCount?: number;
    cholesterolMedCount?: number;
    insulinUse?: boolean;
    bloodThinners?: boolean;
    antidepressants?: boolean;
    painMedications?: string;
  };
}

export interface CoverageRequest {
  faceAmount: number;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate months since a given date
 */
function monthsSince(dateStr: string): number {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 0;

    const now = new Date();
    return (
      (now.getFullYear() - date.getFullYear()) * 12 +
      (now.getMonth() - date.getMonth())
    );
  } catch {
    return 0;
  }
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

// =============================================================================
// Main Evaluator Function
// =============================================================================

/**
 * Evaluate extracted criteria against client profile.
 * Returns eligibility status and reasons for any failures.
 * Also determines build rating and tobacco classification when applicable.
 */
export function evaluateCriteria(
  criteria: ExtractedCriteria,
  client: ClientProfile,
  health: HealthProfile,
  coverage: CoverageRequest,
): CriteriaEvaluationResult {
  // Input validation - fail fast on invalid data
  if (!Number.isFinite(client.age) || client.age < 0) {
    return {
      eligible: false,
      reasons: [`Invalid client age: ${client.age}`],
    };
  }
  if (!Number.isFinite(coverage.faceAmount) || coverage.faceAmount <= 0) {
    return {
      eligible: false,
      reasons: [`Invalid face amount: ${coverage.faceAmount}`],
    };
  }
  if (!Number.isFinite(client.bmi) || client.bmi <= 0) {
    return {
      eligible: false,
      reasons: [`Invalid BMI: ${client.bmi}`],
    };
  }

  const reasons: string[] = [];
  const medicationWarnings: string[] = [];
  let eligible = true;

  // -------------------------------------------------------------------------
  // Age Limits Evaluation
  // -------------------------------------------------------------------------
  if (criteria.ageLimits) {
    const { minIssueAge, maxIssueAge } = criteria.ageLimits;

    if (minIssueAge !== undefined && client.age < minIssueAge) {
      reasons.push(`Age ${client.age} below minimum issue age ${minIssueAge}`);
      eligible = false;
    }

    if (maxIssueAge !== undefined && client.age > maxIssueAge) {
      reasons.push(`Age ${client.age} above maximum issue age ${maxIssueAge}`);
      eligible = false;
    }
  }

  // -------------------------------------------------------------------------
  // Face Amount Limits Evaluation (with age tiers)
  // -------------------------------------------------------------------------
  if (criteria.faceAmountLimits) {
    const { minimum, maximum, ageTiers } = criteria.faceAmountLimits;

    // Check minimum
    if (minimum !== undefined && coverage.faceAmount < minimum) {
      reasons.push(
        `Face amount ${formatCurrency(coverage.faceAmount)} below minimum ${formatCurrency(minimum)}`,
      );
      eligible = false;
    }

    // Determine applicable maximum (check age tiers first)
    // IMPORTANT: Find ALL matching tiers and use the MOST RESTRICTIVE (lowest max)
    // This handles overlapping tiers correctly (e.g., general tier + senior restriction)
    let applicableMax = maximum;

    if (ageTiers && ageTiers.length > 0) {
      const matchingTiers = ageTiers.filter(
        (tier) => client.age >= tier.minAge && client.age <= tier.maxAge,
      );

      if (matchingTiers.length > 0) {
        // Find the most restrictive tier (lowest maxFaceAmount)
        const mostRestrictiveTier = matchingTiers.reduce((a, b) =>
          a.maxFaceAmount < b.maxFaceAmount ? a : b,
        );
        // Use the more restrictive of tier max and overall max
        applicableMax = Math.min(
          mostRestrictiveTier.maxFaceAmount,
          maximum ?? Infinity,
        );
      }
    }

    // Check against applicable maximum
    if (applicableMax !== undefined && coverage.faceAmount > applicableMax) {
      const tierNote =
        ageTiers && ageTiers.length > 0
          ? ` (age-tier limit for age ${client.age})`
          : "";
      reasons.push(
        `Face amount ${formatCurrency(coverage.faceAmount)} exceeds maximum ${formatCurrency(applicableMax)}${tierNote}`,
      );
      eligible = false;
    }
  }

  // -------------------------------------------------------------------------
  // Knockout Conditions Evaluation
  // -------------------------------------------------------------------------
  if (criteria.knockoutConditions?.conditionCodes) {
    const knockoutCodes = criteria.knockoutConditions.conditionCodes;
    const clientConditionCodes = health.conditions.map((c) => c.code);

    for (const clientCode of clientConditionCodes) {
      if (knockoutCodes.includes(clientCode)) {
        // Try to get friendly name from descriptions
        const description = criteria.knockoutConditions.descriptions?.find(
          (d) => d.code === clientCode,
        );
        const conditionName = description?.name || clientCode;

        reasons.push(`Knockout condition: ${conditionName} (${clientCode})`);
        eligible = false;
      }
    }
  }

  // -------------------------------------------------------------------------
  // State Availability Evaluation
  // -------------------------------------------------------------------------
  if (criteria.stateAvailability) {
    const { availableStates, unavailableStates } = criteria.stateAvailability;

    // Check unavailable states first (explicit exclusion)
    if (
      unavailableStates?.length > 0 &&
      unavailableStates.includes(client.state)
    ) {
      reasons.push(`Product not available in state: ${client.state}`);
      eligible = false;
    }

    // If available states is specified, check inclusion
    // (only applies if unavailable check didn't already fail)
    if (
      eligible &&
      availableStates?.length > 0 &&
      !availableStates.includes(client.state)
    ) {
      reasons.push(`Product not available in state: ${client.state}`);
      eligible = false;
    }
  }

  // -------------------------------------------------------------------------
  // Build Requirements Evaluation (affects rating, not necessarily eligibility)
  // -------------------------------------------------------------------------
  let buildRating: CriteriaEvaluationResult["buildRating"] = undefined;

  if (criteria.buildRequirements && criteria.buildRequirements.type === "bmi") {
    const { preferredPlusBmiMax, preferredBmiMax, standardBmiMax } =
      criteria.buildRequirements;

    // Evaluate BMI against thresholds (from strictest to most lenient)
    if (standardBmiMax !== undefined && client.bmi > standardBmiMax) {
      buildRating = "table_rated";
      reasons.push(
        `BMI ${client.bmi.toFixed(1)} exceeds standard maximum ${standardBmiMax}`,
      );
      // Note: This doesn't set eligible=false, just affects rating
    } else if (preferredBmiMax !== undefined && client.bmi > preferredBmiMax) {
      buildRating = "standard";
    } else if (
      preferredPlusBmiMax !== undefined &&
      client.bmi > preferredPlusBmiMax
    ) {
      buildRating = "preferred";
    } else {
      buildRating = "preferred_plus";
    }
  }

  // -------------------------------------------------------------------------
  // Tobacco Rules Evaluation (affects classification)
  // -------------------------------------------------------------------------
  let tobaccoClass: string | undefined;

  if (criteria.tobaccoRules?.smokingClassifications) {
    const { smokingClassifications } = criteria.tobaccoRules;

    if (health.tobacco.currentUse) {
      // Currently using tobacco - smoker class
      tobaccoClass = "smoker";
    } else if (health.tobacco.lastUseDate) {
      // Not currently using - check clean months
      const cleanMonths = monthsSince(health.tobacco.lastUseDate);

      // Find the best classification they qualify for
      // Sort by requiresCleanMonths descending (highest first) so we check
      // the strictest requirements first. The first one they qualify for
      // is the best class they can achieve.
      const sortedClassifications = [...smokingClassifications].sort(
        (a, b) => b.requiresCleanMonths - a.requiresCleanMonths,
      );

      for (const classification of sortedClassifications) {
        if (cleanMonths >= classification.requiresCleanMonths) {
          tobaccoClass = classification.classification;
          break;
        }
      }

      // If no classification matched, default to smoker
      if (!tobaccoClass) {
        tobaccoClass = "smoker";
      }
    } else {
      // No tobacco info - assume non-smoker (best case)
      // Find classification requiring 0 months
      const nonSmokerClass = smokingClassifications.find(
        (c) => c.requiresCleanMonths === 0,
      );
      tobaccoClass = nonSmokerClass?.classification || "non-smoker";
    }
  }

  // -------------------------------------------------------------------------
  // Medication Restrictions Evaluation (warnings, may affect eligibility)
  // -------------------------------------------------------------------------
  if (criteria.medicationRestrictions && health.medications) {
    const meds = health.medications;
    const restrictions = criteria.medicationRestrictions;

    // Insulin check
    if (
      restrictions.insulin &&
      !restrictions.insulin.allowed &&
      meds.insulinUse
    ) {
      reasons.push("Insulin use not allowed");
      eligible = false;
    } else if (
      restrictions.insulin?.allowed &&
      meds.insulinUse &&
      restrictions.insulin.ratingImpact
    ) {
      medicationWarnings.push(
        `Insulin use: ${restrictions.insulin.ratingImpact}`,
      );
    }

    // Blood thinners check
    if (
      restrictions.bloodThinners &&
      !restrictions.bloodThinners.allowed &&
      meds.bloodThinners
    ) {
      reasons.push("Blood thinner use not allowed");
      eligible = false;
    }

    // BP medication count check
    if (
      restrictions.bpMedications?.maxCount !== undefined &&
      meds.bpMedCount !== undefined &&
      meds.bpMedCount > restrictions.bpMedications.maxCount
    ) {
      medicationWarnings.push(
        `BP medication count (${meds.bpMedCount}) exceeds maximum (${restrictions.bpMedications.maxCount})`,
      );
    }

    // Cholesterol medication count check
    if (
      restrictions.cholesterolMedications?.maxCount !== undefined &&
      meds.cholesterolMedCount !== undefined &&
      meds.cholesterolMedCount > restrictions.cholesterolMedications.maxCount
    ) {
      medicationWarnings.push(
        `Cholesterol medication count (${meds.cholesterolMedCount}) exceeds maximum (${restrictions.cholesterolMedications.maxCount})`,
      );
    }

    // Opioids check
    if (
      restrictions.opioids &&
      !restrictions.opioids.allowed &&
      meds.painMedications === "opioid"
    ) {
      reasons.push("Opioid use not allowed");
      eligible = false;
    }

    // Antidepressants check
    if (
      restrictions.antidepressants &&
      !restrictions.antidepressants.allowed &&
      meds.antidepressants
    ) {
      medicationWarnings.push("Antidepressant use may affect rating");
    }
  }

  return {
    eligible,
    reasons,
    buildRating,
    tobaccoClass,
    medicationWarnings:
      medicationWarnings.length > 0 ? medicationWarnings : undefined,
  };
}

// =============================================================================
// Context Builder for AI Prompt
// =============================================================================

/**
 * Build a structured criteria summary for inclusion in the AI prompt.
 * This replaces raw guide excerpts with validated, structured information.
 */
export function buildCriteriaContext(
  criteriaByCarrier: Map<string, CarrierCriteriaEntry>,
): string {
  if (criteriaByCarrier.size === 0) {
    return "";
  }

  const entries: string[] = [];

  for (const [_carrierId, entry] of criteriaByCarrier) {
    const { carrierName, criteria } = entry;
    const lines: string[] = [`### ${carrierName} Underwriting Criteria:`];

    // Age limits
    if (criteria.ageLimits) {
      const { minIssueAge, maxIssueAge } = criteria.ageLimits;
      lines.push(`- Issue Age: ${minIssueAge}-${maxIssueAge}`);
    }

    // Face amount limits
    if (criteria.faceAmountLimits) {
      const { minimum, maximum, ageTiers } = criteria.faceAmountLimits;
      lines.push(
        `- Face Amount: ${formatCurrency(minimum)}-${formatCurrency(maximum)}`,
      );

      if (ageTiers && ageTiers.length > 0) {
        lines.push(`  Age-tiered maximums:`);
        for (const tier of ageTiers) {
          lines.push(
            `    - Ages ${tier.minAge}-${tier.maxAge}: max ${formatCurrency(tier.maxFaceAmount)}`,
          );
        }
      }
    }

    // Knockout conditions
    if (
      criteria.knockoutConditions?.conditionCodes &&
      criteria.knockoutConditions.conditionCodes.length > 0
    ) {
      const descriptions = criteria.knockoutConditions.descriptions || [];
      const conditionsList = criteria.knockoutConditions.conditionCodes
        .map((code) => {
          const desc = descriptions.find((d) => d.code === code);
          return desc ? `${desc.name} (${code})` : code;
        })
        .join(", ");
      lines.push(`- Knockout Conditions: ${conditionsList}`);
    }

    // Build requirements
    if (criteria.buildRequirements) {
      const { type, preferredPlusBmiMax, preferredBmiMax, standardBmiMax } =
        criteria.buildRequirements;
      if (type === "bmi") {
        const bmiLimits: string[] = [];
        if (preferredPlusBmiMax)
          bmiLimits.push(`Preferred Plus: BMI ≤${preferredPlusBmiMax}`);
        if (preferredBmiMax)
          bmiLimits.push(`Preferred: BMI ≤${preferredBmiMax}`);
        if (standardBmiMax) bmiLimits.push(`Standard: BMI ≤${standardBmiMax}`);
        if (bmiLimits.length > 0) {
          lines.push(`- Build/BMI: ${bmiLimits.join(", ")}`);
        }
      }
    }

    // Tobacco rules
    if (criteria.tobaccoRules?.smokingClassifications) {
      const rules = criteria.tobaccoRules.smokingClassifications
        .map(
          (c) =>
            `${c.classification}: ${c.requiresCleanMonths}mo clean required`,
        )
        .join("; ");
      lines.push(`- Tobacco Classes: ${rules}`);

      if (criteria.tobaccoRules.nicotineTestRequired) {
        lines.push(`  (Nicotine test required)`);
      }
    }

    // State availability
    if (criteria.stateAvailability) {
      const { availableStates, unavailableStates } = criteria.stateAvailability;

      if (unavailableStates && unavailableStates.length > 0) {
        if (unavailableStates.length <= 10) {
          lines.push(`- Unavailable States: ${unavailableStates.join(", ")}`);
        } else {
          lines.push(
            `- Unavailable States: ${unavailableStates.slice(0, 10).join(", ")} (+${unavailableStates.length - 10} more)`,
          );
        }
      }

      if (
        availableStates &&
        availableStates.length > 0 &&
        availableStates.length < 50
      ) {
        // Only show if it's a restricted list (not all states)
        if (availableStates.length <= 10) {
          lines.push(`- Available States: ${availableStates.join(", ")}`);
        } else {
          lines.push(`- Available in ${availableStates.length} states`);
        }
      }
    }

    // Medication restrictions summary
    if (criteria.medicationRestrictions) {
      const restrictions: string[] = [];
      const mr = criteria.medicationRestrictions;

      if (mr.insulin && !mr.insulin.allowed) restrictions.push("No insulin");
      if (mr.bloodThinners && !mr.bloodThinners.allowed)
        restrictions.push("No blood thinners");
      if (mr.opioids && !mr.opioids.allowed) restrictions.push("No opioids");
      if (mr.bpMedications?.maxCount !== undefined)
        restrictions.push(`BP meds ≤${mr.bpMedications.maxCount}`);

      if (restrictions.length > 0) {
        lines.push(`- Medication Rules: ${restrictions.join(", ")}`);
      }
    }

    entries.push(lines.join("\n"));
  }

  return entries.join("\n\n");
}

// =============================================================================
// Batch Evaluation Helper
// =============================================================================

/**
 * Evaluate criteria for multiple carriers and return filtered products.
 * Used by the Edge Function to pre-filter before AI analysis.
 */
export function evaluateCriteriaForCarriers(
  criteriaByCarrier: Map<string, CarrierCriteriaEntry>,
  client: ClientProfile,
  health: HealthProfile,
  coverage: CoverageRequest,
): {
  eligibleCarrierIds: string[];
  filteredProducts: CriteriaFilteredProduct[];
  evaluationResults: Map<string, CriteriaEvaluationResult>;
} {
  const eligibleCarrierIds: string[] = [];
  const filteredProducts: CriteriaFilteredProduct[] = [];
  const evaluationResults = new Map<string, CriteriaEvaluationResult>();

  for (const [carrierId, entry] of criteriaByCarrier) {
    const result = evaluateCriteria(entry.criteria, client, health, coverage);
    evaluationResults.set(carrierId, result);

    if (result.eligible) {
      eligibleCarrierIds.push(carrierId);
    } else {
      // Track each reason as a separate filtered product entry
      for (const reason of result.reasons) {
        filteredProducts.push({
          carrierId,
          carrierName: entry.carrierName,
          productId: entry.productId,
          rule: FILTER_RULES.CRITERIA,
          reason,
        });
      }
    }
  }

  return {
    eligibleCarrierIds,
    filteredProducts,
    evaluationResults,
  };
}
