// /home/nneessen/projects/commissionTracker/src/__tests__/policies.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';
import { usePolicy } from '../hooks/usePolicy';
import { PolicyForm } from '../features/policies/PolicyForm';
import { NewPolicyForm } from '../types/policy.types';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-123',
}));

// Mock useCarriers hook
jest.mock('../hooks/useCarriers', () => ({
  useCarriers: () => ({
    carriers: [
      { id: 'carrier-1', name: 'Test Carrier 1' },
      { id: 'carrier-2', name: 'Test Carrier 2' },
    ],
  }),
}));

describe('Policy Management', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  describe('usePolicy Hook', () => {
    it('should initialize with empty policies', () => {
      const { result } = renderHook(() => usePolicy());

      expect(result.current.policies).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should add a new policy with correct annual premium', () => {
      const { result } = renderHook(() => usePolicy());

      const newPolicy: NewPolicyForm = {
        policyNumber: 'POL-001',
        status: 'active',
        clientName: 'John Doe',
        clientState: 'CA',
        clientAge: 35,
        carrierId: 'carrier-1',
        product: 'term_life',
        effectiveDate: '2024-01-01',
        premium: 100,
        annualPremium: 1200, // Monthly $100 = $1200 annual
        paymentFrequency: 'monthly',
        commissionPercentage: 50,
      };

      act(() => {
        result.current.addPolicy(newPolicy);
      });

      expect(result.current.policies).toHaveLength(1);
      expect(result.current.policies[0].annualPremium).toBe(1200);
      expect(result.current.policies[0].client.name).toBe('John Doe');
    });

    it('should handle different payment frequencies correctly', () => {
      const { result } = renderHook(() => usePolicy());

      const testCases = [
        { frequency: 'monthly' as const, premium: 100, expectedAnnual: 1200 },
        { frequency: 'quarterly' as const, premium: 300, expectedAnnual: 1200 },
        { frequency: 'semi-annual' as const, premium: 600, expectedAnnual: 1200 },
        { frequency: 'annual' as const, premium: 1200, expectedAnnual: 1200 },
      ];

      testCases.forEach(({ frequency, premium, expectedAnnual }, index) => {
        const policy: NewPolicyForm = {
          policyNumber: `POL-00${index + 1}`,
          status: 'active',
          clientName: `Client ${index + 1}`,
          clientState: 'CA',
          clientAge: 30 + index,
          carrierId: 'carrier-1',
          product: 'term_life',
          effectiveDate: '2024-01-01',
          premium,
          annualPremium: expectedAnnual,
          paymentFrequency: frequency,
          commissionPercentage: 50,
        };

        act(() => {
          result.current.addPolicy(policy);
        });
      });

      expect(result.current.policies).toHaveLength(4);
      result.current.policies.forEach((policy, index) => {
        expect(policy.annualPremium).toBe(1200);
      });
    });

    it('should prevent duplicate policy numbers', () => {
      const { result } = renderHook(() => usePolicy());

      const policy1: NewPolicyForm = {
        policyNumber: 'POL-001',
        status: 'active',
        clientName: 'John Doe',
        clientState: 'CA',
        clientAge: 35,
        carrierId: 'carrier-1',
        product: 'term_life',
        effectiveDate: '2024-01-01',
        premium: 100,
        annualPremium: 1200,
        paymentFrequency: 'monthly',
        commissionPercentage: 50,
      };

      act(() => {
        result.current.addPolicy(policy1);
      });

      const policy2 = { ...policy1, clientName: 'Jane Doe' };

      expect(() => {
        act(() => {
          result.current.addPolicy(policy2);
        });
      }).toThrow('Policy number POL-001 already exists');
    });

    it('should update policy with new annual premium when frequency changes', () => {
      const { result } = renderHook(() => usePolicy());

      const policy: NewPolicyForm = {
        policyNumber: 'POL-001',
        status: 'active',
        clientName: 'John Doe',
        clientState: 'CA',
        clientAge: 35,
        carrierId: 'carrier-1',
        product: 'term_life',
        effectiveDate: '2024-01-01',
        premium: 100,
        annualPremium: 1200,
        paymentFrequency: 'monthly',
        commissionPercentage: 50,
      };

      act(() => {
        result.current.addPolicy(policy);
      });

      const updatedPolicy = {
        ...policy,
        premium: 300,
        annualPremium: 1200,
        paymentFrequency: 'quarterly' as const,
      };

      act(() => {
        result.current.updatePolicy('test-uuid-123', updatedPolicy);
      });

      expect(result.current.policies[0].annualPremium).toBe(1200);
      expect(result.current.policies[0].paymentFrequency).toBe('quarterly');
    });

    it('should calculate policy summary correctly', () => {
      const { result } = renderHook(() => usePolicy());

      const policies: NewPolicyForm[] = [
        {
          policyNumber: 'POL-001',
          status: 'active',
          clientName: 'John Doe',
          clientState: 'CA',
          clientAge: 35,
          carrierId: 'carrier-1',
          product: 'term_life',
          effectiveDate: '2024-01-01',
          premium: 100,
          annualPremium: 1200,
          paymentFrequency: 'monthly',
          commissionPercentage: 50,
        },
        {
          policyNumber: 'POL-002',
          status: 'pending',
          clientName: 'Jane Doe',
          clientState: 'NY',
          clientAge: 40,
          carrierId: 'carrier-2',
          product: 'whole_life',
          effectiveDate: '2024-02-01',
          premium: 500,
          annualPremium: 2000,
          paymentFrequency: 'quarterly',
          commissionPercentage: 75,
        },
      ];

      policies.forEach(policy => {
        act(() => {
          result.current.addPolicy(policy);
        });
      });

      const summary = result.current.getPolicySummary();

      expect(summary.totalPolicies).toBe(2);
      expect(summary.activePolicies).toBe(1);
      expect(summary.pendingPolicies).toBe(1);
      expect(summary.totalAnnualPremium).toBe(3200);
      expect(summary.totalExpectedCommission).toBe(2100); // (1200 * 0.5) + (2000 * 0.75)
      expect(summary.averagePolicyValue).toBe(1600);
    });

    it('should persist policies to localStorage', () => {
      const { result } = renderHook(() => usePolicy());

      const policy: NewPolicyForm = {
        policyNumber: 'POL-001',
        status: 'active',
        clientName: 'John Doe',
        clientState: 'CA',
        clientAge: 35,
        carrierId: 'carrier-1',
        product: 'term_life',
        effectiveDate: '2024-01-01',
        premium: 100,
        annualPremium: 1200,
        paymentFrequency: 'monthly',
        commissionPercentage: 50,
      };

      act(() => {
        result.current.addPolicy(policy);
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'commission_tracker_policies',
        expect.stringContaining('POL-001')
      );
    });

    it('should load policies from localStorage on mount', () => {
      const storedPolicies = [
        {
          id: 'stored-uuid-1',
          policyNumber: 'POL-STORED',
          status: 'active',
          client: {
            name: 'Stored Client',
            state: 'TX',
            age: 45,
          },
          carrierId: 'carrier-1',
          product: 'universal_life',
          effectiveDate: '2023-12-01',
          annualPremium: 3600,
          paymentFrequency: 'monthly',
          commissionPercentage: 60,
          createdAt: '2023-12-01T00:00:00.000Z',
        },
      ];

      mockLocalStorage.setItem(
        'commission_tracker_policies',
        JSON.stringify(storedPolicies)
      );

      const { result } = renderHook(() => usePolicy());

      waitFor(() => {
        expect(result.current.policies).toHaveLength(1);
        expect(result.current.policies[0].policyNumber).toBe('POL-STORED');
        expect(result.current.policies[0].annualPremium).toBe(3600);
      });
    });

    it('should check for duplicate policy numbers correctly', () => {
      const { result } = renderHook(() => usePolicy());

      const policy: NewPolicyForm = {
        policyNumber: 'POL-001',
        status: 'active',
        clientName: 'John Doe',
        clientState: 'CA',
        clientAge: 35,
        carrierId: 'carrier-1',
        product: 'term_life',
        effectiveDate: '2024-01-01',
        premium: 100,
        annualPremium: 1200,
        paymentFrequency: 'monthly',
        commissionPercentage: 50,
      };

      act(() => {
        result.current.addPolicy(policy);
      });

      expect(result.current.isDuplicatePolicyNumber('POL-001')).toBe(true);
      expect(result.current.isDuplicatePolicyNumber('POL-002')).toBe(false);
      expect(result.current.isDuplicatePolicyNumber('POL-001', 'test-uuid-123')).toBe(false);
    });
  });
});