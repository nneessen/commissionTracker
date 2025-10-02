/**
 * Integration tests for comp (compensation guide) hooks
 * These tests verify the hooks integrate correctly with TanStack Query
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCompsList, useCreateComp, useUpdateComp, useDeleteComp } from '../index';

// Create a wrapper with QueryClient for tests
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for tests
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

describe('Comp Hooks Integration', () => {
  beforeEach(() => {
    // Clear any cached data between tests
  });

  describe('useCompsList', () => {
    it('should have correct structure and types', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCompsList(), { wrapper });

      // Verify hook returns TanStack Query result
      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refetch');
    });

    it('should accept optional filters parameter', () => {
      const wrapper = createWrapper();
      const filters = {
        carrier_id: 'test-carrier-id',
        product_type: 'term_life' as const,
      };

      const { result } = renderHook(() => useCompsList(filters), { wrapper });

      // Should not throw error with filters
      expect(result.current).toBeDefined();
    });
  });

  describe('useCreateComp', () => {
    it('should have correct mutation structure', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateComp(), { wrapper });

      // Verify hook returns TanStack Query mutation result
      expect(result.current).toHaveProperty('mutate');
      expect(result.current).toHaveProperty('mutateAsync');
      expect(result.current).toHaveProperty('isPending');
      expect(result.current).toHaveProperty('isError');
      expect(result.current).toHaveProperty('isSuccess');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('reset');
    });
  });

  describe('useUpdateComp', () => {
    it('should have correct mutation structure', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateComp(), { wrapper });

      // Verify hook returns TanStack Query mutation result
      expect(result.current).toHaveProperty('mutate');
      expect(result.current).toHaveProperty('mutateAsync');
      expect(result.current).toHaveProperty('isPending');
      expect(result.current).toHaveProperty('isError');
      expect(result.current).toHaveProperty('isSuccess');
    });
  });

  describe('useDeleteComp', () => {
    it('should have correct mutation structure', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteComp(), { wrapper });

      // Verify hook returns TanStack Query mutation result
      expect(result.current).toHaveProperty('mutate');
      expect(result.current).toHaveProperty('mutateAsync');
      expect(result.current).toHaveProperty('isPending');
      expect(result.current).toHaveProperty('isError');
      expect(result.current).toHaveProperty('isSuccess');
    });
  });

  describe('Hook Integration', () => {
    it('should follow TanStack Query best practices', () => {
      const wrapper = createWrapper();

      // Query hook
      const { result: listResult } = renderHook(() => useCompsList(), { wrapper });
      expect(listResult.current.isLoading).toBeDefined();
      expect(typeof listResult.current.isLoading).toBe('boolean');

      // Mutation hooks
      const { result: createResult } = renderHook(() => useCreateComp(), { wrapper });
      expect(createResult.current.isPending).toBeDefined();
      expect(typeof createResult.current.isPending).toBe('boolean');

      const { result: updateResult } = renderHook(() => useUpdateComp(), { wrapper });
      expect(updateResult.current.isPending).toBeDefined();

      const { result: deleteResult } = renderHook(() => useDeleteComp(), { wrapper });
      expect(deleteResult.current.isPending).toBeDefined();
    });
  });
});
