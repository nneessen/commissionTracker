// /home/nneessen/projects/commissionTracker/src/hooks/policies/__tests__/useCreatePolicy.test.tsx

import { renderHook, act } from '@testing-library/react';
import { useCreatePolicy } from '../useCreatePolicy';
import { NewPolicyForm, Policy } from '../../../types';

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-123',
}));

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

describe('useCreatePolicy', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  const validFormData: NewPolicyForm = {
    policyNumber: 'POL-001',
    status: 'active',
    clientName: 'John Doe',
    clientState: 'NY',
    clientAge: 35,
    clientEmail: 'john@example.com',
    clientPhone: '555-0001',
    carrierId: 'carrier-1',
    product: 'term',
    effectiveDate: '2024-01-01',
    termLength: 20,
    premium: 100, // Monthly premium
    annualPremium: 1200,
    paymentFrequency: 'monthly',
    commissionPercentage: 10,
    notes: 'Test policy',
  };

  test('should create a new policy successfully', async () => {
    const { result } = renderHook(() => useCreatePolicy());

    let createdPolicy: Policy | null = null;
    await act(async () => {
      createdPolicy = await result.current.createPolicy(validFormData);
    });

    expect(createdPolicy).not.toBeNull();
    expect((createdPolicy as unknown as Policy).id).toBe('test-uuid-123');
    expect((createdPolicy as unknown as Policy).policyNumber).toBe('POL-001');
    expect((createdPolicy as unknown as Policy).client.name).toBe('John Doe');
    expect(result.current.error).toBeNull();
    expect(result.current.isCreating).toBe(false);
  });

  test('should prevent duplicate policy numbers', async () => {
    const existingPolicy: Policy = {
      id: 'existing-policy',
      policyNumber: 'POL-001',
      status: 'active',
      client: {
        name: 'Existing Client',
        state: 'CA',
        age: 40,
      },
      carrierId: 'carrier-2',
      product: 'whole_life',
      effectiveDate: new Date('2023-01-01'),
      annualPremium: 2000,
      paymentFrequency: 'annual',
      commissionPercentage: 15,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    localStorageMock.setItem('policies', JSON.stringify([existingPolicy]));

    const { result } = renderHook(() => useCreatePolicy());

    let createdPolicy: Policy | null = null;
    await act(async () => {
      createdPolicy = await result.current.createPolicy(validFormData);
    });

    expect(createdPolicy).toBeNull();
    expect(result.current.error).toBe('Policy number POL-001 already exists');
    expect(result.current.isCreating).toBe(false);
  });

  test('should validate required fields', async () => {
    const { result } = renderHook(() => useCreatePolicy());

    const incompleteForm: NewPolicyForm = {
      ...validFormData,
      clientName: '',
    };

    let createdPolicy: Policy | null = null;
    await act(async () => {
      createdPolicy = await result.current.createPolicy(incompleteForm);
    });

    expect(createdPolicy).toBeNull();
    expect(result.current.error).toBe('Missing required fields');
  });

  test('should validate effective date', async () => {
    const { result } = renderHook(() => useCreatePolicy());

    const invalidDateForm: NewPolicyForm = {
      ...validFormData,
      effectiveDate: 'invalid-date',
    };

    let createdPolicy: Policy | null = null;
    await act(async () => {
      createdPolicy = await result.current.createPolicy(invalidDateForm);
    });

    expect(createdPolicy).toBeNull();
    expect(result.current.error).toBe('Invalid effective date');
  });

  test('should validate expiration date is after effective date', async () => {
    const { result } = renderHook(() => useCreatePolicy());

    const invalidDateRangeForm: NewPolicyForm = {
      ...validFormData,
      effectiveDate: '2024-01-01',
      expirationDate: '2023-12-31',
    };

    let createdPolicy: Policy | null = null;
    await act(async () => {
      createdPolicy = await result.current.createPolicy(invalidDateRangeForm);
    });

    expect(createdPolicy).toBeNull();
    expect(result.current.error).toBe('Effective date must be before expiration date');
  });

  test('should calculate expiration date from term length', async () => {
    const { result } = renderHook(() => useCreatePolicy());

    const formWithTerm: NewPolicyForm = {
      ...validFormData,
      termLength: 10,
      expirationDate: undefined,
    };

    let createdPolicy: Policy | null = null;
    await act(async () => {
      createdPolicy = await result.current.createPolicy(formWithTerm);
    });

    expect(createdPolicy).not.toBeNull();
    expect((createdPolicy as unknown as Policy).expirationDate).toBeInstanceOf(Date);

    const expectedExpiration = new Date('2024-01-01');
    expectedExpiration.setFullYear(expectedExpiration.getFullYear() + 10);
    expect((createdPolicy as unknown as Policy).expirationDate?.getFullYear()).toBe(expectedExpiration.getFullYear());
  });

  test('should handle optional fields correctly', async () => {
    const { result } = renderHook(() => useCreatePolicy());

    const minimalForm: NewPolicyForm = {
      ...validFormData,
      clientEmail: undefined,
      clientPhone: undefined,
      expirationDate: undefined,
      termLength: undefined,
      notes: undefined,
    };

    let createdPolicy: Policy | null = null;
    await act(async () => {
      createdPolicy = await result.current.createPolicy(minimalForm);
    });

    expect(createdPolicy).not.toBeNull();
    expect((createdPolicy as unknown as Policy).client.email).toBeUndefined();
    expect((createdPolicy as unknown as Policy).client.phone).toBeUndefined();
    expect((createdPolicy as unknown as Policy).expirationDate).toBeUndefined();
    expect((createdPolicy as unknown as Policy).notes).toBeUndefined();
  });

  test('should clear error when requested', async () => {
    // First set up an existing policy to create a duplicate error
    const existingPolicy = {
      id: 'existing',
      policyNumber: 'POL-001',
      status: 'active',
      client: { name: 'Test', state: 'NY', age: 30 },
      carrierId: 'carrier-1',
      product: 'term',
      effectiveDate: new Date(),
      annualPremium: 1000,
      paymentFrequency: 'monthly',
      commissionPercentage: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    localStorageMock.setItem('policies', JSON.stringify([existingPolicy]));

    const { result } = renderHook(() => useCreatePolicy());

    // Try to create a duplicate policy
    await act(async () => {
      await result.current.createPolicy(validFormData);
    });

    expect(result.current.error).toBe('Policy number POL-001 already exists');

    // Clear the error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  test('should persist created policy to localStorage', async () => {
    const { result } = renderHook(() => useCreatePolicy());

    await act(async () => {
      await result.current.createPolicy(validFormData);
    });

    const storedPolicies = JSON.parse(localStorageMock.getItem('policies') || '[]');
    expect(storedPolicies).toHaveLength(1);
    expect(storedPolicies[0].policyNumber).toBe('POL-001');
  });
});