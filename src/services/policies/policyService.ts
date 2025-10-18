import { Policy, PolicyFilters, CreatePolicyData } from '../../types/policy.types';
import { PolicyRepository } from './PolicyRepository';
import { supabase } from '../base/supabase';
import { logger } from '../base/logger';
import { commissionStatusService } from '../commissions/CommissionStatusService';
import { DatabaseError, NotFoundError, ValidationError } from '../../errors/ServiceErrors';

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

  /**
   * Cancel a policy and trigger automatic chargeback calculation
   *
   * When a policy is cancelled, this method:
   * 1. Updates policy status to 'cancelled'
   * 2. Database trigger automatically calculates chargeback
   * 3. Commission status updated to 'charged_back' with chargeback amount
   *
   * @param policyId - Policy ID to cancel
   * @param reason - Reason for cancellation (required)
   * @param cancelDate - Cancellation date (defaults to today)
   * @returns Updated policy and chargeback details
   */
  async cancelPolicy(
    policyId: string,
    reason: string,
    cancelDate: Date = new Date()
  ): Promise<{
    policy: Policy;
    chargeback: {
      amount: number;
      monthsPaid: number;
      reason: string;
    };
  }> {
    try {
      // Validate reason
      if (!reason || reason.trim().length === 0) {
        throw new ValidationError('Cancellation reason is required', [
          { field: 'reason', message: 'Reason cannot be empty', value: reason }
        ]);
      }

      // Validate policy exists
      const policy = await this.repository.findById(policyId);
      if (!policy) {
        throw new NotFoundError('Policy', policyId);
      }

      // Validate policy is not already cancelled
      if (policy.status === 'cancelled' || policy.status === 'lapsed') {
        throw new ValidationError('Policy is already cancelled or lapsed', [
          { field: 'status', message: 'Cannot cancel an already cancelled/lapsed policy', value: policy.status }
        ]);
      }

      // Update policy status to 'cancelled'
      // Database trigger will automatically calculate chargeback
      const { data: updated, error: updateError } = await supabase
        .from('policies')
        .update({
          status: 'cancelled',
          notes: policy.notes
            ? `${policy.notes}\n\nCancelled: ${reason} (${cancelDate.toISOString().split('T')[0]})`
            : `Cancelled: ${reason} (${cancelDate.toISOString().split('T')[0]})`,
          updated_at: new Date().toISOString()
        })
        .eq('id', policyId)
        .select()
        .single();

      if (updateError) {
        throw new DatabaseError('cancelPolicy', updateError);
      }

      // Get updated commission with chargeback details
      const { data: commission, error: commissionError } = await supabase
        .from('commissions')
        .select('chargeback_amount, chargeback_reason, months_paid')
        .eq('policy_id', policyId)
        .single();

      if (commissionError) {
        logger.warn('PolicyService.cancelPolicy', 'Could not fetch chargeback details', {
          policyId,
          error: commissionError
        });
      }

      logger.info('PolicyService', 'Policy cancelled', {
        policyId,
        reason,
        chargebackAmount: commission?.chargeback_amount || 0
      });

      // Transform and return
      const updatedPolicy = this.repository['transformFromDB'](updated);

      return {
        policy: updatedPolicy,
        chargeback: {
          amount: parseFloat(commission?.chargeback_amount || '0'),
          monthsPaid: commission?.months_paid || 0,
          reason: commission?.chargeback_reason || reason
        }
      };
    } catch (error) {
      logger.error('PolicyService.cancelPolicy', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Mark a policy as lapsed and trigger automatic chargeback calculation
   *
   * When a policy lapses (client stopped paying), this method:
   * 1. Updates policy status to 'lapsed'
   * 2. Database trigger automatically calculates chargeback
   * 3. Commission status updated to 'charged_back' with chargeback amount
   *
   * @param policyId - Policy ID to lapse
   * @param lapseDate - Date when policy lapsed (defaults to today)
   * @param reason - Optional reason for lapse
   * @returns Updated policy and chargeback details
   */
  async lapsePolicy(
    policyId: string,
    lapseDate: Date = new Date(),
    reason?: string
  ): Promise<{
    policy: Policy;
    chargeback: {
      amount: number;
      monthsPaid: number;
      reason: string;
    };
  }> {
    try {
      // Validate policy exists
      const policy = await this.repository.findById(policyId);
      if (!policy) {
        throw new NotFoundError('Policy', policyId);
      }

      // Validate policy is not already lapsed or cancelled
      if (policy.status === 'cancelled' || policy.status === 'lapsed') {
        throw new ValidationError('Policy is already cancelled or lapsed', [
          { field: 'status', message: 'Cannot lapse an already cancelled/lapsed policy', value: policy.status }
        ]);
      }

      // Update policy status to 'lapsed'
      // Database trigger will automatically calculate chargeback
      const lapseNote = reason
        ? `Lapsed: ${reason} (${lapseDate.toISOString().split('T')[0]})`
        : `Lapsed on ${lapseDate.toISOString().split('T')[0]} - client stopped paying`;

      const { data: updated, error: updateError } = await supabase
        .from('policies')
        .update({
          status: 'lapsed',
          notes: policy.notes
            ? `${policy.notes}\n\n${lapseNote}`
            : lapseNote,
          updated_at: new Date().toISOString()
        })
        .eq('id', policyId)
        .select()
        .single();

      if (updateError) {
        throw new DatabaseError('lapsePolicy', updateError);
      }

      // Get updated commission with chargeback details
      const { data: commission, error: commissionError } = await supabase
        .from('commissions')
        .select('chargeback_amount, chargeback_reason, months_paid')
        .eq('policy_id', policyId)
        .single();

      if (commissionError) {
        logger.warn('PolicyService.lapsePolicy', 'Could not fetch chargeback details', {
          policyId,
          error: commissionError
        });
      }

      logger.info('PolicyService', 'Policy lapsed', {
        policyId,
        lapseDate,
        chargebackAmount: commission?.chargeback_amount || 0
      });

      // Transform and return
      const updatedPolicy = this.repository['transformFromDB'](updated);

      return {
        policy: updatedPolicy,
        chargeback: {
          amount: parseFloat(commission?.chargeback_amount || '0'),
          monthsPaid: commission?.months_paid || 0,
          reason: commission?.chargeback_reason || 'Policy lapsed'
        }
      };
    } catch (error) {
      logger.error('PolicyService.lapsePolicy', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Reinstate a cancelled or lapsed policy
   *
   * When a policy is reinstated after cancellation/lapse:
   * 1. Updates policy status to 'active'
   * 2. Reverses the chargeback on associated commission
   * 3. Commission status restored to 'earned'
   *
   * @param policyId - Policy ID to reinstate
   * @param reason - Reason for reinstatement (required)
   * @returns Updated policy
   */
  async reinstatePolicy(
    policyId: string,
    reason: string
  ): Promise<Policy> {
    try {
      // Validate reason
      if (!reason || reason.trim().length === 0) {
        throw new ValidationError('Reinstatement reason is required', [
          { field: 'reason', message: 'Reason cannot be empty', value: reason }
        ]);
      }

      // Validate policy exists
      const policy = await this.repository.findById(policyId);
      if (!policy) {
        throw new NotFoundError('Policy', policyId);
      }

      // Validate policy is cancelled or lapsed
      if (policy.status !== 'cancelled' && policy.status !== 'lapsed') {
        throw new ValidationError('Policy must be cancelled or lapsed to reinstate', [
          { field: 'status', message: 'Can only reinstate cancelled/lapsed policies', value: policy.status }
        ]);
      }

      // Get commission to reverse chargeback
      const { data: commission, error: commissionError } = await supabase
        .from('commissions')
        .select('id')
        .eq('policy_id', policyId)
        .single();

      // Reverse chargeback if commission exists
      if (commission && !commissionError) {
        await commissionStatusService.reverseChargeback(commission.id);
      }

      // Update policy status to 'active'
      const { data: updated, error: updateError } = await supabase
        .from('policies')
        .update({
          status: 'active',
          notes: policy.notes
            ? `${policy.notes}\n\nReinstated: ${reason} (${new Date().toISOString().split('T')[0]})`
            : `Reinstated: ${reason} (${new Date().toISOString().split('T')[0]})`,
          updated_at: new Date().toISOString()
        })
        .eq('id', policyId)
        .select()
        .single();

      if (updateError) {
        throw new DatabaseError('reinstatePolicy', updateError);
      }

      logger.info('PolicyService', 'Policy reinstated', {
        policyId,
        reason
      });

      // Transform and return
      return this.repository['transformFromDB'](updated);
    } catch (error) {
      logger.error('PolicyService.reinstatePolicy', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

export { PolicyService };
export const policyService = new PolicyService();
