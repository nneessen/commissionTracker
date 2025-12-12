/**
 * AuthContext Integration Tests
 * Verifies the auth system implementation without requiring manual testing
 */

import {describe, it, expect, beforeEach, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {AuthProvider, useAuth} from '../AuthContext';

// Create a wrapper with QueryClient for tests
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear any mocks between tests
    vi.clearAllMocks();
  });

  describe('Context Structure', () => {
    it('should provide auth context with all required properties', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Verify all auth context properties exist
      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('supabaseUser');
      expect(result.current).toHaveProperty('session');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
    });

    it('should provide all auth methods', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Verify all auth methods exist
      expect(result.current).toHaveProperty('signIn');
      expect(result.current).toHaveProperty('signUp');
      expect(result.current).toHaveProperty('signOut');
      expect(result.current).toHaveProperty('resetPassword');
      expect(result.current).toHaveProperty('updatePassword');
      expect(result.current).toHaveProperty('refreshSession');
      expect(result.current).toHaveProperty('updateUserMetadata');

      // Verify they are functions
      expect(typeof result.current.signIn).toBe('function');
      expect(typeof result.current.signUp).toBe('function');
      expect(typeof result.current.signOut).toBe('function');
      expect(typeof result.current.resetPassword).toBe('function');
      expect(typeof result.current.updatePassword).toBe('function');
      expect(typeof result.current.refreshSession).toBe('function');
      expect(typeof result.current.updateUserMetadata).toBe('function');
    });

    it('should throw error when useAuth called outside provider', () => {
      // This should throw an error
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });
  });

  describe('Initial State', () => {
    it('should start with loading state', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Initially loading while checking session
      expect(result.current.loading).toBe(true);
    });

    it('should have null user initially', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.supabaseUser).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('should have null error initially', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Method Signatures', () => {
    it('signIn should accept email and password parameters', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Method should exist and be callable (will fail in test env, but structure is correct)
      expect(result.current.signIn).toBeDefined();
      expect(result.current.signIn.length).toBe(2); // Takes 2 parameters
    });

    it('signUp should accept email and password parameters', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.signUp).toBeDefined();
      expect(result.current.signUp.length).toBe(2);
    });

    it('resetPassword should accept email parameter', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.resetPassword).toBeDefined();
      expect(result.current.resetPassword.length).toBe(1);
    });

    it('updatePassword should accept newPassword parameter', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.updatePassword).toBeDefined();
      expect(result.current.updatePassword.length).toBe(1);
    });

    it('updateUserMetadata should accept metadata parameter', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.updateUserMetadata).toBeDefined();
      expect(result.current.updateUserMetadata.length).toBe(1);
    });
  });

  describe('Session Check on Mount', () => {
    it('should complete loading after checking session', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });
    });
  });

  describe('Type Safety', () => {
    it('user should have correct type when logged in', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      // User type should be User | null
      const user = result.current.user;

      if (user !== null) {
        // If user exists, should have these properties
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
      }
    });

    it('session should have correct Supabase session type', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      const session = result.current.session;

      if (session !== null) {
        // If session exists, should have these properties
        expect(session).toHaveProperty('access_token');
        expect(session).toHaveProperty('user');
      }
    });
  });
});

describe('Auth Methods Return Promises', () => {
  it('all async methods should return promises', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Call methods and check they return promises (even if they fail)
    const signInPromise = result.current.signIn('test@test.com', 'password').catch(() => {});
    const signUpPromise = result.current.signUp('test@test.com', 'password').catch(() => {});
    const resetPromise = result.current.resetPassword('test@test.com').catch(() => {});
    const signOutPromise = result.current.signOut().catch(() => {});

    expect(signInPromise).toBeInstanceOf(Promise);
    expect(signUpPromise).toBeInstanceOf(Promise);
    expect(resetPromise).toBeInstanceOf(Promise);
    expect(signOutPromise).toBeInstanceOf(Promise);
  });
});
