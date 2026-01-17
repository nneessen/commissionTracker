// src/services/commissions/termModifierUtils.ts
// Utility functions for applying term-based commission modifiers

import type {
  TermCommissionModifiers,
  TermLength,
} from "@/types/product.types";
import { VALID_TERM_LENGTHS } from "@/types/product.types";

/**
 * Get the commission rate modifier for a given term length.
 * Returns 0 if no modifier is configured (no change to rate).
 *
 * @param modifiers - Term commission modifiers from product metadata
 * @param termLength - Selected term length in years
 * @returns Modifier value (e.g., -0.10 for 10% reduction, 0 for no change)
 */
export function getTermModifier(
  modifiers: TermCommissionModifiers | undefined | null,
  termLength: number | undefined | null,
): number {
  if (!modifiers || !termLength) {
    return 0;
  }

  const modifier = modifiers[termLength as TermLength];
  return modifier ?? 0;
}

/**
 * Apply term modifier to a commission rate.
 *
 * @param baseRate - The comp_guide commission rate (decimal, e.g., 0.95 for 95%)
 * @param modifier - The term modifier (e.g., -0.10 for 10% reduction)
 * @returns Adjusted commission rate
 *
 * @example
 * applyTermModifier(0.95, -0.10) // Returns 0.855 (95% * 0.90 = 85.5%)
 * applyTermModifier(0.95, 0) // Returns 0.95 (no change)
 * applyTermModifier(1.10, -0.05) // Returns 1.045 (110% * 0.95 = 104.5%)
 */
export function applyTermModifier(baseRate: number, modifier: number): number {
  return baseRate * (1 + modifier);
}

/**
 * Validate that a term length is valid for term_life products.
 *
 * @param termLength - Term length to validate
 * @returns True if term length is valid (10, 15, 20, 25, or 30)
 */
export function isValidTermLength(
  termLength: number,
): termLength is TermLength {
  return VALID_TERM_LENGTHS.includes(termLength as TermLength);
}

/**
 * Calculate the adjusted commission rate with term modifier applied.
 * Convenience function that combines getTermModifier and applyTermModifier.
 *
 * @param baseRate - The comp_guide commission rate (decimal)
 * @param modifiers - Term commission modifiers from product metadata
 * @param termLength - Selected term length in years
 * @returns Object with adjusted rate and modifier details
 */
export function calculateAdjustedCommissionRate(
  baseRate: number,
  modifiers: TermCommissionModifiers | undefined | null,
  termLength: number | undefined | null,
): {
  adjustedRate: number;
  modifier: number;
  wasModified: boolean;
} {
  const modifier = getTermModifier(modifiers, termLength);
  const adjustedRate = applyTermModifier(baseRate, modifier);

  return {
    adjustedRate,
    modifier,
    wasModified: modifier !== 0,
  };
}

// Re-export for convenience
export { VALID_TERM_LENGTHS };
export type { TermCommissionModifiers, TermLength };
