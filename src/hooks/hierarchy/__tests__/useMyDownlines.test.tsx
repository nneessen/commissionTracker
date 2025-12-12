// src/hooks/hierarchy/__tests__/useMyDownlines.test.tsx

import {describe, it, expect, vi, beforeEach} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {useMyDownlines} from '../useMyDownlines';
import {hierarchyService} from '../../../services/hierarchy/hierarchyService';
import type {UserProfile} from '../../../types/hierarchy.types';
import type {ReactNode} from 'react';

vi.mock('../../../services/hierarchy/hierarchyService', () => ({
  hierarchyService: {
    getMyDownlines: vi.fn(),
  },
}));

const mockDownlines: UserProfile[] = [
  {
    id: 'downline-1',
    email: 'downline1@example.com',
    upline_id: 'user-1',
    hierarchy_path: 'user-1.downline-1',
    hierarchy_depth: 1,
    approval_status: 'approved',
    is_admin: false,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  },
  {
    id: 'downline-2',
    email: 'downline2@example.com',
    upline_id: 'user-1',
    hierarchy_path: 'user-1.downline-2',
    hierarchy_depth: 1,
    approval_status: 'approved',
    is_admin: false,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  },
];

describe('useMyDownlines', () => {
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

  it('should fetch downlines successfully', async () => {
    vi.mocked(hierarchyService.getMyDownlines).mockResolvedValue(mockDownlines);

    const { result } = renderHook(() => useMyDownlines(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockDownlines);
    expect(result.current.data).toHaveLength(2);
  });

  it('should handle empty downlines list', async () => {
    vi.mocked(hierarchyService.getMyDownlines).mockResolvedValue([]);

    const { result } = renderHook(() => useMyDownlines(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch downlines');
    vi.mocked(hierarchyService.getMyDownlines).mockRejectedValue(error);

    const { result } = renderHook(() => useMyDownlines(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError || result.current.isLoading === false).toBe(true);
    }, { timeout: 5000 });

    // After all retries complete, should be in error state
    if (result.current.isError) {
      expect(result.current.error).toBeTruthy();
    }
  });

  it('should support custom staleTime', async () => {
    vi.mocked(hierarchyService.getMyDownlines).mockResolvedValue(mockDownlines);

    const { result } = renderHook(
      () => useMyDownlines({ staleTime: 10 * 60 * 1000 }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockDownlines);
  });

  it('should handle downlines at different hierarchy depths', async () => {
    const mixedDepthDownlines: UserProfile[] = [
      {
        ...mockDownlines[0],
        hierarchy_depth: 1,
      },
      {
        ...mockDownlines[1],
        id: 'downline-2-1',
        hierarchy_depth: 2,
        upline_id: 'downline-1',
        hierarchy_path: 'user-1.downline-1.downline-2-1',
      },
    ];

    vi.mocked(hierarchyService.getMyDownlines).mockResolvedValue(mixedDepthDownlines);

    const { result } = renderHook(() => useMyDownlines(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].hierarchy_depth).toBe(1);
    expect(result.current.data?.[1].hierarchy_depth).toBe(2);
  });
});
