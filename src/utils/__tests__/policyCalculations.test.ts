// /home/nneessen/projects/commissionTracker/src/utils/__tests__/policyCalculations.test.ts

import {calculateAnnualPremium, calculatePaymentAmount, calculateExpectedCommission, validateCommissionPercentage, validatePremium} from '../policyCalculations';

describe('Policy Calculations', () => {
  describe('calculateAnnualPremium', () => {
    it('should calculate annual premium for monthly payments', () => {
      expect(calculateAnnualPremium(100, 'monthly')).toBe(1200);
    });

    it('should calculate annual premium for quarterly payments', () => {
      expect(calculateAnnualPremium(300, 'quarterly')).toBe(1200);
    });

    it('should calculate annual premium for semi-annual payments', () => {
      expect(calculateAnnualPremium(600, 'semi-annual')).toBe(1200);
    });

    it('should calculate annual premium for annual payments', () => {
      expect(calculateAnnualPremium(1200, 'annual')).toBe(1200);
    });

    it('should return 0 for zero or negative premiums', () => {
      expect(calculateAnnualPremium(0, 'monthly')).toBe(0);
      expect(calculateAnnualPremium(-100, 'monthly')).toBe(0);
    });

    it('should handle decimal premiums correctly', () => {
      expect(calculateAnnualPremium(99.99, 'monthly')).toBeCloseTo(1199.88, 2);
    });
  });

  describe('calculatePaymentAmount', () => {
    it('should calculate monthly payment from annual premium', () => {
      expect(calculatePaymentAmount(1200, 'monthly')).toBe(100);
    });

    it('should calculate quarterly payment from annual premium', () => {
      expect(calculatePaymentAmount(1200, 'quarterly')).toBe(300);
    });

    it('should calculate semi-annual payment from annual premium', () => {
      expect(calculatePaymentAmount(1200, 'semi-annual')).toBe(600);
    });

    it('should return annual premium for annual frequency', () => {
      expect(calculatePaymentAmount(1200, 'annual')).toBe(1200);
    });

    it('should return 0 for zero or negative annual premiums', () => {
      expect(calculatePaymentAmount(0, 'monthly')).toBe(0);
      expect(calculatePaymentAmount(-1200, 'monthly')).toBe(0);
    });

    it('should handle decimal amounts correctly', () => {
      expect(calculatePaymentAmount(1199.88, 'monthly')).toBeCloseTo(99.99, 2);
    });
  });

  describe('calculateExpectedCommission', () => {
    it('should calculate commission correctly', () => {
      expect(calculateExpectedCommission(1000, 50)).toBe(500);
      expect(calculateExpectedCommission(1200, 75)).toBe(900);
      expect(calculateExpectedCommission(5000, 100)).toBe(5000);
    });

    it('should handle decimal percentages', () => {
      expect(calculateExpectedCommission(1000, 12.5)).toBe(125);
      expect(calculateExpectedCommission(1000, 0.5)).toBe(5);
    });

    it('should return 0 for zero or negative values', () => {
      expect(calculateExpectedCommission(0, 50)).toBe(0);
      expect(calculateExpectedCommission(1000, 0)).toBe(0);
      expect(calculateExpectedCommission(-1000, 50)).toBe(0);
      expect(calculateExpectedCommission(1000, -50)).toBe(0);
    });

    it('should handle high commission percentages (first-year bonuses)', () => {
      expect(calculateExpectedCommission(1000, 150)).toBe(1500);
      expect(calculateExpectedCommission(1000, 200)).toBe(2000);
    });
  });

  describe('validateCommissionPercentage', () => {
    it('should accept valid percentages', () => {
      expect(validateCommissionPercentage(50)).toBe(true);
      expect(validateCommissionPercentage(100)).toBe(true);
      expect(validateCommissionPercentage(0.1)).toBe(true);
      expect(validateCommissionPercentage(200)).toBe(true);
    });

    it('should reject invalid percentages', () => {
      expect(validateCommissionPercentage(0)).toBe(false);
      expect(validateCommissionPercentage(-10)).toBe(false);
      expect(validateCommissionPercentage(201)).toBe(false);
      expect(validateCommissionPercentage(1000)).toBe(false);
    });
  });

  describe('validatePremium', () => {
    it('should accept valid premiums', () => {
      expect(validatePremium(100)).toBe(true);
      expect(validatePremium(0.01)).toBe(true);
      expect(validatePremium(999999)).toBe(true);
    });

    it('should reject invalid premiums', () => {
      expect(validatePremium(0)).toBe(false);
      expect(validatePremium(-100)).toBe(false);
      expect(validatePremium(1000000)).toBe(false);
      expect(validatePremium(10000000)).toBe(false);
    });
  });
});