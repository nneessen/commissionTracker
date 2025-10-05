/**
 * Tests for comp rates management hooks
 * Tests verify the new hooks for managing commission rates by product/carrier
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCompRates,
  useCompRatesByProduct,
  useCompRatesByCarrier,
  useUpdateCompRate,
  useCreateCompRate,
  useBulkCreateCompRates,
  useBulkUpdateCompRates,
  compRatesKeys,
} from '../useCompRates';
import { compGuideService } from '../../../services/settings/compGuideService';

// Mock the service
vi.mock('../../../services/settings/compGuideService', () => ({
  compGuideService: {
    getAllEntries: vi.fn(),
    getEntriesByProduct: vi.fn(),
    getEntriesByCarrier: vi.fn(),
    updateEntry: vi.fn(),
    createEntry: vi.fn(),
    createBulkEntries: vi.fn(),
    deleteEntry: vi.fn(),
  },
}));

// Create a wrapper with QueryClient for tests
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('Comp Rates Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCompRates', () => {
    it('should fetch all comp rates', async () => {
      const mockRates = [
        { id: '1', carrier_id: 'c1', product_id: 'p1', contract_level: 100, commission_percentage: 0.85 },
        { id: '2', carrier_id: 'c1', product_id: 'p1', contract_level: 105, commission_percentage: 0.90 },
      ];

      vi.mocked(compGuideService.getAllEntries).mockResolvedValue({
        data: mockRates,
        error: null,
      } as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCompRates(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRates);
      expect(compGuideService.getAllEntries).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when fetching comp rates', async () => {
      vi.mocked(compGuideService.getAllEntries).mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch' },
      } as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCompRates(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should use correct query key', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCompRates(), { wrapper });

      // Query key should match compRatesKeys.lists()
      expect(compRatesKeys.lists()).toEqual(['comp-rates', 'list']);
    });
  });

  describe('useCompRatesByProduct', () => {
    it('should fetch comp rates for a specific product', async () => {
      const productId = 'product-123';
      const mockRates = [
        { id: '1', product_id: productId, contract_level: 80, commission_percentage: 0.70 },
        { id: '2', product_id: productId, contract_level: 85, commission_percentage: 0.75 },
      ];

      vi.mocked(compGuideService.getEntriesByProduct).mockResolvedValue({
        data: mockRates,
        error: null,
      } as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCompRatesByProduct(productId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRates);
      expect(compGuideService.getEntriesByProduct).toHaveBeenCalledWith(productId);
    });

    it('should not fetch when productId is undefined', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCompRatesByProduct(undefined), { wrapper });

      expect(result.current.fetchStatus).toBe('idle');
      expect(compGuideService.getEntriesByProduct).not.toHaveBeenCalled();
    });

    it('should return undefined when productId is undefined and query is disabled', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCompRatesByProduct(undefined), { wrapper });

      // Query is disabled, so data should be undefined
      expect(result.current.data).toBeUndefined();
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useCompRatesByCarrier', () => {
    it('should fetch comp rates for a specific carrier', async () => {
      const carrierId = 'carrier-456';
      const mockRates = [
        { id: '1', carrier_id: carrierId, contract_level: 100, commission_percentage: 0.85 },
      ];

      vi.mocked(compGuideService.getEntriesByCarrier).mockResolvedValue({
        data: mockRates,
        error: null,
      } as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCompRatesByCarrier(carrierId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRates);
      expect(compGuideService.getEntriesByCarrier).toHaveBeenCalledWith(carrierId);
    });

    it('should not fetch when carrierId is undefined', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCompRatesByCarrier(undefined), { wrapper });

      expect(result.current.fetchStatus).toBe('idle');
      expect(compGuideService.getEntriesByCarrier).not.toHaveBeenCalled();
    });
  });

  describe('useUpdateCompRate', () => {
    it('should update a comp rate entry', async () => {
      const updatedRate = {
        id: '1',
        commission_percentage: 0.95,
      };

      vi.mocked(compGuideService.updateEntry).mockResolvedValue({
        data: updatedRate,
        error: null,
      } as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateCompRate(), { wrapper });

      await result.current.mutateAsync({
        id: '1',
        updates: { commission_percentage: 0.95 },
      });

      expect(compGuideService.updateEntry).toHaveBeenCalledWith('1', {
        commission_percentage: 0.95,
      });
    });

    it('should handle update errors', async () => {
      vi.mocked(compGuideService.updateEntry).mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      } as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateCompRate(), { wrapper });

      await expect(
        result.current.mutateAsync({
          id: '1',
          updates: { commission_percentage: 0.95 },
        })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('useCreateCompRate', () => {
    it('should create a new comp rate entry', async () => {
      const newRate = {
        product_id: 'p1',
        carrier_id: 'c1',
        contract_level: 100,
        commission_percentage: 0.85,
        effective_date: '2025-01-01',
      };

      vi.mocked(compGuideService.createEntry).mockResolvedValue({
        data: { id: 'new-id', ...newRate },
        error: null,
      } as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateCompRate(), { wrapper });

      await result.current.mutateAsync(newRate as any);

      expect(compGuideService.createEntry).toHaveBeenCalledWith(newRate);
    });
  });

  describe('useBulkCreateCompRates', () => {
    it('should create multiple comp rate entries', async () => {
      const newRates = [
        { product_id: 'p1', contract_level: 80, commission_percentage: 0.70, effective_date: '2025-01-01' },
        { product_id: 'p1', contract_level: 85, commission_percentage: 0.75, effective_date: '2025-01-01' },
        { product_id: 'p1', contract_level: 90, commission_percentage: 0.80, effective_date: '2025-01-01' },
      ];

      vi.mocked(compGuideService.createBulkEntries).mockResolvedValue({
        data: newRates.map((r, i) => ({ id: `id-${i}`, ...r })),
        error: null,
      } as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkCreateCompRates(), { wrapper });

      await result.current.mutateAsync(newRates as any);

      expect(compGuideService.createBulkEntries).toHaveBeenCalledWith(newRates);
    });

    it('should handle bulk create errors', async () => {
      const newRates = [
        { product_id: 'p1', contract_level: 80, commission_percentage: 0.70, effective_date: '2025-01-01' },
      ];

      vi.mocked(compGuideService.createBulkEntries).mockResolvedValue({
        data: null,
        error: { message: 'Bulk create failed' },
      } as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkCreateCompRates(), { wrapper });

      await expect(result.current.mutateAsync(newRates as any)).rejects.toThrow('Bulk create failed');
    });
  });

  describe('useBulkUpdateCompRates', () => {
    it('should update multiple comp rate entries', async () => {
      const updates = [
        { id: '1', updates: { commission_percentage: 0.80 } },
        { id: '2', updates: { commission_percentage: 0.85 } },
      ];

      vi.mocked(compGuideService.updateEntry)
        .mockResolvedValueOnce({ data: { id: '1', commission_percentage: 0.80 }, error: null } as any)
        .mockResolvedValueOnce({ data: { id: '2', commission_percentage: 0.85 }, error: null } as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkUpdateCompRates(), { wrapper });

      await result.current.mutateAsync(updates as any);

      expect(compGuideService.updateEntry).toHaveBeenCalledTimes(2);
      expect(compGuideService.updateEntry).toHaveBeenCalledWith('1', { commission_percentage: 0.80 });
      expect(compGuideService.updateEntry).toHaveBeenCalledWith('2', { commission_percentage: 0.85 });
    });

    it('should handle partial failures in bulk update', async () => {
      const updates = [
        { id: '1', updates: { commission_percentage: 0.80 } },
        { id: '2', updates: { commission_percentage: 0.85 } },
      ];

      vi.mocked(compGuideService.updateEntry)
        .mockResolvedValueOnce({ data: { id: '1', commission_percentage: 0.80 }, error: null } as any)
        .mockResolvedValueOnce({ data: null, error: { message: 'Update failed' } } as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkUpdateCompRates(), { wrapper });

      await expect(result.current.mutateAsync(updates as any)).rejects.toThrow('Failed to update 1 entries');
    });
  });

  describe('compRatesKeys', () => {
    it('should generate correct query keys', () => {
      expect(compRatesKeys.all).toEqual(['comp-rates']);
      expect(compRatesKeys.lists()).toEqual(['comp-rates', 'list']);
      expect(compRatesKeys.list({ status: 'active' })).toEqual(['comp-rates', 'list', { status: 'active' }]);
      expect(compRatesKeys.details()).toEqual(['comp-rates', 'detail']);
      expect(compRatesKeys.detail('123')).toEqual(['comp-rates', 'detail', '123']);
      expect(compRatesKeys.byProduct('p1')).toEqual(['comp-rates', 'product', 'p1']);
      expect(compRatesKeys.byCarrier('c1')).toEqual(['comp-rates', 'carrier', 'c1']);
    });
  });
});
