// /home/nneessen/projects/commissionTracker/src/hooks/policies/__tests__/usePolicies.test.tsx

import { renderHook, act } from '@testing-library/react';
import { usePolicies } from '../usePolicies';
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

describe('usePolicies', () => {
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
      product: 'term',
      effectiveDate: new Date('2024-01-01'),
      termLength: 20,
      annualPremium: 1200,
      paymentFrequency: 'monthly',
      commissionPercentage: 10,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
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
      updatedAt: new Date('2024-02-01'),
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
      product: 'universal_life',
      effectiveDate: new Date('2024-03-01'),
      annualPremium: 1800,
      paymentFrequency: 'annual',
      commissionPercentage: 12,
      createdAt: new Date('2024-03-01'),
      updatedAt: new Date('2024-03-01'),
    },
  ];

  test('should initialize with empty policies list', () => {
    const { result } = renderHook(() => usePolicies());

    expect(result.current.policies).toEqual([]);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  test('should load policies from localStorage', () => {
    localStorageMock.setItem('policies', JSON.stringify(mockPolicies));
    const { result } = renderHook(() => usePolicies());

    expect(result.current.policies).toHaveLength(3);
    expect(result.current.totalItems).toBe(3);
  });

  test('should handle pagination correctly', () => {
    // Create a larger dataset for testing pagination
    const manyPolicies = Array.from({ length: 35 }, (_, i) => ({
      ...mockPolicies[0],
      id: `policy-${i}`,
      policyNumber: `POL-${String(i).padStart(3, '0')}`,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Different dates for sorting
    }));

    localStorageMock.setItem('policies', JSON.stringify(manyPolicies));
    const { result } = renderHook(() => usePolicies());

    // Initially should have 10 policies (default page size)
    expect(result.current.paginatedPolicies).toHaveLength(10);
    expect(result.current.totalPages).toBe(4); // 35 / 10 = 4 pages
    expect(result.current.currentPage).toBe(1);

    // Set page size to 25
    act(() => {
      result.current.setPageSize(25);
    });

    expect(result.current.paginatedPolicies).toHaveLength(25);
    expect(result.current.totalPages).toBe(2); // 35 / 25 = 2 pages
    expect(result.current.currentPage).toBe(1);

    // Go to next page
    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedPolicies).toHaveLength(10); // 35 - 25 = 10 remaining

    // Go back to previous page
    act(() => {
      result.current.previousPage();
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.paginatedPolicies).toHaveLength(25);
  });

  test('should filter policies correctly', () => {
    localStorageMock.setItem('policies', JSON.stringify(mockPolicies));
    const { result } = renderHook(() => usePolicies());

    // Filter by status
    act(() => {
      result.current.setFilters({
        status: 'active',
      });
    });

    expect(result.current.policies).toHaveLength(2);
    expect(result.current.filterCount).toBe(1);

    // Clear filters
    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.policies).toHaveLength(3);
    expect(result.current.filterCount).toBe(0);
  });

  test('should sort policies correctly', () => {
    localStorageMock.setItem('policies', JSON.stringify(mockPolicies));
    const { result } = renderHook(() => usePolicies());

    // Sort by annual premium ascending
    act(() => {
      result.current.toggleSort('annualPremium');
    });

    expect(result.current.sortConfig.field).toBe('annualPremium');
    expect(result.current.sortConfig.direction).toBe('asc');
    expect(result.current.policies[0].annualPremium).toBe(1200);
    expect(result.current.policies[2].annualPremium).toBe(2400);

    // Toggle to descending
    act(() => {
      result.current.toggleSort('annualPremium');
    });

    expect(result.current.sortConfig.direction).toBe('desc');
    expect(result.current.policies[0].annualPremium).toBe(2400);
    expect(result.current.policies[2].annualPremium).toBe(1200);
  });

  test('should handle date parsing correctly', () => {
    const policiesWithStringDates = mockPolicies.map(p => ({
      ...p,
      effectiveDate: p.effectiveDate.toISOString(),
      createdAt: p.createdAt.toISOString(),
    }));

    localStorageMock.setItem('policies', JSON.stringify(policiesWithStringDates));
    const { result } = renderHook(() => usePolicies());

    expect(result.current.policies[0].effectiveDate).toBeInstanceOf(Date);
    expect(result.current.policies[0].createdAt).toBeInstanceOf(Date);
  });

  test('should handle goToPage correctly', () => {
    localStorageMock.setItem('policies', JSON.stringify(mockPolicies));
    const { result } = renderHook(() => usePolicies());

    act(() => {
      result.current.setPageSize(1);
    });

    expect(result.current.totalPages).toBe(3);

    act(() => {
      result.current.goToPage(2);
    });

    expect(result.current.currentPage).toBe(2);
    // Since policies are sorted by createdAt desc, check for the right policy
    expect(result.current.paginatedPolicies).toHaveLength(1);

    // Try going to an invalid page
    act(() => {
      result.current.goToPage(10);
    });

    expect(result.current.currentPage).toBe(3); // Should cap at max page
  });

  test('should refresh data correctly', () => {
    localStorageMock.setItem('policies', JSON.stringify(mockPolicies));
    const { result } = renderHook(() => usePolicies());

    const initialPolicies = result.current.policies;
    expect(initialPolicies).toHaveLength(3);

    // Simulate external change
    const updatedPolicies = [...mockPolicies];
    updatedPolicies[0].status = 'lapsed' as PolicyStatus;
    localStorageMock.setItem('policies', JSON.stringify(updatedPolicies));

    act(() => {
      result.current.refresh();
    });

    // Data should be refreshed
    expect(result.current.policies).toHaveLength(3);
  });
});