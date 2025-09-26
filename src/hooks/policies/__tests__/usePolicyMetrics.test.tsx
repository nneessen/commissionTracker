// /home/nneessen/projects/commissionTracker/src/hooks/policies/__tests__/usePolicyMetrics.test.tsx

import { renderHook } from '@testing-library/react';
import { usePolicyMetrics } from '../usePolicyMetrics';
import { Policy, PolicyStatus } from '../../../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('usePolicyMetrics', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  const mockPolicies: Policy[] = [
    {
      id: '1',
      policyNumber: 'POL-001',
      status: 'active' as PolicyStatus,
      client: {
        name: 'John Doe',
        state: 'NY',
        age: 35,
        email: 'john@example.com',
        phone: '555-0001',
      },
      carrierId: 'carrier-1',
      product: 'term_life',
      effectiveDate: new Date('2024-01-01'),
      expirationDate: new Date('2044-01-01'),
      termLength: 20,
      annualPremium: 1200,
      paymentFrequency: 'monthly',
      commissionPercentage: 10,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: '2',
      policyNumber: 'POL-002',
      status: 'pending' as PolicyStatus,
      client: {
        name: 'Jane Smith',
        state: 'CA',
        age: 40,
        email: 'jane@example.com',
        phone: '555-0002',
      },
      carrierId: 'carrier-2',
      product: 'whole_life',
      effectiveDate: new Date('2024-02-01'),
      annualPremium: 2400,
      paymentFrequency: 'quarterly',
      commissionPercentage: 15,
      createdAt: new Date('2024-02-01'),
    },
    {
      id: '3',
      policyNumber: 'POL-003',
      status: 'active' as PolicyStatus,
      client: {
        name: 'Bob Johnson',
        state: 'TX',
        age: 45,
        email: 'bob@example.com',
        phone: '555-0003',
      },
      carrierId: 'carrier-1',
      product: 'disability',
      effectiveDate: new Date('2024-03-01'),
      expirationDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      annualPremium: 1800,
      paymentFrequency: 'annual',
      commissionPercentage: 12,
      createdAt: new Date('2024-03-01'),
    },
    {
      id: '4',
      policyNumber: 'POL-004',
      status: 'lapsed' as PolicyStatus,
      client: {
        name: 'Alice Brown',
        state: 'NY',
        age: 50,
        email: 'alice@example.com',
        phone: '555-0004',
      },
      carrierId: 'carrier-1',
      product: 'term_life',
      effectiveDate: new Date('2023-01-01'),
      annualPremium: 1500,
      paymentFrequency: 'monthly',
      commissionPercentage: 10,
      createdAt: new Date('2023-01-01'),
    },
  ];

  test('should calculate basic metrics correctly', () => {
    localStorageMock.setItem('policies', JSON.stringify(mockPolicies));
    const { result } = renderHook(() => usePolicyMetrics());

    const { metrics } = result.current;

    expect(metrics.totalPolicies).toBe(4);
    expect(metrics.activePolicies).toBe(2);
    expect(metrics.pendingPolicies).toBe(1);
    expect(metrics.lapsedPolicies).toBe(1);
  });

  test('should calculate financial metrics correctly', () => {
    localStorageMock.setItem('policies', JSON.stringify(mockPolicies));
    const { result } = renderHook(() => usePolicyMetrics());

    const { metrics } = result.current;

    // Total annual premium: 1200 + 2400 + 1800 + 1500 = 6900
    expect(metrics.totalAnnualPremium).toBe(6900);

    // Total expected commission: (1200*0.1 + 2400*0.15 + 1800*0.12 + 1500*0.1)
    // = 120 + 360 + 216 + 150 = 846
    expect(metrics.totalExpectedCommission).toBe(846);

    // Average policy value: 6900 / 4 = 1725
    expect(metrics.averagePolicyValue).toBe(1725);

    // Average commission rate: (10 + 15 + 12 + 10) / 4 = 11.75
    expect(metrics.averageCommissionRate).toBe(11.75);
  });

  test('should calculate recurring revenue correctly', () => {
    localStorageMock.setItem('policies', JSON.stringify(mockPolicies));
    const { result } = renderHook(() => usePolicyMetrics());

    const { metrics } = result.current;

    // Monthly recurring (active policies only):
    // Policy 1: (1200 * 0.1) / 12 = 10
    // Policy 3: (1800 * 0.12) / 12 = 18
    // Total: 28
    expect(metrics.monthlyRecurringRevenue).toBe(28);

    // Yearly recurring (active policies only):
    // Policy 1: 1200 * 0.1 = 120
    // Policy 3: 1800 * 0.12 = 216
    // Total: 336
    expect(metrics.yearlyRecurringRevenue).toBe(336);
  });

  test('should group policies by status correctly', () => {
    localStorageMock.setItem('policies', JSON.stringify(mockPolicies));
    const { result } = renderHook(() => usePolicyMetrics());

    const { metrics } = result.current;

    expect(metrics.policiesByStatus.active).toBe(2);
    expect(metrics.policiesByStatus.pending).toBe(1);
    expect(metrics.policiesByStatus.lapsed).toBe(1);
    expect(metrics.policiesByStatus.cancelled).toBe(0);
    expect(metrics.policiesByStatus.expired).toBe(0);
  });

  test('should group policies by product correctly', () => {
    localStorageMock.setItem('policies', JSON.stringify(mockPolicies));
    const { result } = renderHook(() => usePolicyMetrics());

    const { metrics } = result.current;

    expect(metrics.policiesByProduct.term_life).toBe(2);
    expect(metrics.policiesByProduct.whole_life).toBe(1);
    expect(metrics.policiesByProduct.disability).toBe(1);
    expect(metrics.policiesByProduct.health).toBe(0);
  });

  test('should group policies by carrier correctly', () => {
    localStorageMock.setItem('policies', JSON.stringify(mockPolicies));
    const { result } = renderHook(() => usePolicyMetrics());

    const { metrics } = result.current;

    expect(metrics.policiesByCarrier['carrier-1']).toBe(3);
    expect(metrics.policiesByCarrier['carrier-2']).toBe(1);
  });

  test('should group policies by state correctly', () => {
    localStorageMock.setItem('policies', JSON.stringify(mockPolicies));
    const { result } = renderHook(() => usePolicyMetrics());

    const { metrics } = result.current;

    expect(metrics.policiesByState['NY']).toBe(2);
    expect(metrics.policiesByState['CA']).toBe(1);
    expect(metrics.policiesByState['TX']).toBe(1);
  });

  test('should identify expiring policies correctly', () => {
    localStorageMock.setItem('policies', JSON.stringify(mockPolicies));
    const { result } = renderHook(() => usePolicyMetrics());

    // Policy 3 expires in 15 days
    expect(result.current.metrics.expiringPolicies).toHaveLength(1);
    expect(result.current.metrics.expiringPolicies[0].id).toBe('3');

    // Test custom expiration window
    const expiringIn60Days = result.current.getExpiringPolicies(60);
    expect(expiringIn60Days).toHaveLength(1);
  });

  test('should identify recent policies correctly', () => {
    const recentPolicy = {
      ...mockPolicies[0],
      createdAt: new Date(), // Created today
    };

    const oldPolicy = {
      ...mockPolicies[1],
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    };

    localStorageMock.setItem('policies', JSON.stringify([recentPolicy, oldPolicy]));
    const { result } = renderHook(() => usePolicyMetrics());

    expect(result.current.metrics.recentPolicies).toHaveLength(1);
    expect(result.current.metrics.recentPolicies[0].id).toBe('1');
  });

  test('should get policies by client name correctly', () => {
    localStorageMock.setItem('policies', JSON.stringify(mockPolicies));
    const { result } = renderHook(() => usePolicyMetrics());

    // Search for "John Doe" should match only John Doe
    const johnDoePolicies = result.current.getPoliciesByClient('John Doe');
    expect(johnDoePolicies).toHaveLength(1);
    expect(johnDoePolicies[0].client.name).toBe('John Doe');

    // Search for "John" should match both "John Doe" and "Bob Johnson" (contains "John")
    const johnPolicies = result.current.getPoliciesByClient('John');
    expect(johnPolicies).toHaveLength(2);

    // Case insensitive search
    const janePolicies = result.current.getPoliciesByClient('jane');
    expect(janePolicies).toHaveLength(1);
    expect(janePolicies[0].client.name).toBe('Jane Smith');
  });

  test('should get policies by carrier correctly', () => {
    localStorageMock.setItem('policies', JSON.stringify(mockPolicies));
    const { result } = renderHook(() => usePolicyMetrics());

    const carrier1Policies = result.current.getPoliciesByCarrier('carrier-1');
    expect(carrier1Policies).toHaveLength(3);

    const carrier2Policies = result.current.getPoliciesByCarrier('carrier-2');
    expect(carrier2Policies).toHaveLength(1);
  });

  test('should check for duplicate policy numbers correctly', () => {
    localStorageMock.setItem('policies', JSON.stringify(mockPolicies));
    const { result } = renderHook(() => usePolicyMetrics());

    // Existing policy number
    expect(result.current.isDuplicatePolicyNumber('POL-001')).toBe(true);

    // Non-existing policy number
    expect(result.current.isDuplicatePolicyNumber('POL-999')).toBe(false);

    // Existing policy number but excluded by ID
    expect(result.current.isDuplicatePolicyNumber('POL-001', '1')).toBe(false);
    expect(result.current.isDuplicatePolicyNumber('POL-001', '2')).toBe(true);
  });

  test('should handle empty policies list correctly', () => {
    const { result } = renderHook(() => usePolicyMetrics());

    const { metrics } = result.current;

    expect(metrics.totalPolicies).toBe(0);
    expect(metrics.totalAnnualPremium).toBe(0);
    expect(metrics.totalExpectedCommission).toBe(0);
    expect(metrics.averagePolicyValue).toBe(0);
    expect(metrics.averageCommissionRate).toBe(0);
    expect(metrics.monthlyRecurringRevenue).toBe(0);
    expect(metrics.yearlyRecurringRevenue).toBe(0);
    expect(metrics.expiringPolicies).toEqual([]);
    expect(metrics.recentPolicies).toEqual([]);
  });
});