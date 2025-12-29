import {
  Policy,
  PolicyFilters,
  CreatePolicyData,
} from "../../types/policy.types";
import { PolicyRepository } from "./PolicyRepository";
import { supabase } from "../base/supabase";
import { logger } from "../base/logger";
import { formatDateForDB } from "../../lib/date";
import { commissionStatusService } from "../commissions/CommissionStatusService";
import { commissionService } from "../commissions/commissionService";
import {
  DatabaseError,
  NotFoundError,
  ValidationError,
} from "../../errors/ServiceErrors";
import {
  workflowEventEmitter,
  WORKFLOW_EVENTS,
} from "../events/workflowEventEmitter";

/**
 * Get the current authenticated user's ID
 * CRITICAL: Used to filter policies to only the current user's data
 */
async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user.id;
}

/**
 * Service layer for policies - handles business logic
 * Uses PolicyRepository for all data access
 */
class PolicyService {
  private repository = new PolicyRepository();

  /**
   * Get all policies ordered by creation date
   * CRITICAL: Filters to only current user's policies
   */
  async getAll(): Promise<Policy[]> {
    const userId = await getCurrentUserId();
    return this.repository.findAll({ userId: userId || undefined });
  }

  /**
   * Get a single policy by ID
   */
  async getById(id: string): Promise<Policy | null> {
    return this.repository.findById(id);
  }

  /**
   * Create a new policy and its associated commission record.
   */
  async create(policyData: CreatePolicyData): Promise<Policy> {
    // Create policy record
    const policy = await this.repository.create(policyData);

    // Create commission record for this policy
    try {
      // Extract client info for commission record
      const clientInfo = policy.client
        ? {
            firstName: policy.client.name?.split(" ")[0] || "Unknown",
            lastName: policy.client.name?.split(" ").slice(1).join(" ") || "",
            email: policy.client.email,
            phone: policy.client.phone,
            state: policy.client.state,
          }
        : {
            firstName: "Unknown",
            lastName: "Client",
          };

      // DO NOT pass commissionRate - it MUST be looked up from comp_guide
      // using the user's contract_level, not the policy's stored percentage
      await commissionService.createWithAutoCalculation({
        policyId: policy.id,
        userId: policy.userId,
        carrierId: policy.carrierId,
        product: policy.product,
        client: clientInfo,
        calculationBasis: "annual_premium",
        annualPremium: policy.annualPremium,
        monthlyPremium: policy.monthlyPremium,
        // commissionRate intentionally NOT passed - must come from comp_guide lookup
        advanceMonths: 9, // Standard advance period
        status: "pending",
        type: "advance",
        isAutoCalculated: true,
      });
      console.log(`Commission created for policy ${policy.id}`);
    } catch (error) {
      // Log but don't fail policy creation if commission creation fails
      console.error("Failed to create commission for policy:", error);
      logger.error(
        "PolicyService.create",
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    // Emit policy created event
    const clientName =
      "client" in policy && policy.client
        ? "firstName" in policy.client
          ? `${policy.client.firstName} ${policy.client.lastName}`
          : policy.client.name
        : "Unknown Client";

    await workflowEventEmitter.emit(WORKFLOW_EVENTS.POLICY_CREATED, {
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      carrierId: policy.carrierId,
      productId: policy.productId,
      agentId: policy.userId,
      clientName,
      premium: policy.annualPremium,
      status: policy.status,
      effectiveDate: policy.effectiveDate,
      createdAt: new Date().toISOString(),
    });

    return policy;
  }

  /**
   * Update an existing policy
   */
  async update(
    id: string,
    updates: Partial<CreatePolicyData>,
  ): Promise<Policy> {
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
   * CRITICAL: Filters to only current user's policies
   * Note: For simple filters, prefer using this method for server-side filtering
   * For complex client-side operations, use hooks with client-side filtering
   */
  async getFiltered(filters: PolicyFilters): Promise<Policy[]> {
    // Get current user ID to filter policies
    const userId = await getCurrentUserId();

    // Build filtered query - delegate to repository for complex filters
    // Pass userId to ensure we only get current user's policies
    const allPolicies = await this.repository.findAll({
      userId: userId || undefined,
    });

    return allPolicies.filter((policy) => {
      if (filters.status && policy.status !== filters.status) return false;
      if (filters.carrierId && policy.carrierId !== filters.carrierId)
        return false;
      if (filters.product && policy.product !== filters.product) return false;
      if (filters.startDate) {
        const policyDate = policy.effectiveDate; // Already in YYYY-MM-DD format
        const startDateString = formatDateForDB(filters.startDate);
        if (policyDate < startDateString) return false;
      }
      if (filters.endDate) {
        const policyDate = policy.effectiveDate; // Already in YYYY-MM-DD format
        const endDateString = formatDateForDB(filters.endDate);
        if (policyDate > endDateString) return false;
      }
      if (filters.minPremium && policy.annualPremium < filters.minPremium)
        return false;
      if (filters.maxPremium && policy.annualPremium > filters.maxPremium)
        return false;
      return true;
    });
  }

  /**
   * Get paginated policies with filters and sorting
   * CRITICAL: Filters to only current user's policies
   * @param page - Current page number (1-based)
   * @param pageSize - Number of items per page
   * @param filters - Optional filters to apply
   * @param sortConfig - Optional sorting configuration
   * @returns Array of policies for the current page
   */
  async getPaginated(
    page: number,
    pageSize: number,
    filters?: PolicyFilters,
    sortConfig?: { field: string; direction: "asc" | "desc" },
  ): Promise<Policy[]> {
    // Get current user ID to filter policies
    const userId = await getCurrentUserId();

    // Convert PolicyFilters to repository filter format
    const repoFilters = filters
      ? {
          status: filters.status,
          carrierId: filters.carrierId,
          product: filters.product,
          effectiveDateFrom: filters.effectiveDateFrom,
          effectiveDateTo: filters.effectiveDateTo,
          searchTerm: filters.searchTerm,
        }
      : undefined;

    const options = {
      page,
      pageSize,
      orderBy: sortConfig?.field || "created_at",
      orderDirection: sortConfig?.direction || ("desc" as const),
      userId: userId || undefined, // CRITICAL: Filter to current user's policies
    };

    return this.repository.findAll(options, repoFilters);
  }

  /**
   * Get count of policies matching filters
   * CRITICAL: Filters to only current user's policies
   * @param filters - Optional filters to apply
   * @returns Total count of matching policies
   */
  async getCount(filters?: PolicyFilters): Promise<number> {
    // Get current user ID to filter policies
    const userId = await getCurrentUserId();

    // Convert PolicyFilters to repository filter format
    const repoFilters = filters
      ? {
          status: filters.status,
          carrierId: filters.carrierId,
          product: filters.product,
          effectiveDateFrom: filters.effectiveDateFrom,
          effectiveDateTo: filters.effectiveDateTo,
          searchTerm: filters.searchTerm,
        }
      : undefined;

    return this.repository.countPolicies(repoFilters, userId || undefined);
  }

  /**
   * Get aggregate metrics for policies matching filters
   * CRITICAL: Filters to only current user's policies
   * Returns totals across ALL matching policies (not just current page)
   * @param filters - Optional filters to apply
   * @returns Aggregate metrics including counts, premiums, and YTD data
   */
  async getAggregateMetrics(filters?: PolicyFilters): Promise<{
    totalPolicies: number;
    activePolicies: number;
    pendingPolicies: number;
    lapsedPolicies: number;
    cancelledPolicies: number;
    totalPremium: number;
    avgPremium: number;
    ytdPolicies: number;
    ytdPremium: number;
  }> {
    // Get current user ID to filter policies
    const userId = await getCurrentUserId();

    // Convert PolicyFilters to repository filter format
    const repoFilters = filters
      ? {
          status: filters.status,
          carrierId: filters.carrierId,
          product: filters.product,
          effectiveDateFrom: filters.effectiveDateFrom,
          effectiveDateTo: filters.effectiveDateTo,
          searchTerm: filters.searchTerm,
        }
      : undefined;

    return this.repository.getAggregateMetrics(
      repoFilters,
      userId || undefined,
    );
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
    cancelDate: Date = new Date(),
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
        throw new ValidationError("Cancellation reason is required", [
          { field: "reason", message: "Reason cannot be empty", value: reason },
        ]);
      }

      // Validate policy exists
      const policy = await this.repository.findById(policyId);
      if (!policy) {
        throw new NotFoundError("Policy", policyId);
      }

      // Validate policy is not already cancelled
      if (policy.status === "cancelled" || policy.status === "lapsed") {
        throw new ValidationError("Policy is already cancelled or lapsed", [
          {
            field: "status",
            message: "Cannot cancel an already cancelled/lapsed policy",
            value: policy.status,
          },
        ]);
      }

      // Update policy status to 'cancelled'
      // Database trigger will automatically calculate chargeback
      const { data: updated, error: updateError } = await supabase
        .from("policies")
        .update({
          status: "cancelled",
          notes: policy.notes
            ? `${policy.notes}\n\nCancelled: ${reason} (${cancelDate.toISOString().split("T")[0]})`
            : `Cancelled: ${reason} (${cancelDate.toISOString().split("T")[0]})`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", policyId)
        .select()
        .single();

      if (updateError) {
        throw new DatabaseError("cancelPolicy", updateError);
      }

      // Get updated commission with chargeback details
      const { data: commission, error: commissionError } = await supabase
        .from("commissions")
        .select("chargeback_amount, chargeback_reason, months_paid")
        .eq("policy_id", policyId)
        .single();

      if (commissionError) {
        logger.warn(
          "Could not fetch chargeback details",
          {
            policyId,
            error: commissionError,
          },
          "PolicyService.cancelPolicy",
        );
      }

      logger.info(
        "Policy cancelled",
        {
          policyId,
          reason,
          chargebackAmount: commission?.chargeback_amount || 0,
        },
        "PolicyService",
      );

      // Transform and return
      const updatedPolicy = this.repository["transformFromDB"](updated);

      // Emit policy cancelled event
      await workflowEventEmitter.emit(WORKFLOW_EVENTS.POLICY_CANCELLED, {
        policyId: updatedPolicy.id,
        policyNumber: updatedPolicy.policyNumber,
        agentId: updatedPolicy.userId,
        reason,
        cancelDate: cancelDate.toISOString(),
        chargebackAmount: parseFloat(commission?.chargeback_amount || "0"),
        timestamp: new Date().toISOString(),
      });

      return {
        policy: updatedPolicy,
        chargeback: {
          amount: parseFloat(commission?.chargeback_amount || "0"),
          monthsPaid: commission?.months_paid || 0,
          reason: commission?.chargeback_reason || reason,
        },
      };
    } catch (error) {
      logger.error(
        "PolicyService.cancelPolicy",
        error instanceof Error ? error : new Error(String(error)),
      );
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
    reason?: string,
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
        throw new NotFoundError("Policy", policyId);
      }

      // Validate policy is not already lapsed or cancelled
      if (policy.status === "cancelled" || policy.status === "lapsed") {
        throw new ValidationError("Policy is already cancelled or lapsed", [
          {
            field: "status",
            message: "Cannot lapse an already cancelled/lapsed policy",
            value: policy.status,
          },
        ]);
      }

      // Update policy status to 'lapsed'
      // Database trigger will automatically calculate chargeback
      const lapseNote = reason
        ? `Lapsed: ${reason} (${lapseDate.toISOString().split("T")[0]})`
        : `Lapsed on ${lapseDate.toISOString().split("T")[0]} - client stopped paying`;

      const { data: updated, error: updateError } = await supabase
        .from("policies")
        .update({
          status: "lapsed",
          notes: policy.notes ? `${policy.notes}\n\n${lapseNote}` : lapseNote,
          updated_at: new Date().toISOString(),
        })
        .eq("id", policyId)
        .select()
        .single();

      if (updateError) {
        throw new DatabaseError("lapsePolicy", updateError);
      }

      // Get updated commission with chargeback details
      const { data: commission, error: commissionError } = await supabase
        .from("commissions")
        .select("chargeback_amount, chargeback_reason, months_paid")
        .eq("policy_id", policyId)
        .single();

      if (commissionError) {
        logger.warn(
          "Could not fetch chargeback details",
          {
            policyId,
            error: commissionError,
          },
          "PolicyService.lapsePolicy",
        );
      }

      logger.info(
        "Policy lapsed",
        {
          policyId,
          lapseDate,
          chargebackAmount: commission?.chargeback_amount || 0,
        },
        "PolicyService",
      );

      // Transform and return
      const updatedPolicy = this.repository["transformFromDB"](updated);

      return {
        policy: updatedPolicy,
        chargeback: {
          amount: parseFloat(commission?.chargeback_amount || "0"),
          monthsPaid: commission?.months_paid || 0,
          reason: commission?.chargeback_reason || "Policy lapsed",
        },
      };
    } catch (error) {
      logger.error(
        "PolicyService.lapsePolicy",
        error instanceof Error ? error : new Error(String(error)),
      );
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
  async reinstatePolicy(policyId: string, reason: string): Promise<Policy> {
    try {
      // Validate reason
      if (!reason || reason.trim().length === 0) {
        throw new ValidationError("Reinstatement reason is required", [
          { field: "reason", message: "Reason cannot be empty", value: reason },
        ]);
      }

      // Validate policy exists
      const policy = await this.repository.findById(policyId);
      if (!policy) {
        throw new NotFoundError("Policy", policyId);
      }

      // Validate policy is cancelled or lapsed
      if (policy.status !== "cancelled" && policy.status !== "lapsed") {
        throw new ValidationError(
          "Policy must be cancelled or lapsed to reinstate",
          [
            {
              field: "status",
              message: "Can only reinstate cancelled/lapsed policies",
              value: policy.status,
            },
          ],
        );
      }

      // Get commission to reverse chargeback
      const { data: commission, error: commissionError } = await supabase
        .from("commissions")
        .select("id")
        .eq("policy_id", policyId)
        .single();

      // Reverse chargeback if commission exists
      if (commission && !commissionError) {
        await commissionStatusService.reverseChargeback(commission.id);
      }

      // Update policy status to 'active'
      const { data: updated, error: updateError } = await supabase
        .from("policies")
        .update({
          status: "active",
          notes: policy.notes
            ? `${policy.notes}\n\nReinstated: ${reason} (${new Date().toISOString().split("T")[0]})`
            : `Reinstated: ${reason} (${new Date().toISOString().split("T")[0]})`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", policyId)
        .select()
        .single();

      if (updateError) {
        throw new DatabaseError("reinstatePolicy", updateError);
      }

      logger.info(
        "Policy reinstated",
        {
          policyId,
          reason,
        },
        "PolicyService",
      );

      // Transform and return
      const reinstatedPolicy = this.repository["transformFromDB"](updated);

      // Emit policy renewed event (reinstatement is a form of renewal)
      await workflowEventEmitter.emit(WORKFLOW_EVENTS.POLICY_RENEWED, {
        policyId: reinstatedPolicy.id,
        policyNumber: reinstatedPolicy.policyNumber,
        agentId: reinstatedPolicy.userId,
        reason,
        renewalDate: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      });

      return reinstatedPolicy;
    } catch (error) {
      logger.error(
        "PolicyService.reinstatePolicy",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
}

export { PolicyService };
export const policyService = new PolicyService();
