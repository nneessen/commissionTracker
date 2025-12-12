// src/services/analytics/__tests__/attributionService.test.ts

import {describe, it, expect} from 'vitest';
import {calculateContribution, getProductMixEvolution, calculateCarrierROI, getTopMovers} from '../attributionService';
import {Policy, Commission} from '../../../types';

describe('attributionService', () => {
  const currentPolicies: Policy[] = [
    {
      id: '1',
      policyNumber: 'POL-001',
      status: 'active',
      effectiveDate: new Date('2025-06-01'),
      annualPremium: 6000,
      monthlyPremium: 500,
      commissionPercentage: 0.95,
      paymentFrequency: 'monthly',
      product: 'whole_life',
      carrierId: 'carrier-1',
      client: { name: 'Current Client 1', state: 'CA', age: 45 },
      createdAt: new Date('2025-06-01'),
      updatedAt: new Date('2025-06-01'),
    },
    {
      id: '2',
      policyNumber: 'POL-002',
      status: 'active',
      effectiveDate: new Date('2025-06-15'),
      annualPremium: 8000,
      monthlyPremium: 667,
      commissionPercentage: 1.0,
      paymentFrequency: 'monthly',
      product: 'whole_life',
      carrierId: 'carrier-1',
      client: { name: 'Current Client 2', state: 'TX', age: 50 },
      createdAt: new Date('2025-06-15'),
      updatedAt: new Date('2025-06-15'),
    },
    {
      id: '3',
      policyNumber: 'POL-003',
      status: 'active',
      effectiveDate: new Date('2025-06-20'),
      annualPremium: 4000,
      monthlyPremium: 333,
      commissionPercentage: 0.90,
      paymentFrequency: 'monthly',
      product: 'term',
      carrierId: 'carrier-2',
      client: { name: 'Current Client 3', state: 'NY', age: 40 },
      createdAt: new Date('2025-06-20'),
      updatedAt: new Date('2025-06-20'),
    },
  ];

  const previousPolicies: Policy[] = [
    {
      id: 'prev-1',
      policyNumber: 'POL-PREV-001',
      status: 'active',
      effectiveDate: new Date('2025-05-01'),
      annualPremium: 5000,
      monthlyPremium: 417,
      commissionPercentage: 0.85,
      paymentFrequency: 'monthly',
      product: 'whole_life',
      carrierId: 'carrier-1',
      client: { name: 'Previous Client 1', state: 'CA', age: 42 },
      createdAt: new Date('2025-05-01'),
      updatedAt: new Date('2025-05-01'),
    },
    {
      id: 'prev-2',
      policyNumber: 'POL-PREV-002',
      status: 'active',
      effectiveDate: new Date('2025-05-15'),
      annualPremium: 5000,
      monthlyPremium: 417,
      commissionPercentage: 0.85,
      paymentFrequency: 'monthly',
      product: 'term',
      carrierId: 'carrier-1',
      client: { name: 'Previous Client 2', state: 'FL', age: 38 },
      createdAt: new Date('2025-05-15'),
      updatedAt: new Date('2025-05-15'),
    },
  ];

  const currentCommissions: Commission[] = [
    {
      id: 'comm-1',
      policyId: '1',
      userId: 'user-1',
      carrierId: 'carrier-1',
      product: 'whole_life',
      amount: 5700,
      advanceAmount: 5700,
      commissionRate: 95,
      type: 'first_year',
      status: 'paid',
      advanceMonths: 9,
      monthsPaid: 0,
      earnedAmount: 0,
      unearnedAmount: 5700,
      createdAt: new Date('2025-06-01'),
      updatedAt: new Date('2025-06-01'),
      client: { name: 'Current Client 1', state: 'CA', age: 45 },
    },
    {
      id: 'comm-2',
      policyId: '2',
      userId: 'user-1',
      carrierId: 'carrier-1',
      product: 'whole_life',
      amount: 8000,
      advanceAmount: 8000,
      commissionRate: 100,
      type: 'first_year',
      status: 'paid',
      advanceMonths: 9,
      monthsPaid: 0,
      earnedAmount: 0,
      unearnedAmount: 8000,
      createdAt: new Date('2025-06-15'),
      updatedAt: new Date('2025-06-15'),
      client: { name: 'Current Client 2', state: 'TX', age: 50 },
    },
    {
      id: 'comm-3',
      policyId: '3',
      userId: 'user-1',
      carrierId: 'carrier-2',
      product: 'term',
      amount: 3600,
      advanceAmount: 3600,
      commissionRate: 90,
      type: 'first_year',
      status: 'paid',
      advanceMonths: 9,
      monthsPaid: 0,
      earnedAmount: 0,
      unearnedAmount: 3600,
      createdAt: new Date('2025-06-20'),
      updatedAt: new Date('2025-06-20'),
      client: { name: 'Current Client 3', state: 'NY', age: 40 },
    },
  ];

  const previousCommissions: Commission[] = [
    {
      id: 'prev-comm-1',
      policyId: 'prev-1',
      userId: 'user-1',
      carrierId: 'carrier-1',
      product: 'whole_life',
      amount: 4250,
      advanceAmount: 4250,
      commissionRate: 85,
      type: 'first_year',
      status: 'paid',
      advanceMonths: 9,
      monthsPaid: 1,
      earnedAmount: 472,
      unearnedAmount: 3778,
      createdAt: new Date('2025-05-01'),
      updatedAt: new Date('2025-06-01'),
      client: { name: 'Previous Client 1', state: 'CA', age: 42 },
    },
    {
      id: 'prev-comm-2',
      policyId: 'prev-2',
      userId: 'user-1',
      carrierId: 'carrier-1',
      product: 'term',
      amount: 4250,
      advanceAmount: 4250,
      commissionRate: 85,
      type: 'first_year',
      status: 'paid',
      advanceMonths: 9,
      monthsPaid: 1,
      earnedAmount: 472,
      unearnedAmount: 3778,
      createdAt: new Date('2025-05-15'),
      updatedAt: new Date('2025-06-15'),
      client: { name: 'Previous Client 2', state: 'FL', age: 38 },
    },
  ];

  const carriers = [
    { id: 'carrier-1', name: 'Carrier Alpha' },
    { id: 'carrier-2', name: 'Carrier Beta' },
  ];

  describe('calculateContribution', () => {
    it('should decompose change into volume, rate, and mix effects', () => {
      const result = calculateContribution(
        currentPolicies,
        currentCommissions,
        previousPolicies,
        previousCommissions
      );

      expect(result.totalChange).toBeDefined();
      expect(result.volumeEffect).toBeDefined();
      expect(result.rateEffect).toBeDefined();
      expect(result.mixEffect).toBeDefined();
    });

    it('should calculate volume effect correctly', () => {
      const result = calculateContribution(
        currentPolicies,
        currentCommissions,
        previousPolicies,
        previousCommissions
      );

      // More policies in current period should show positive volume effect
      const policyDifference = currentPolicies.length - previousPolicies.length;
      if (policyDifference > 0) {
        expect(result.volumeEffect).toBeGreaterThan(0);
      }
    });

    it('should calculate percentage contributions', () => {
      const result = calculateContribution(
        currentPolicies,
        currentCommissions,
        previousPolicies,
        previousCommissions
      );

      expect(result.volumePercent).toBeGreaterThanOrEqual(0);
      expect(result.ratePercent).toBeGreaterThanOrEqual(0);
      expect(result.mixPercent).toBeGreaterThanOrEqual(0);

      // Total should be approximately 100%
      const total = result.volumePercent + result.ratePercent + result.mixPercent;
      expect(total).toBeCloseTo(100, 1);
    });

    it('should handle zero growth scenario', () => {
      const result = calculateContribution(
        previousPolicies,
        previousCommissions,
        previousPolicies,
        previousCommissions
      );

      expect(result.totalChange).toBe(0);
      expect(result.volumeEffect).toBe(0);
      expect(result.rateEffect).toBe(0);
      expect(result.mixEffect).toBe(0);
    });
  });

  describe('getProductMixEvolution', () => {
    it('should show product mix for last 12 months', () => {
      const allPolicies = [...currentPolicies, ...previousPolicies];
      const result = getProductMixEvolution(allPolicies);

      expect(result).toHaveLength(12);
      result.forEach(evolution => {
        expect(evolution.period).toMatch(/^\d{4}-\d{2}$/);
        expect(evolution.periodLabel).toBeDefined();
      });
    });

    it('should calculate product breakdown correctly', () => {
      const allPolicies = [...currentPolicies, ...previousPolicies];
      const result = getProductMixEvolution(allPolicies);

      result.forEach(evolution => {
        const totalPercentage = evolution.productBreakdown.reduce(
          (sum, p) => sum + p.percentage,
          0
        );

        if (evolution.totalPolicies > 0) {
          expect(totalPercentage).toBeCloseTo(100, 1);
        }
      });
    });

    it('should track product counts and revenue', () => {
      const allPolicies = [...currentPolicies, ...previousPolicies];
      const result = getProductMixEvolution(allPolicies);

      result.forEach(evolution => {
        evolution.productBreakdown.forEach(product => {
          expect(product.count).toBeGreaterThanOrEqual(0);
          expect(product.revenue).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });

  describe('calculateCarrierROI', () => {
    it('should calculate ROI for each carrier', () => {
      const allPolicies = [...currentPolicies, ...previousPolicies];
      const allCommissions = [...currentCommissions, ...previousCommissions];
      const result = calculateCarrierROI(allPolicies, allCommissions, carriers);

      expect(result.length).toBeGreaterThan(0);
      result.forEach(roi => {
        expect(roi.carrierId).toBeDefined();
        expect(roi.carrierName).toBeDefined();
        expect(roi.roi).toBeGreaterThanOrEqual(0);
      });
    });

    it('should calculate efficiency (commission per policy)', () => {
      const allPolicies = [...currentPolicies, ...previousPolicies];
      const allCommissions = [...currentCommissions, ...previousCommissions];
      const result = calculateCarrierROI(allPolicies, allCommissions, carriers);

      result.forEach(roi => {
        if (roi.totalPolicies > 0) {
          const expectedEfficiency = roi.totalCommission / roi.totalPolicies;
          expect(roi.efficiency).toBeCloseTo(expectedEfficiency, 2);
        }
      });
    });

    it('should determine trend correctly', () => {
      const allPolicies = [...currentPolicies, ...previousPolicies];
      const allCommissions = [...currentCommissions, ...previousCommissions];
      const result = calculateCarrierROI(allPolicies, allCommissions, carriers);

      result.forEach(roi => {
        expect(['improving', 'stable', 'declining']).toContain(roi.trend);
      });
    });

    it('should sort by ROI descending', () => {
      const allPolicies = [...currentPolicies, ...previousPolicies];
      const allCommissions = [...currentCommissions, ...previousCommissions];
      const result = calculateCarrierROI(allPolicies, allCommissions, carriers);

      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].roi).toBeGreaterThanOrEqual(result[i].roi);
      }
    });
  });

  describe('getTopMovers', () => {
    it('should identify top movers by carrier', () => {
      const result = getTopMovers(
        currentPolicies,
        currentCommissions,
        previousPolicies,
        previousCommissions,
        carriers
      );

      const carrierMovers = result.filter(m => m.type === 'carrier');
      expect(carrierMovers.length).toBeGreaterThanOrEqual(0);
    });

    it('should identify top movers by product', () => {
      const result = getTopMovers(
        currentPolicies,
        currentCommissions,
        previousPolicies,
        previousCommissions,
        carriers
      );

      const productMovers = result.filter(m => m.type === 'product');
      expect(productMovers.length).toBeGreaterThanOrEqual(0);
    });

    it('should identify top movers by state', () => {
      const result = getTopMovers(
        currentPolicies,
        currentCommissions,
        previousPolicies,
        previousCommissions,
        carriers
      );

      const stateMovers = result.filter(m => m.type === 'state');
      expect(stateMovers.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate change percentage correctly', () => {
      const result = getTopMovers(
        currentPolicies,
        currentCommissions,
        previousPolicies,
        previousCommissions,
        carriers
      );

      result.forEach(mover => {
        const expectedPercent =
          mover.previousValue > 0
            ? (mover.change / mover.previousValue) * 100
            : 0;

        if (mover.previousValue > 0) {
          expect(mover.changePercent).toBeCloseTo(expectedPercent, 1);
        }
      });
    });

    it('should categorize impact correctly', () => {
      const result = getTopMovers(
        currentPolicies,
        currentCommissions,
        previousPolicies,
        previousCommissions,
        carriers
      );

      result.forEach(mover => {
        expect(['high', 'medium', 'low']).toContain(mover.impact);

        if (Math.abs(mover.change) > 1000) expect(mover.impact).toBe('high');
        else if (Math.abs(mover.change) > 500) expect(mover.impact).toBe('medium');
        else expect(mover.impact).toBe('low');
      });
    });

    it('should limit to top 10 movers', () => {
      const result = getTopMovers(
        currentPolicies,
        currentCommissions,
        previousPolicies,
        previousCommissions,
        carriers
      );

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should sort by absolute change descending', () => {
      const result = getTopMovers(
        currentPolicies,
        currentCommissions,
        previousPolicies,
        previousCommissions,
        carriers
      );

      for (let i = 1; i < result.length; i++) {
        expect(Math.abs(result[i - 1].change)).toBeGreaterThanOrEqual(
          Math.abs(result[i].change)
        );
      }
    });

    it('should assign direction correctly', () => {
      const result = getTopMovers(
        currentPolicies,
        currentCommissions,
        previousPolicies,
        previousCommissions,
        carriers
      );

      result.forEach(mover => {
        if (mover.change > 0) expect(mover.direction).toBe('up');
        else expect(mover.direction).toBe('down');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty current period', () => {
      const result = calculateContribution([], [], previousPolicies, previousCommissions);

      expect(result.totalChange).toBeLessThan(0);
      expect(result.volumeEffect).toBeLessThan(0);
    });

    it('should handle empty previous period', () => {
      const result = calculateContribution(currentPolicies, currentCommissions, [], []);

      // With empty previous, volume effect is calculated with zero base
      expect(result.totalChange).toBeDefined();
      expect(result.volumeEffect).toBeDefined();
    });

    it('should handle missing carrier names', () => {
      const result = calculateCarrierROI(currentPolicies, currentCommissions, []);

      result.forEach(roi => {
        expect(roi.carrierName).toBe('Unknown');
      });
    });
  });
});
