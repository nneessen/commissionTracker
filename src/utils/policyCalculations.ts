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
 * Calculate expected commission from annual premium and percentage
 */
export function calculateExpectedCommission(
  annualPremium: number,
  commissionPercentage: number
): number {
  if (annualPremium <= 0 || commissionPercentage <= 0) return 0;
  return (annualPremium * commissionPercentage) / 100;
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