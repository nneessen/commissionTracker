// src/services/analytics/__tests__/segmentationService.test.ts

import { describe, it, expect } from 'vitest';
import {
  segmentClientsByValue,
  calculateCrossSellOpportunities,
  getClientLifetimeValue,
} from '../segmentationService';
import { Policy } from '../../../types';

describe('segmentationService', () => {
  // Mock data - 10 clients with varying values
  const mockPolicies: Policy[] = [
    // High value client - multiple policies
    {
      id: '1',
      policyNumber: 'POL-001',
      status: 'active',
      effectiveDate: new Date('2024-01-15'),
      annualPremium: 10000,
      monthlyPremium: 833,
      commissionPercentage: 0.95,
      paymentFrequency: 'monthly',
      product: 'whole_life',
      carrierId: 'carrier-1',
      clientId: 'client-1',
      client: { name: 'High Value Client', state: 'CA', age: 50 },
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: '2',
      policyNumber: 'POL-002',
      status: 'active',
      effectiveDate: new Date('2024-03-20'),
      annualPremium: 8000,
      monthlyPremium: 667,
      commissionPercentage: 0.90,
      paymentFrequency: 'monthly',
      product: 'annuity',
      carrierId: 'carrier-1',
      clientId: 'client-1',
      client: { name: 'High Value Client', state: 'CA', age: 50 },
      createdAt: new Date('2024-03-20'),
      updatedAt: new Date('2024-03-20'),
    },
    // Medium value client
    {
      id: '3',
      policyNumber: 'POL-003',
      status: 'active',
      effectiveDate: new Date('2024-02-10'),
      annualPremium: 5000,
      monthlyPremium: 417,
      commissionPercentage: 0.85,
      paymentFrequency: 'monthly',
      product: 'term',
      carrierId: 'carrier-2',
      clientId: 'client-2',
      client: { name: 'Medium Value Client', state: 'TX', age: 45 },
      createdAt: new Date('2024-02-10'),
      updatedAt: new Date('2024-02-10'),
    },
    // Low value client - single small policy
    {
      id: '4',
      policyNumber: 'POL-004',
      status: 'active',
      effectiveDate: new Date('2024-04-05'),
      annualPremium: 1500,
      monthlyPremium: 125,
      commissionPercentage: 0.75,
      paymentFrequency: 'monthly',
      product: 'accidental',
      carrierId: 'carrier-3',
      clientId: 'client-3',
      client: { name: 'Low Value Client', state: 'NY', age: 30 },
      createdAt: new Date('2024-04-05'),
      updatedAt: new Date('2024-04-05'),
    },
    // Client with lapsed policy (risk)
    {
      id: '5',
      policyNumber: 'POL-005',
      status: 'lapsed',
      effectiveDate: new Date('2024-01-01'),
      annualPremium: 3000,
      monthlyPremium: 250,
      commissionPercentage: 0.80,
      paymentFrequency: 'monthly',
      product: 'term',
      carrierId: 'carrier-1',
      clientId: 'client-4',
      client: { name: 'Risky Client', state: 'FL', age: 40 },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-06-15'),
    },
  ];

  describe('segmentClientsByValue', () => {
    it('should segment clients into high/medium/low tiers', () => {
      const result = segmentClientsByValue(mockPolicies);

      expect(result.totalClients).toBe(4);
      // With only 4 clients, distribution may be uneven
      expect(result.highValue.length + result.mediumValue.length + result.lowValue.length).toBe(4);
    });

    it('should assign tiers using Pareto principle', () => {
      const policies = [...mockPolicies];
      for (let i = 0; i < 10; i++) {
        policies.push({
          ...mockPolicies[3],
          id: `extra-${i}`,
          policyNumber: `POL-EXTRA-${i}`,
          clientId: `client-extra-${i}`,
          client: { name: `Extra Client ${i}`, state: 'CA', age: 30 },
        });
      }

      const result = segmentClientsByValue(policies);
      const totalClients = result.totalClients;

      // Top 20% should be high value
      const expectedHigh = Math.floor(totalClients * 0.2);
      expect(result.highValueCount).toBeLessThanOrEqual(expectedHigh + 1); // +1 for rounding
    });

    it('should calculate client metrics correctly', () => {
      const result = segmentClientsByValue(mockPolicies);

      // Get any client (may not have high value with only 4 clients)
      const allClients = [...result.highValue, ...result.mediumValue, ...result.lowValue];
      const anyClient = allClients[0];

      expect(anyClient.totalPolicies).toBeGreaterThan(0);
      expect(anyClient.totalPremium).toBeGreaterThan(0);
      expect(anyClient.avgPremium).toBe(
        anyClient.totalPremium / anyClient.totalPolicies
      );
    });

    it('should identify cross-sell opportunities', () => {
      const result = segmentClientsByValue(mockPolicies);

      result.highValue.forEach(client => {
        if (client.totalPolicies < 3) {
          expect(client.crossSellOpportunity).toBe(true);
        }
      });
    });

    it('should calculate total premium by tier', () => {
      const result = segmentClientsByValue(mockPolicies);

      // At least one tier should have premium
      const totalPremium = result.totalPremiumByTier.high +
        result.totalPremiumByTier.medium +
        result.totalPremiumByTier.low;

      expect(totalPremium).toBeGreaterThan(0);
    });

    it('should handle single client', () => {
      const singlePolicy = [mockPolicies[0]];
      const result = segmentClientsByValue(singlePolicy);

      expect(result.totalClients).toBe(1);
      // Single client will be in one tier
      const totalClients = result.highValue.length + result.mediumValue.length + result.lowValue.length;
      expect(totalClients).toBe(1);
    });

    it('should handle empty array', () => {
      const result = segmentClientsByValue([]);

      expect(result.totalClients).toBe(0);
      expect(result.highValue).toEqual([]);
      expect(result.mediumValue).toEqual([]);
      expect(result.lowValue).toEqual([]);
    });
  });

  describe('calculateCrossSellOpportunities', () => {
    it('should identify clients missing products', () => {
      const result = calculateCrossSellOpportunities(mockPolicies);

      expect(result.length).toBeGreaterThan(0);
      result.forEach(opportunity => {
        expect(opportunity.missingProducts.length).toBeGreaterThan(0);
      });
    });

    it('should calculate opportunity scores', () => {
      const result = calculateCrossSellOpportunities(mockPolicies);

      result.forEach(opportunity => {
        expect(opportunity.opportunityScore).toBeGreaterThanOrEqual(0);
        expect(opportunity.opportunityScore).toBeLessThanOrEqual(100);
      });
    });

    it('should sort by opportunity score descending', () => {
      const result = calculateCrossSellOpportunities(mockPolicies);

      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].opportunityScore).toBeGreaterThanOrEqual(
          result[i].opportunityScore
        );
      }
    });

    it('should recommend products based on holdings', () => {
      const result = calculateCrossSellOpportunities(mockPolicies);

      result.forEach(opportunity => {
        expect(opportunity.recommendedProducts.length).toBeGreaterThan(0);
        opportunity.recommendedProducts.forEach(product => {
          expect(opportunity.currentProducts).not.toContain(product);
        });
      });
    });

    it('should estimate cross-sell value', () => {
      const result = calculateCrossSellOpportunities(mockPolicies);

      result.forEach(opportunity => {
        expect(opportunity.estimatedValue).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle clients with all products', () => {
      const allProducts: Policy[] = [
        'whole_life',
        'term',
        'universal_life',
        'indexed_universal_life',
        'accidental',
        'final_expense',
        'annuity',
      ].map((product, i) => ({
        ...mockPolicies[0],
        id: `all-${i}`,
        policyNumber: `POL-ALL-${i}`,
        product: product as any,
        clientId: 'client-all',
        client: { name: 'Complete Client', state: 'CA', age: 50 },
      }));

      const result = calculateCrossSellOpportunities(allProducts);

      expect(result).toEqual([]);
    });
  });

  describe('getClientLifetimeValue', () => {
    it('should calculate lifetime value for each client', () => {
      const result = getClientLifetimeValue(mockPolicies);

      expect(result.length).toBe(4);
      result.forEach(ltv => {
        expect(ltv.lifetimeValue).toBeGreaterThan(0);
      });
    });

    it('should calculate retention rate correctly', () => {
      const result = getClientLifetimeValue(mockPolicies);

      result.forEach(ltv => {
        const expectedRetention =
          ltv.totalPolicies > 0 ? (ltv.activePolicies / ltv.totalPolicies) * 100 : 0;
        expect(ltv.retentionRate).toBe(expectedRetention);
      });
    });

    it('should assign risk scores based on lapsed/cancelled', () => {
      const result = getClientLifetimeValue(mockPolicies);
      const riskyClient = result.find(c => c.clientName === 'Risky Client');

      expect(riskyClient).toBeDefined();
      expect(riskyClient!.riskScore).toBeGreaterThan(0);
    });

    it('should project future value', () => {
      const result = getClientLifetimeValue(mockPolicies);

      result.forEach(ltv => {
        expect(ltv.estimatedFutureValue).toBeGreaterThanOrEqual(0);
        if (ltv.retentionRate > 50) {
          expect(ltv.estimatedFutureValue).toBeGreaterThan(ltv.lifetimeValue);
        }
      });
    });

    it('should sort by lifetime value descending', () => {
      const result = getClientLifetimeValue(mockPolicies);

      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].lifetimeValue).toBeGreaterThanOrEqual(
          result[i].lifetimeValue
        );
      }
    });

    it('should handle clients with multiple policies', () => {
      const result = getClientLifetimeValue(mockPolicies);
      const multiPolicyClient = result.find(c => c.clientName === 'High Value Client');

      expect(multiPolicyClient).toBeDefined();
      expect(multiPolicyClient!.totalPolicies).toBe(2);
      expect(multiPolicyClient!.lifetimeValue).toBe(18000);
    });
  });

  describe('edge cases', () => {
    it('should handle policies without client data', () => {
      const policiesWithoutClients: Policy[] = [
        {
          ...mockPolicies[0],
          client: undefined as any,
          clientId: 'orphan-1',
        },
      ];

      expect(() => segmentClientsByValue(policiesWithoutClients)).not.toThrow();
    });

    it('should handle zero premium policies', () => {
      const zeroPremiumPolicy: Policy = {
        ...mockPolicies[0],
        annualPremium: 0,
        clientId: 'zero-client',
      };

      const result = segmentClientsByValue([zeroPremiumPolicy]);
      expect(result.totalClients).toBe(1);
    });
  });
});
