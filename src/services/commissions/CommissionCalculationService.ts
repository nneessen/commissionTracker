// src/services/commissions/CommissionCalculationService.ts
// Handles commission calculations using comp guide

import { Commission } from "../../types/commission.types";
import { logger } from "../base/logger";
import type { CreateCommissionData } from "./CommissionCRUDService";
import { commissionCRUDService } from "./CommissionCRUDService";
import { commissionLifecycleService } from "./CommissionLifecycleService";
import {
  CalculationError,
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
  // Capped advance fields (only populated when carrier has advance_cap)
  originalAdvance?: number | null;
  overageAmount?: number | null;
  overageStartMonth?: number | null;
  isCapped?: boolean;
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
    productId?: string; // Specific product ID for accurate comp_guide lookup
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

    const { compGuideService, userService, carrierService } =
      await import("../index");

    try {
      // Get carrier name for comp guide lookup (with retry)
      const carrierResult = await withRetry(
        () => carrierService.getById(data.carrierId),
        { maxAttempts: 2 },
      );

      if (!carrierResult.success || !carrierResult.data) {
        throw new NotFoundError("Carrier", data.carrierId);
      }
      const carrier = carrierResult.data;

      // Determine contract comp level
      let contractCompLevel = data.contractCompLevel;
      const userId = data.userId;
      if (!contractCompLevel && userId) {
        try {
          const user = await userService.getById(userId);
          if (user && user.contract_level !== null) {
            // Database returns snake_case: contract_level (not contractCompLevel)
            contractCompLevel = user.contract_level;
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
      // CRITICAL: Pass productId for accurate lookup when available
      const rateResult = await withRetry(
        () =>
          compGuideService.getCommissionRate(
            carrier.name,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB record has dynamic schema
            data.product as any, // Cast to any - product types match DB enum values
            contractCompLevel,
            data.productId, // Pass productId for accurate comp_guide lookup
          ),
        { maxAttempts: 3 },
      );

      if (rateResult.error || !rateResult.data) {
        // No comp_guide entry found - return null to allow fallback to manual calculation
        // This is a data configuration issue, not a code error
        logger.warn(
          "No comp_guide rate found for carrier/product/level combination",
          {
            carrierName: carrier.name,
            product: data.product,
            contractCompLevel,
          },
          "CommissionCalculationService",
        );
        return null;
      }

      // Calculate commission ADVANCE amount with carrier cap applied
      // BUSINESS RULE: Advance = Monthly Premium × Advance Months × Commission Rate
      // Some carriers have advance caps (e.g., Mutual of Omaha = $3,000)
      // When advance exceeds cap, overage is paid as-earned after recoupment
      const advanceMonths = data.advanceMonths || 9; // Industry standard
      // IMPORTANT: comp_guide stores rates as decimals (e.g., 0.95 = 95%, 1.1 = 110%)
      // Do NOT divide by 100 - the rate is already in the correct format
      const commissionRate = rateResult.data;

      // Use capped advance calculation (handles carrier advance caps)
      const cappedResult = commissionLifecycleService.calculateCappedAdvance({
        monthlyPremium: data.monthlyPremium,
        advanceMonths,
        commissionRate,
        advanceCap: carrier.advance_cap,
      });

      logger.info(
        "CommissionCalculation",
        "Advance calculated using comp guide",
        JSON.stringify({
          monthlyPremium: data.monthlyPremium,
          advanceMonths,
          commissionRate,
          advanceAmount: cappedResult.advanceAmount,
          originalAdvance: cappedResult.originalAdvance,
          isCapped: cappedResult.isCapped,
          overageAmount: cappedResult.overageAmount,
          overageStartMonth: cappedResult.overageStartMonth,
          carrierAdvanceCap: carrier.advance_cap,
        }),
      );

      return {
        advanceAmount: cappedResult.advanceAmount, // This is the ADVANCE (capped if applicable)
        commissionRate,
        compGuidePercentage: commissionRate,
        isAutoCalculated: true,
        contractCompLevel,
        // Capped advance fields
        originalAdvance: cappedResult.isCapped
          ? cappedResult.originalAdvance
          : null,
        overageAmount: cappedResult.isCapped
          ? cappedResult.overageAmount
          : null,
        overageStartMonth: cappedResult.isCapped
          ? cappedResult.overageStartMonth
          : null,
        isCapped: cappedResult.isCapped,
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
          productId: commissionData.productId, // CRITICAL: Pass productId for accurate lookup
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
            // Capped advance fields (only populated when carrier has advance_cap)
            originalAdvance: calculation.originalAdvance,
            overageAmount: calculation.overageAmount,
            overageStartMonth: calculation.overageStartMonth,
          };
        } else {
          // CRITICAL: comp_guide lookup failed - DO NOT fall back to a wrong rate
          // This means there's no comp_guide entry for this carrier/product/contract_level combination
          throw new CalculationError(
            "Commission",
            "No comp_guide entry found for this carrier/product/contract_level combination. " +
              "Please add a comp_guide entry before creating policies.",
            {
              carrierId: commissionData.carrierId,
              product: commissionData.product,
              userId: commissionData.userId,
            },
          );
        }
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
   * Recalculates commission for a policy when its premium, carrier, or product changes
   *
   * @param policyId - The ID of the policy whose commission needs recalculation
   * @param newAnnualPremium - The updated annual premium amount
   * @param newMonthlyPremium - The updated monthly premium amount (optional)
   * @param fullRecalculate - When true, re-fetches rate from comp_guide (for carrier/product changes)
   * @returns Updated commission or null if no commission found
   *
   * @example
   * ```ts
   * // After updating a policy's premium only
   * await recalculateCommissionByPolicyId('policy-123', 2400, 200, false);
   *
   * // After updating a policy's carrier or product
   * await recalculateCommissionByPolicyId('policy-123', 2400, 200, true);
   * ```
   */
  async recalculateCommissionByPolicyId(
    policyId: string,
    newAnnualPremium: number,
    newMonthlyPremium?: number,
    fullRecalculate?: boolean,
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

      // Get the active commission (not cancelled/chargedback) - prioritize by status then amount
      const isActiveStatus = (status: string) =>
        status !== "cancelled" && status !== "chargedback";

      // Sort: active statuses first, then by amount descending
      const sortedCommissions = [...commissions].sort((a, b) => {
        const aActive = isActiveStatus(a.status);
        const bActive = isActiveStatus(b.status);
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        return (b.amount || 0) - (a.amount || 0);
      });

      const commission = sortedCommissions[0];
      const advanceMonths = commission.advanceMonths || 9;

      // IMPORTANT: The commission DB table doesn't store carrier_id, product, commission_rate
      // These fields only exist in the TypeScript interface, not in the actual database
      // We MUST get this data from the policy
      const { policyService } = await import("../index");
      const policy = await policyService.getById(policyId);

      if (!policy) {
        throw new Error(`Policy not found: ${policyId}`);
      }

      const monthlyPremium = newMonthlyPremium || newAnnualPremium / 12;

      // Variables to hold calculated values
      let advanceAmount: number;
      let commissionRate: number;
      let originalAdvance: number | null = null;
      let overageAmount: number | null = null;
      let overageStartMonth: number | null = null;

      if (fullRecalculate) {
        // Full recalculation: re-fetch rate from comp_guide
        // This is used when carrier or product changes
        logger.info(
          "CommissionCalculation",
          "Full recalculation - fetching rate from comp_guide",
          JSON.stringify({
            policyId,
            carrierId: policy.carrierId,
            product: policy.product,
          }),
        );

        const calculation = await this.calculateCommissionWithCompGuide({
          carrierId: policy.carrierId,
          productId: policy.productId,
          product: policy.product,
          monthlyPremium,
          userId: policy.userId,
          advanceMonths,
        });

        if (calculation) {
          advanceAmount = calculation.advanceAmount;
          commissionRate = calculation.commissionRate;
          originalAdvance = calculation.originalAdvance ?? null;
          overageAmount = calculation.overageAmount ?? null;
          overageStartMonth = calculation.overageStartMonth ?? null;
        } else {
          throw new CalculationError(
            "Commission",
            "No comp_guide entry found for carrier/product/contract_level combination during recalculation",
            {
              policyId,
              carrierId: policy.carrierId,
              product: policy.product,
            },
          );
        }
      } else {
        // Simple premium change - use existing rate from policy with carrier cap
        commissionRate = policy.commissionPercentage;

        // Get carrier to check for advance cap
        const { carrierService } = await import("../index");
        const carrierResult = await carrierService.getById(policy.carrierId);
        const advanceCap = carrierResult.success
          ? carrierResult.data?.advance_cap
          : undefined;

        // Apply carrier cap if applicable
        const cappedResult = commissionLifecycleService.calculateCappedAdvance({
          monthlyPremium,
          advanceMonths,
          commissionRate,
          advanceCap: advanceCap ?? undefined,
        });

        advanceAmount = cappedResult.advanceAmount;
        if (cappedResult.isCapped) {
          originalAdvance = cappedResult.originalAdvance;
          overageAmount = cappedResult.overageAmount;
          overageStartMonth = cappedResult.overageStartMonth;
        }
      }

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
          newAmount: advanceAmount,
          fullRecalculate,
          isCapped: originalAdvance !== null,
        }),
      );

      // Update the commission with new calculated values
      const updatedCommission = await commissionCRUDService.update(
        commission.id,
        {
          amount: advanceAmount,
          originalAdvance,
          overageAmount,
          overageStartMonth,
        },
      );

      logger.info(
        "CommissionCalculation",
        "Commission recalculated for policy",
        JSON.stringify({
          policyId,
          commissionId: commission.id,
          oldAmount: commission.amount,
          newAmount: updatedCommission.amount,
          fullRecalculate,
        }),
      );

      return updatedCommission;
    } catch (error) {
      throw this.handleError(error, "recalculateCommissionByPolicyId");
    }
  }
}

export const commissionCalculationService = new CommissionCalculationService();
