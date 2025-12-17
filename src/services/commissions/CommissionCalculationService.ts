// src/services/commissions/CommissionCalculationService.ts
// Handles commission calculations using comp guide

import { Commission } from "../../types/commission.types";
import { logger } from "../base/logger";
import type { CreateCommissionData } from "./CommissionCRUDService";
import { commissionCRUDService } from "./CommissionCRUDService";
import {
  CalculationError,
  ExternalServiceError,
  NotFoundError,
  ValidationError,
  getErrorMessage,
} from "../../errors/ServiceErrors";
import { withRetry } from "../../utils/retry";

export interface CalculationResult {
  advanceAmount: number; // Changed from commissionAmount for clarity
  commissionRate: number;
  compGuidePercentage: number;
  isAutoCalculated: boolean;
  contractCompLevel: number;
}

class CommissionCalculationService {
  /**
   * Handles and transforms errors into structured ServiceError types
   *
   * @param error - The error to handle
   * @param context - The context/method where the error occurred
   * @param details - Optional additional error details
   * @throws {CalculationError | ValidationError | NotFoundError} Structured error based on error type
   *
   * @private
   */
  private handleError(
    error: unknown,
    context: string,
    details?: Record<string, unknown>,
  ): never {
    const message = getErrorMessage(error);
    logger.error(
      `CommissionCalculationService.${context}`,
      error instanceof Error ? error : new Error(String(error)),
    );

    // Re-throw structured errors
    if (
      error instanceof CalculationError ||
      error instanceof ValidationError ||
      error instanceof NotFoundError
    ) {
      throw error;
    }

    // Wrap in appropriate error type
    throw new CalculationError("Commission", message, details);
  }

  /**
   * Calculates commission amount and rate using the compensation guide
   *
   * @param data - Calculation input parameters
   * @param data.carrierId - The insurance carrier's unique identifier
   * @param data.product - The insurance product type
   * @param data.monthlyPremium - Monthly premium amount (must be > 0)
   * @param data.userId - Optional user ID to determine contract comp level
   * @param data.contractCompLevel - Optional explicit contract comp level
   * @param data.advanceMonths - Optional number of advance months
   * @returns Promise resolving to calculation result or null if comp guide data not found
   * @throws {ValidationError} If required parameters are missing or invalid
   * @throws {NotFoundError} If carrier or user is not found
   * @throws {ExternalServiceError} If comp guide service fails
   * @throws {CalculationError} If calculation cannot be completed
   *
   * @example
   * ```ts
   * const result = await commissionCalculationService.calculateCommissionWithCompGuide({
   *   carrierId: 'carrier-123',
   *   product: 'whole_life',
   *   monthlyPremium: 500,
   *   userId: 'user-456',
   *   advanceMonths: 9
   * });
   * if (result) {
   *   console.log(`Advance: $${result.advanceAmount} at ${result.commissionRate}%`);
   * }
   * ```
   */
  async calculateCommissionWithCompGuide(data: {
    carrierId: string;
    product: string;
    monthlyPremium: number;
    userId?: string;
    contractCompLevel?: number;
    advanceMonths?: number;
  }): Promise<CalculationResult | null> {
    // Validation
    if (!data.carrierId) {
      throw new ValidationError("Missing calculation parameters", [
        { field: "carrierId", message: "Carrier ID is required" },
      ]);
    }
    if (!data.product) {
      throw new ValidationError("Missing calculation parameters", [
        { field: "product", message: "Product is required" },
      ]);
    }
    if (!data.monthlyPremium || data.monthlyPremium <= 0) {
      throw new ValidationError("Invalid calculation parameters", [
        {
          field: "monthlyPremium",
          message: "Monthly premium must be greater than 0",
          value: data.monthlyPremium,
        },
      ]);
    }

    const { compGuideService, agentService, carrierService } =
      await import("../index");

    try {
      // Get carrier name for comp guide lookup (with retry)
      const { data: carrier, error: carrierError } = await withRetry(
        () => carrierService.getCarrierById(data.carrierId),
        { maxAttempts: 2 },
      );

      if (carrierError || !carrier) {
        throw new NotFoundError("Carrier", data.carrierId);
      }

      // Determine contract comp level
      let contractCompLevel = data.contractCompLevel;
      const userId = data.userId;
      if (!contractCompLevel && userId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase response type
          const user = await (agentService as any).getAgentById(userId);
          if (user) {
            contractCompLevel = user.contractCompLevel;
          }
        } catch (error) {
          logger.warn(
            "Could not get user contract comp level",
            error instanceof Error ? error : String(error),
            "CommissionCalculationService",
          );
        }
      }

      if (!contractCompLevel) {
        throw new CalculationError(
          "Commission",
          "Contract comp level not found",
          {
            userId,
            carrierId: data.carrierId,
          },
        );
      }

      // Get commission percentage from comp guide (with retry for external service)
      // Note: product_type in comp_guide is an enum, so pass the raw product type directly
      const rateResult = await withRetry(
        () =>
          compGuideService.getCommissionRate(
            carrier.name,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB record has dynamic schema
            data.product as any, // Cast to any - product types match DB enum values
            contractCompLevel,
          ),
        { maxAttempts: 3 },
      );

      if (rateResult.error || !rateResult.data) {
        throw new ExternalServiceError(
          "CompGuideService",
          "getCommissionRate",
          new Error(rateResult.error?.message || "No rate data returned"),
        );
      }

      // Calculate commission ADVANCE amount
      // BUSINESS RULE: Advance = Monthly Premium × Advance Months × Commission Rate
      // This is the upfront payment, NOT annual commission
      // The advance is earned month-by-month as client pays
      const advanceMonths = data.advanceMonths || 9; // Industry standard
      const commissionRate = rateResult.data / 100; // Convert percentage to decimal

      const commissionCalculation = {
        amount: data.monthlyPremium * advanceMonths * commissionRate,
        rate: rateResult.data,
      };

      logger.info(
        "CommissionCalculation",
        "Advance calculated using comp guide",
        JSON.stringify({
          monthlyPremium: data.monthlyPremium,
          advanceMonths,
          commissionRate: rateResult.data,
          advanceAmount: commissionCalculation.amount,
        }),
      );

      return {
        advanceAmount: commissionCalculation.amount, // This is the ADVANCE
        commissionRate: commissionCalculation.rate,
        compGuidePercentage: commissionCalculation.rate,
        isAutoCalculated: true,
        contractCompLevel,
      };
    } catch (error) {
      if (
        error instanceof CalculationError ||
        error instanceof NotFoundError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      throw this.handleError(error, "calculateCommissionWithCompGuide", {
        carrierId: data.carrierId,
        product: data.product,
      });
    }
  }

  /**
   * Creates a new commission with automatic calculation using comp guide
   *
   * @param commissionData - The commission data to create
   * @returns Promise resolving to the newly created commission with calculated amounts
   * @throws {ValidationError} If required fields are missing or invalid
   * @throws {CalculationError} If calculation fails
   * @throws {DatabaseError} If database operation fails
   *
   * @example
   * ```ts
   * const commission = await commissionCalculationService.createWithAutoCalculation({
   *   client: { firstName: 'Jane', lastName: 'Smith' },
   *   carrierId: 'carrier-123',
   *   product: 'term',
   *   type: 'new_business',
   *   status: 'pending',
   *   calculationBasis: 'annual_premium',
   *   annualPremium: 2400,
   *   isAutoCalculated: true
   * });
   * ```
   */
  async createWithAutoCalculation(
    commissionData: CreateCommissionData,
  ): Promise<Commission> {
    try {
      let finalData = { ...commissionData };

      // Derive monthlyPremium from annualPremium if not provided
      if (!finalData.monthlyPremium && finalData.annualPremium) {
        finalData.monthlyPremium = finalData.annualPremium / 12;
      }

      // If auto-calculation is requested and we have the required data
      if (
        commissionData.isAutoCalculated !== false &&
        commissionData.carrierId &&
        commissionData.product &&
        finalData.monthlyPremium &&
        finalData.monthlyPremium > 0
      ) {
        const calculation = await this.calculateCommissionWithCompGuide({
          carrierId: commissionData.carrierId,
          product: commissionData.product,
          monthlyPremium: finalData.monthlyPremium,
          userId: commissionData.userId,
          contractCompLevel: commissionData.contractCompLevel,
          advanceMonths: commissionData.advanceMonths,
        });

        if (calculation) {
          finalData = {
            ...finalData,
            advanceAmount: calculation.advanceAmount,
            commissionRate: calculation.commissionRate,
            contractCompLevel: calculation.contractCompLevel,
            isAutoCalculated: calculation.isAutoCalculated,
            advanceMonths: commissionData.advanceMonths || 9,
          };
        } else {
          // Fall back to manual calculation if auto-calculation fails
          finalData.isAutoCalculated = false;
        }
      }

      // Ensure required fields are set
      // BUSINESS RULE: If advance amount not calculated, use the ONE formula
      // Advance = Monthly Premium × Advance Months × Commission Rate
      if (
        !finalData.advanceAmount &&
        finalData.monthlyPremium &&
        finalData.commissionRate
      ) {
        const advanceMonths = finalData.advanceMonths || 9;
        // commissionRate is already a percentage (e.g., 102.5), so divide by 100
        finalData.advanceAmount =
          finalData.monthlyPremium *
          advanceMonths *
          (finalData.commissionRate / 100);

        logger.info(
          "CommissionCalculation",
          "Advance calculated using fallback formula",
          JSON.stringify({
            monthlyPremium: finalData.monthlyPremium,
            advanceMonths,
            commissionRate: finalData.commissionRate,
            advanceAmount: finalData.advanceAmount,
          }),
        );
      }

      if (!finalData.advanceMonths) {
        finalData.advanceMonths = 9;
      }

      if (finalData.isAutoCalculated === undefined) {
        finalData.isAutoCalculated = false;
      }

      return commissionCRUDService.create(finalData);
    } catch (error) {
      throw this.handleError(error, "createWithAutoCalculation");
    }
  }

  /**
   * Recalculates an existing auto-calculated commission with updated parameters
   *
   * @param commissionId - The unique identifier of the commission to recalculate
   * @param newContractLevel - Optional new contract compensation level to apply
   * @returns Promise resolving to the updated commission with recalculated amounts
   * @throws {NotFoundError} If the commission does not exist
   * @throws {CalculationError} If the commission is not auto-calculated or recalculation fails
   *
   * @example
   * ```ts
   * const recalculated = await commissionCalculationService.recalculateCommission(
   *   '123e4567-e89b-12d3',
   *   85 // new contract level
   * );
   * ```
   */
  async recalculateCommission(
    commissionId: string,
    newContractLevel?: number,
  ): Promise<Commission> {
    try {
      const commission = await commissionCRUDService.getById(commissionId);
      if (!commission) {
        throw new Error("Commission not found");
      }

      if (!commission.isAutoCalculated) {
        throw new Error("Cannot recalculate manually entered commission");
      }

      const monthlyPremium =
        commission.monthlyPremium || commission.annualPremium / 12;

      const calculation = await this.calculateCommissionWithCompGuide({
        carrierId: commission.carrierId,
        product: commission.product,
        monthlyPremium: monthlyPremium,
        userId: commission.userId,
        contractCompLevel: newContractLevel || commission.contractCompLevel,
        advanceMonths: commission.advanceMonths,
      });

      if (!calculation) {
        throw new Error(
          "Unable to recalculate commission - comp guide data not found",
        );
      }

      return commissionCRUDService.update(commissionId, {
        advanceAmount: calculation.advanceAmount,
        commissionRate: calculation.commissionRate,
        contractCompLevel: calculation.contractCompLevel,
      });
    } catch (error) {
      throw this.handleError(error, "recalculateCommission");
    }
  }

  /**
   * Recalculates commission for a policy when its premium changes
   *
   * @param policyId - The ID of the policy whose commission needs recalculation
   * @param newAnnualPremium - The updated annual premium amount
   * @param newMonthlyPremium - The updated monthly premium amount (optional)
   * @returns Updated commission or null if no commission found
   *
   * @example
   * ```ts
   * // After updating a policy's premium
   * const updatedCommission = await recalculateCommissionByPolicyId(
   *   'policy-123',
   *   2400, // new annual premium
   *   200   // new monthly premium
   * );
   * ```
   */
  async recalculateCommissionByPolicyId(
    policyId: string,
    newAnnualPremium: number,
    newMonthlyPremium?: number,
  ): Promise<Commission | null> {
    try {
      // Get all commissions for this policy (should typically be one)
      const commissions = await commissionCRUDService.getByPolicyId(policyId);

      if (!commissions || commissions.length === 0) {
        logger.warn(
          "CommissionCalculation",
          "No commission found for policy",
          `policyId: ${policyId}`,
        );
        return null;
      }

      // Get the most recent commission (in case there are multiple)
      const commission = commissions[0];
      const advanceMonths = commission.advanceMonths || 9;

      // IMPORTANT: The commission DB table doesn't store carrier_id, product, commission_rate
      // These fields only exist in the TypeScript interface, not in the actual database
      // We MUST get this data from the policy
      const { policyService } = await import("../index");
      const policy = await policyService.getById(policyId);

      if (!policy) {
        throw new Error(`Policy not found: ${policyId}`);
      }

      // Calculate new advance using policy's commission_percentage
      // commission_percentage is stored as decimal (e.g., 1.1 = 110%)
      const monthlyPremium = newMonthlyPremium || newAnnualPremium / 12;
      const commissionRate = policy.commissionPercentage; // Already a decimal like 1.1 for 110%
      const newAdvanceAmount = monthlyPremium * advanceMonths * commissionRate;

      logger.info(
        "CommissionCalculation",
        "Recalculating commission",
        JSON.stringify({
          policyId,
          commissionId: commission.id,
          monthlyPremium,
          advanceMonths,
          commissionRate,
          oldAmount: commission.advanceAmount,
          newAmount: newAdvanceAmount,
        }),
      );

      // Update the commission with new calculated values
      // Note: We only update 'amount' field since that's what the DB has
      const updatedCommission = await commissionCRUDService.update(
        commission.id,
        {
          advanceAmount: newAdvanceAmount,
        },
      );

      logger.info(
        "CommissionCalculation",
        "Commission recalculated for policy",
        JSON.stringify({
          policyId,
          commissionId: commission.id,
          oldAmount: commission.advanceAmount,
          newAmount: updatedCommission.advanceAmount,
        }),
      );

      return updatedCommission;
    } catch (error) {
      throw this.handleError(error, "recalculateCommissionByPolicyId");
    }
  }
}

export const commissionCalculationService = new CommissionCalculationService();
