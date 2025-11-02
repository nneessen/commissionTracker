// src/hooks/targets/__tests__/useHistoricalAverages.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHistoricalAverages } from '../useHistoricalAverages';
import { useUserCommissionProfile } from '../../commissions/useUserCommissionProfile';
import type { UserCommissionProfile } from '../../../types/product.types';
import type { ReactNode } from 'react';

// Mock the useUserCommissionProfile hook
vi.mock('../../commissions/useUserCommissionProfile');

const mockCommissionProfile: UserCommissionProfile = {
  userId: 'test-user-id',
  contractLevel: 120,
  simpleAverageRate: 0.98,
  weightedAverageRate: 0.985,
  recommendedRate: 0.985,
  productBreakdown: [
    {
      productId: 'product-1',
      productName: 'Term Life',
      carrierName: 'Carrier A',
      commissionRate: 1.0,
      premiumWeight: 0.6,
      totalPremium: 60000,
      policyCount: 10,
      effectiveDate: new Date('2025-01-01'),
    },
  ],
  dataQuality: 'HIGH',
  calculatedAt: new Date('2025-11-02'),
  lookbackMonths: 12,
};

describe('useHistoricalAverages', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should return historical averages when commission profile is available', () => {
    vi.mocked(useUserCommissionProfile).mockReturnValue({
      data: mockCommissionProfile,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false,
      isPending: false,
      fetchStatus: 'idle',
    } as any);

    const { result } = renderHook(() => useHistoricalAverages(), { wrapper });

    expect(result.current.avgCommissionRate).toBe(0.985);
    expect(result.current.hasData).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('should return zero values when commission profile is null', () => {
    vi.mocked(useUserCommissionProfile).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false,
      isPending: false,
      fetchStatus: 'idle',
    } as any);

    const { result } = renderHook(() => useHistoricalAverages(), { wrapper });

    expect(result.current.avgCommissionRate).toBe(0);
    expect(result.current.avgPolicyPremium).toBe(0);
    expect(result.current.avgPoliciesPerMonth).toBe(0);
    expect(result.current.avgExpensesPerMonth).toBe(0);
    expect(result.current.persistency13Month).toBe(0);
    expect(result.current.persistency25Month).toBe(0);
    expect(result.current.hasData).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should show loading state when commission profile is loading', () => {
    vi.mocked(useUserCommissionProfile).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isSuccess: false,
      isError: false,
      isPending: true,
      fetchStatus: 'fetching',
    } as any);

    const { result } = renderHook(() => useHistoricalAverages(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasData).toBe(false);
  });

  it('should handle error state from commission profile', () => {
    const error = new Error('Failed to load commission profile');

    vi.mocked(useUserCommissionProfile).mockReturnValue({
      data: undefined,
      isLoading: false,
      error,
      isSuccess: false,
      isError: true,
      isPending: false,
      fetchStatus: 'idle',
    } as any);

    const { result } = renderHook(() => useHistoricalAverages(), { wrapper });

    expect(result.current.hasData).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.avgCommissionRate).toBe(0);
  });

  it('should use recommended rate over weighted average', () => {
    const profileWithDifferentRates: UserCommissionProfile = {
      ...mockCommissionProfile,
      simpleAverageRate: 0.95,
      weightedAverageRate: 0.97,
      recommendedRate: 0.985,
    };

    vi.mocked(useUserCommissionProfile).mockReturnValue({
      data: profileWithDifferentRates,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false,
      isPending: false,
      fetchStatus: 'idle',
    } as any);

    const { result } = renderHook(() => useHistoricalAverages(), { wrapper });

    // Should use recommendedRate
    expect(result.current.avgCommissionRate).toBe(0.985);
  });

  it('should handle insufficient data quality', () => {
    const insufficientDataProfile: UserCommissionProfile = {
      ...mockCommissionProfile,
      dataQuality: 'INSUFFICIENT',
      recommendedRate: 0.98,
    };

    vi.mocked(useUserCommissionProfile).mockReturnValue({
      data: insufficientDataProfile,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false,
      isPending: false,
      fetchStatus: 'idle',
    } as any);

    const { result } = renderHook(() => useHistoricalAverages(), { wrapper });

    // Should still return the commission rate
    expect(result.current.avgCommissionRate).toBe(0.98);
    expect(result.current.hasData).toBe(true);
  });

  it('should handle empty product breakdown', () => {
    const emptyBreakdownProfile: UserCommissionProfile = {
      ...mockCommissionProfile,
      productBreakdown: [],
      dataQuality: 'LOW',
    };

    vi.mocked(useUserCommissionProfile).mockReturnValue({
      data: emptyBreakdownProfile,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false,
      isPending: false,
      fetchStatus: 'idle',
    } as any);

    const { result } = renderHook(() => useHistoricalAverages(), { wrapper });

    expect(result.current.avgCommissionRate).toBe(0.985);
    expect(result.current.hasData).toBe(true);
  });

  it('should handle commission rate of 0', () => {
    const zeroRateProfile: UserCommissionProfile = {
      ...mockCommissionProfile,
      recommendedRate: 0,
    };

    vi.mocked(useUserCommissionProfile).mockReturnValue({
      data: zeroRateProfile,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false,
      isPending: false,
      fetchStatus: 'idle',
    } as any);

    const { result } = renderHook(() => useHistoricalAverages(), { wrapper });

    expect(result.current.avgCommissionRate).toBe(0);
    expect(result.current.hasData).toBe(true);
  });

  it('should handle very high commission rates', () => {
    const highRateProfile: UserCommissionProfile = {
      ...mockCommissionProfile,
      recommendedRate: 1.5,
    };

    vi.mocked(useUserCommissionProfile).mockReturnValue({
      data: highRateProfile,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false,
      isPending: false,
      fetchStatus: 'idle',
    } as any);

    const { result } = renderHook(() => useHistoricalAverages(), { wrapper });

    expect(result.current.avgCommissionRate).toBe(1.5);
    expect(result.current.hasData).toBe(true);
  });

  it('should handle profile with multiple products', () => {
    const multiProductProfile: UserCommissionProfile = {
      ...mockCommissionProfile,
      productBreakdown: [
        {
          productId: 'product-1',
          productName: 'Term Life',
          carrierName: 'Carrier A',
          commissionRate: 1.0,
          premiumWeight: 0.4,
          totalPremium: 40000,
          policyCount: 10,
          effectiveDate: new Date('2025-01-01'),
        },
        {
          productId: 'product-2',
          productName: 'Whole Life',
          carrierName: 'Carrier B',
          commissionRate: 0.95,
          premiumWeight: 0.3,
          totalPremium: 30000,
          policyCount: 5,
          effectiveDate: new Date('2025-01-01'),
        },
        {
          productId: 'product-3',
          productName: 'Universal Life',
          carrierName: 'Carrier C',
          commissionRate: 1.1,
          premiumWeight: 0.3,
          totalPremium: 30000,
          policyCount: 8,
          effectiveDate: new Date('2025-01-01'),
        },
      ],
    };

    vi.mocked(useUserCommissionProfile).mockReturnValue({
      data: multiProductProfile,
      isLoading: false,
      error: null,
      isSuccess: true,
      isError: false,
      isPending: false,
      fetchStatus: 'idle',
    } as any);

    const { result } = renderHook(() => useHistoricalAverages(), { wrapper });

    expect(result.current.avgCommissionRate).toBe(0.985);
    expect(result.current.hasData).toBe(true);
  });
});
