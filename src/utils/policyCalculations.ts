// /home/nneessen/projects/commissionTracker/src/utils/policyCalculations.ts

import { PaymentFrequency } from '../types/policy.types';

/**
 * Calculate annual premium from payment amount and frequency
 */
export function calculateAnnualPremium(
  premium: number,
  frequency: PaymentFrequency
): number {
  if (premium <= 0) return 0;

  switch (frequency) {
    case 'monthly':
      return premium * 12;
    case 'quarterly':
      return premium * 4;
    case 'semi-annual':
      return premium * 2;
    case 'annual':
      return premium;
    default:
      return premium;
  }
}

/**
 * Calculate payment amount from annual premium and frequency
 */
export function calculatePaymentAmount(
  annualPremium: number,
  frequency: PaymentFrequency
): number {
  if (annualPremium <= 0) return 0;

  switch (frequency) {
    case 'monthly':
      return annualPremium / 12;
    case 'quarterly':
      return annualPremium / 4;
    case 'semi-annual':
      return annualPremium / 2;
    case 'annual':
      return annualPremium;
    default:
      return annualPremium;
  }
}

/**
 * Calculate expected commission advance (9-month advance by default)
 * Formula: Monthly Premium × Advance Months × Commission Rate
 *
 * @param annualPremium - Annual premium amount
 * @param commissionPercentage - Commission percentage (e.g., 100 for 100%)
 * @param advanceMonths - Number of months advance (default 9)
 */
export function calculateExpectedCommission(
  annualPremium: number,
  commissionPercentage: number,
  advanceMonths: number = 9
): number {
  if (annualPremium <= 0 || commissionPercentage <= 0) return 0;

  // Convert annual to monthly premium
  const monthlyPremium = annualPremium / 12;

  // Calculate advance: Monthly Premium × Advance Months × Commission Rate
  return (monthlyPremium * advanceMonths * commissionPercentage) / 100;
}

/**
 * Validate commission percentage is within reasonable bounds
 */
export function validateCommissionPercentage(percentage: number): boolean {
  return percentage > 0 && percentage <= 200; // Allow up to 200% for first-year bonuses
}

/**
 * Validate premium amount
 */
export function validatePremium(premium: number): boolean {
  return premium > 0 && premium < 1000000; // Reasonable upper limit
}