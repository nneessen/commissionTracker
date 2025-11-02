// src/hooks/commissions/__tests__/useUserCommissionProfile.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserCommissionProfile } from '../useUserCommissionProfile';
import { commissionRateService } from '../../../services/commissions/commissionRateService';
import type { UserCommissionProfile } from '../../../types/product.types';
import type { ReactNode } from 'react';

// Mock the auth context
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    isLoading: false,
  }),
}));

// Mock the commission rate service
vi.mock('../../../services/commissions/commissionRateService', () => ({
  commissionRateService: {
    getUserCommissionProfile: vi.fn(),
  },
}));

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
    {
      productId: 'product-2',
      productName: 'Whole Life',
      carrierName: 'Carrier B',
      commissionRate: 0.95,
      premiumWeight: 0.4,
      totalPremium: 40000,
      policyCount: 5,
      effectiveDate: new Date('2025-01-01'),
    },
  ],
  dataQuality: 'HIGH',
  calculatedAt: new Date('2025-11-02'),
  lookbackMonths: 12,
};

describe('useUserCommissionProfile', () => {
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

  it('should fetch and return commission profile successfully', async () => {
    vi.mocked(commissionRateService.getUserCommissionProfile).mockResolvedValue(
      mockCommissionProfile
    );

    const { result } = renderHook(() => useUserCommissionProfile(12), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockCommissionProfile);
    expect(commissionRateService.getUserCommissionProfile).toHaveBeenCalledWith(
      'test-user-id',
      12
    );
  });

  it('should handle 404 error when function does not exist', async () => {
    const error = new Error(
      'Failed to calculate commission profile: Could not find the function public.get_user_commission_profile'
    );

    vi.mocked(commissionRateService.getUserCommissionProfile).mockRejectedValue(
      error
    );

    const { result } = renderHook(() => useUserCommissionProfile(12), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it('should use custom lookback period', async () => {
    vi.mocked(commissionRateService.getUserCommissionProfile).mockResolvedValue(
      mockCommissionProfile
    );

    const { result } = renderHook(() => useUserCommissionProfile(6), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(commissionRateService.getUserCommissionProfile).toHaveBeenCalledWith(
      'test-user-id',
      6
    );
  });

  it('should handle insufficient data quality', async () => {
    const insufficientDataProfile: UserCommissionProfile = {
      ...mockCommissionProfile,
      dataQuality: 'INSUFFICIENT',
      weightedAverageRate: 0.98,
      recommendedRate: 0.98,
      productBreakdown: [],
    };

    vi.mocked(commissionRateService.getUserCommissionProfile).mockResolvedValue(
      insufficientDataProfile
    );

    const { result } = renderHook(() => useUserCommissionProfile(12), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.dataQuality).toBe('INSUFFICIENT');
    expect(result.current.data?.productBreakdown).toHaveLength(0);
  });

  it('should cache results for 1 hour', async () => {
    vi.mocked(commissionRateService.getUserCommissionProfile).mockResolvedValue(
      mockCommissionProfile
    );

    const { result, rerender } = renderHook(() => useUserCommissionProfile(12), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Rerender should use cached data
    rerender();

    // Should only be called once due to caching
    expect(commissionRateService.getUserCommissionProfile).toHaveBeenCalledTimes(
      1
    );
  });

  it('should handle authentication error', async () => {
    // Override auth mock for this test
    vi.doMock('../../../contexts/AuthContext', () => ({
      useAuth: () => ({
        user: null,
        isLoading: false,
      }),
    }));

    const { result } = renderHook(() => useUserCommissionProfile(12), {
      wrapper,
    });

    // Should not fetch when user is not authenticated
    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('should retry once on failure', async () => {
    const error = new Error('Network error');

    vi.mocked(commissionRateService.getUserCommissionProfile)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(mockCommissionProfile);

    const { result } = renderHook(() => useUserCommissionProfile(12), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should have retried once
    expect(commissionRateService.getUserCommissionProfile).toHaveBeenCalledTimes(
      2
    );
  });

  it('should handle empty product breakdown', async () => {
    const emptyBreakdownProfile: UserCommissionProfile = {
      ...mockCommissionProfile,
      productBreakdown: [],
      dataQuality: 'LOW',
    };

    vi.mocked(commissionRateService.getUserCommissionProfile).mockResolvedValue(
      emptyBreakdownProfile
    );

    const { result } = renderHook(() => useUserCommissionProfile(12), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.productBreakdown).toHaveLength(0);
    expect(result.current.data?.dataQuality).toBe('LOW');
  });

  it('should use different query keys for different lookback periods', async () => {
    vi.mocked(commissionRateService.getUserCommissionProfile).mockResolvedValue(
      mockCommissionProfile
    );

    const { result: result12 } = renderHook(
      () => useUserCommissionProfile(12),
      { wrapper }
    );
    const { result: result6 } = renderHook(() => useUserCommissionProfile(6), {
      wrapper,
    });

    await waitFor(() => {
      expect(result12.current.isSuccess).toBe(true);
      expect(result6.current.isSuccess).toBe(true);
    });

    // Should be called twice with different parameters
    expect(commissionRateService.getUserCommissionProfile).toHaveBeenCalledTimes(
      2
    );
    expect(commissionRateService.getUserCommissionProfile).toHaveBeenCalledWith(
      'test-user-id',
      12
    );
    expect(commissionRateService.getUserCommissionProfile).toHaveBeenCalledWith(
      'test-user-id',
      6
    );
  });
});
