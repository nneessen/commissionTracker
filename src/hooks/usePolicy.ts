// /home/nneessen/projects/commissionTracker/src/hooks/usePolicy.ts

import { useState, useCallback, useEffect } from 'react';
import { Policy, NewPolicyForm, PolicyFilters, PolicySummary, PolicyStatus } from '../types/policy.types';
import { ProductType } from '../types/commission.types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'commission_tracker_policies';

export const usePolicy = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load policies from localStorage on mount
  useEffect(() => {
    const loadPolicies = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPolicies(parsed.map((p: any) => ({
            ...p,
            effectiveDate: new Date(p.effectiveDate),
            expirationDate: p.expirationDate ? new Date(p.expirationDate) : undefined,
            createdAt: new Date(p.createdAt),
            updatedAt: p.updatedAt ? new Date(p.updatedAt) : undefined,
          })));
        }
      } catch (error) {
        console.error('Error loading policies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPolicies();
  }, []);

  // Save policies to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(policies));
      } catch (error) {
        console.error('Error saving policies:', error);
      }
    }
  }, [policies, isLoading]);

  // Add a new policy
  const addPolicy = useCallback((formData: NewPolicyForm): Policy => {
    const newPolicy: Policy = {
      id: uuidv4(),
      policyNumber: formData.policyNumber,
      status: formData.status,
      client: {
        name: formData.clientName,
        state: formData.clientState,
        age: formData.clientAge,
        email: formData.clientEmail,
        phone: formData.clientPhone,
      },
      carrierId: formData.carrierId,
      product: formData.product,
      effectiveDate: new Date(formData.effectiveDate),
      termLength: formData.termLength,
      expirationDate: formData.termLength
        ? new Date(new Date(formData.effectiveDate).setFullYear(
            new Date(formData.effectiveDate).getFullYear() + formData.termLength
          ))
        : undefined,
      annualPremium: formData.annualPremium || 0,
      paymentFrequency: formData.paymentFrequency,
      commissionPercentage: formData.commissionPercentage,
      createdAt: new Date(),
      updatedAt: new Date(),
      notes: formData.notes,
    };

    setPolicies(prev => [...prev, newPolicy]);
    return newPolicy;
  }, []);

  // Update an existing policy
  const updatePolicy = useCallback((id: string, updates: Partial<Policy> | NewPolicyForm) => {
    setPolicies(prev => prev.map(policy => {
      if (policy.id !== id) return policy;

      // If updates is NewPolicyForm, convert it to Policy format
      if ('clientName' in updates) {
        const formData = updates as NewPolicyForm;
        const annualPremium = formData.premium *
          (formData.paymentFrequency === 'monthly' ? 12 :
           formData.paymentFrequency === 'quarterly' ? 4 :
           formData.paymentFrequency === 'semi-annual' ? 2 : 1);

        return {
          ...policy,
          client: {
            name: formData.clientName,
            state: formData.clientState,
            age: formData.clientAge,
            email: formData.clientEmail,
            phone: formData.clientPhone,
          },
          carrierId: formData.carrierId,
          product: formData.product,
          policyNumber: formData.policyNumber,
          effectiveDate: new Date(formData.effectiveDate),
          expirationDate: formData.expirationDate ? new Date(formData.expirationDate) : undefined,
          annualPremium,
          paymentFrequency: formData.paymentFrequency,
          commissionPercentage: formData.commissionPercentage,
          status: formData.status,
          notes: formData.notes,
          updatedAt: new Date(),
        };
      }

      // Otherwise treat as partial Policy update
      return { ...policy, ...updates, updatedAt: new Date() };
    }));
  }, []);

  // Update policy status
  const updatePolicyStatus = useCallback((id: string, status: PolicyStatus) => {
    updatePolicy(id, { status });
  }, [updatePolicy]);

  // Delete a policy
  const deletePolicy = useCallback((id: string) => {
    setPolicies(prev => prev.filter(policy => policy.id !== id));
  }, []);

  // Get policy by ID
  const getPolicyById = useCallback((id: string): Policy | undefined => {
    return policies.find(policy => policy.id === id);
  }, [policies]);

  // Get policies by client name
  const getPoliciesByClient = useCallback((clientName: string): Policy[] => {
    return policies.filter(policy =>
      policy.client.name.toLowerCase().includes(clientName.toLowerCase())
    );
  }, [policies]);

  // Filter policies
  const filterPolicies = useCallback((filters: PolicyFilters): Policy[] => {
    return policies.filter(policy => {
      if (filters.status && policy.status !== filters.status) return false;
      if (filters.carrierId && policy.carrierId !== filters.carrierId) return false;
      if (filters.product && policy.product !== filters.product) return false;

      if (filters.dateRange) {
        const effectiveDate = policy.effectiveDate.getTime();
        if (effectiveDate < filters.dateRange.start.getTime() ||
            effectiveDate > filters.dateRange.end.getTime()) {
          return false;
        }
      }

      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        return (
          policy.client.name.toLowerCase().includes(searchLower) ||
          policy.policyNumber.toLowerCase().includes(searchLower) ||
          policy.client.state.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [policies]);

  // Get policy summary
  const getPolicySummary = useCallback((): PolicySummary => {
    const activePolicies = policies.filter(p => p.status === 'active');
    const pendingPolicies = policies.filter(p => p.status === 'pending');
    const lapsedPolicies = policies.filter(p => p.status === 'lapsed');

    const policiesByStatus = policies.reduce((acc, policy) => {
      acc[policy.status] = (acc[policy.status] || 0) + 1;
      return acc;
    }, {} as Record<PolicyStatus, number>);

    const policiesByProduct = policies.reduce((acc, policy) => {
      acc[policy.product] = (acc[policy.product] || 0) + 1;
      return acc;
    }, {} as Record<ProductType, number>);

    const totalAnnualPremium = policies.reduce((sum, p) => sum + p.annualPremium, 0);
    const totalExpectedCommission = policies.reduce(
      (sum, p) => sum + (p.annualPremium * p.commissionPercentage / 100),
      0
    );

    return {
      totalPolicies: policies.length,
      activePolicies: activePolicies.length,
      pendingPolicies: pendingPolicies.length,
      lapsedPolicies: lapsedPolicies.length,
      totalAnnualPremium,
      totalExpectedCommission,
      averagePolicyValue: policies.length > 0 ? totalAnnualPremium / policies.length : 0,
      policiesByStatus,
      policiesByProduct,
    };
  }, [policies]);

  // Get policies expiring soon (within 30 days)
  const getExpiringPolicies = useCallback((days: number = 30): Policy[] => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const now = new Date();

    return policies.filter(policy => {
      if (!policy.expirationDate) return false;
      const expDate = policy.expirationDate.getTime();
      return expDate >= now.getTime() && expDate <= futureDate.getTime();
    });
  }, [policies]);

  // Check for duplicate policy number
  const isDuplicatePolicyNumber = useCallback((policyNumber: string, excludeId?: string): boolean => {
    return policies.some(policy =>
      policy.policyNumber === policyNumber && policy.id !== excludeId
    );
  }, [policies]);

  return {
    policies,
    isLoading,
    addPolicy,
    updatePolicy,
    updatePolicyStatus,
    deletePolicy,
    getPolicyById,
    getPoliciesByClient,
    filterPolicies,
    getPolicySummary,
    getExpiringPolicies,
    isDuplicatePolicyNumber,
  };
};