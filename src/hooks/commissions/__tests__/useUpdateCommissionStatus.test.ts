// src/hooks/commissions/__tests__/useUpdateCommissionStatus.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateCommissionStatus } from '../useUpdateCommissionStatus';
import { supabase } from '../../../services/base/supabase';

// Mock Supabase
vi.mock('../../../services/base/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('useUpdateCommissionStatus', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should update commission to paid status with full months_paid', async () => {
    const mockCommission = {
      advance_months: 9,
      amount: 5000,
    };

    const mockUpdatedCommission = {
      id: 'comm-123',
      status: 'paid',
      months_paid: 9,
      earned_amount: 5000,
      unearned_amount: 0,
      chargeback_amount: 0,
    };

    // Mock the SELECT query
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockCommission,
          error: null,
        }),
      }),
    });

    // Mock the UPDATE query for commission
    const updateCommissionMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUpdatedCommission,
            error: null,
          }),
        }),
      }),
    });

    // Mock the UPDATE query for policy
    const updatePolicyMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'commissions') {
        return {
          select: selectMock,
          update: updateCommissionMock,
        };
      }
      if (table === 'policies') {
        return {
          update: updatePolicyMock,
        };
      }
    });

    const { result } = renderHook(() => useUpdateCommissionStatus(), { wrapper });

    result.current.mutate({
      commissionId: 'comm-123',
      status: 'paid',
      policyId: 'policy-456',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify months_paid was set to advance_months
    expect(updateCommissionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'paid',
        months_paid: 9,
        chargeback_amount: 0,
        chargeback_date: null,
        chargeback_reason: null,
      })
    );
  });

  it('should update commission to pending status with zero months_paid', async () => {
    const mockCommission = {
      advance_months: 9,
      amount: 5000,
    };

    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockCommission,
          error: null,
        }),
      }),
    });

    const updateCommissionMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'comm-123', status: 'pending', months_paid: 0 },
            error: null,
          }),
        }),
      }),
    });

    const updatePolicyMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'commissions') {
        return { select: selectMock, update: updateCommissionMock };
      }
      if (table === 'policies') {
        return { update: updatePolicyMock };
      }
    });

    const { result } = renderHook(() => useUpdateCommissionStatus(), { wrapper });

    result.current.mutate({
      commissionId: 'comm-123',
      status: 'pending',
      policyId: 'policy-456',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify months_paid was reset to 0 and chargeback fields cleared
    expect(updateCommissionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        months_paid: 0,
        chargeback_amount: 0,
        chargeback_date: null,
        chargeback_reason: null,
        payment_date: null,
      })
    );
  });

  it('should clear chargeback fields when transitioning from cancelled to pending', async () => {
    const mockCommission = {
      advance_months: 9,
      amount: 5000,
    };

    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockCommission,
          error: null,
        }),
      }),
    });

    const updateCommissionMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'comm-123',
              status: 'pending',
              months_paid: 0,
              chargeback_amount: 0,
            },
            error: null,
          }),
        }),
      }),
    });

    const updatePolicyMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'commissions') {
        return { select: selectMock, update: updateCommissionMock };
      }
      if (table === 'policies') {
        return { update: updatePolicyMock };
      }
    });

    const { result } = renderHook(() => useUpdateCommissionStatus(), { wrapper });

    result.current.mutate({
      commissionId: 'comm-123',
      status: 'pending',
      policyId: 'policy-456',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify chargeback fields were cleared
    const updateCall = updateCommissionMock.mock.calls[0][0];
    expect(updateCall).toMatchObject({
      chargeback_amount: 0,
      chargeback_date: null,
      chargeback_reason: null,
    });
  });

  it('should update policy status when commission status changes', async () => {
    const mockCommission = {
      advance_months: 9,
      amount: 5000,
    };

    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockCommission,
          error: null,
        }),
      }),
    });

    const updateCommissionMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'comm-123', status: 'paid' },
            error: null,
          }),
        }),
      }),
    });

    const updatePolicyMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'commissions') {
        return { select: selectMock, update: updateCommissionMock };
      }
      if (table === 'policies') {
        return { update: updatePolicyMock };
      }
    });

    const { result } = renderHook(() => useUpdateCommissionStatus(), { wrapper });

    result.current.mutate({
      commissionId: 'comm-123',
      status: 'paid',
      policyId: 'policy-456',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify policy status was updated to 'active'
    expect(updatePolicyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
      })
    );
  });
});
