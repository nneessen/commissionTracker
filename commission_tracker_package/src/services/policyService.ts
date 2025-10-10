import { Policy, PolicyFilters, CreatePolicyData } from '../../types/policy.types';
import { PolicyRepository } from './PolicyRepository';
import { supabase } from '../base/supabase';

/**
 * Service layer for policies - handles business logic
 * Uses PolicyRepository for all data access
 */
class PolicyService {
  private repository = new PolicyRepository();

  /**
   * Get all policies ordered by creation date
   */
  async getAll(): Promise<Policy[]> {
    return this.repository.findAll();
  }

  /**
   * Get a single policy by ID
   */
  async getById(id: string): Promise<Policy | null> {
    return this.repository.findById(id);
  }

  /**
   * Create a new policy and automatically create commission record
   */
  async create(policyData: CreatePolicyData): Promise<Policy> {
    // 1. Create policy record
    const policy = await this.repository.create(policyData);

    // 2. Calculate advance amount
    const monthlyPremium = policyData.monthly_premium || 0;
    const commissionRate = policyData.commission_percentage || 0;
    const advanceMonths = 9; // Industry standard
    const advanceAmount = monthlyPremium * advanceMonths * commissionRate;

    // 3. Create commission record if there's an advance amount
    if (advanceAmount > 0) {
      const { error: commissionError } = await supabase
        .from('commissions')
        .insert([{
          user_id: policy.user_id,
          policy_id: policy.id,
          carrier_id: policy.carrier_id,
          commission_amount: advanceAmount,
          payment_date: policy.effective_date,
          status: 'pending',
          is_advance: true,
          advance_months: advanceMonths,
          months_paid: 0,
          earned_amount: 0,
          unearned_amount: advanceAmount,
        }]);

      if (commissionError) {
        console.error('Failed to create commission record:', commissionError);
        // Don't fail policy creation if commission creation fails
        // Can be retried/fixed manually
      }
    }

    return policy;
  }

  /**
   * Update an existing policy
   */
  async update(id: string, updates: Partial<CreatePolicyData>): Promise<Policy> {
    return this.repository.update(id, updates);
  }

  /**
   * Delete a policy
   */
  async delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  /**
   * Get policies filtered by various criteria
   * Note: For simple filters, prefer using this method for server-side filtering
   * For complex client-side operations, use hooks with client-side filtering
   */
  async getFiltered(filters: PolicyFilters): Promise<Policy[]> {
    // Build filtered query - delegate to repository for complex filters
    // For now, do client-side filtering for simplicity
    const allPolicies = await this.repository.findAll();

    return allPolicies.filter(policy => {
      if (filters.status && policy.status !== filters.status) return false;
      if (filters.carrierId && policy.carrierId !== filters.carrierId) return false;
      if (filters.product && policy.product !== filters.product) return false;
      if (filters.startDate && new Date(policy.effectiveDate) < filters.startDate) return false;
      if (filters.endDate && new Date(policy.effectiveDate) > filters.endDate) return false;
      if (filters.minPremium && policy.annualPremium < filters.minPremium) return false;
      if (filters.maxPremium && policy.annualPremium > filters.maxPremium) return false;
      return true;
    });
  }

  /**
   * Business logic: Get monthly metrics for a given month/year
   */
  async getMonthlyMetrics(year: number, month: number) {
    return this.repository.getMonthlyMetrics(year, month);
  }

  /**
   * Business logic: Get total annual premium by carrier
   */
  async getTotalAnnualPremiumByCarrier(carrierId: string): Promise<number> {
    return this.repository.getTotalAnnualPremiumByCarrier(carrierId);
  }

  /**
   * Business logic: Find policies by carrier
   */
  async findByCarrier(carrierId: string): Promise<Policy[]> {
    return this.repository.findByCarrier(carrierId);
  }

  /**
   * Business logic: Find policies by user/agent
   */
  async findByAgent(userId: string): Promise<Policy[]> {
    return this.repository.findByAgent(userId);
  }
}

export { PolicyService };
export const policyService = new PolicyService();
