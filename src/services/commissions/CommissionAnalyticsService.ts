// src/services/commissions/CommissionAnalyticsService.ts
// Handles commission metrics, reporting, and chargeback analysis

import { Commission } from '../../types/commission.types';
import { supabase, TABLES } from '../base/supabase';
import { RISK_SCORE_WEIGHTS, CHARGEBACK_THRESHOLDS, RISK_LEVELS } from '../../constants/financial';
import { commissionCRUDService } from './CommissionCRUDService';
import { logger } from '../base/logger';

export interface ChargebackRisk {
  riskLevel: 'low' | 'medium' | 'high';
  monthsSincePaid: number;
  chargebackGracePeriod: number;
  hasActiveChargebacks: boolean;
  potentialChargebackAmount: number;
  riskFactors: string[];
}

export interface CommissionWithChargebackRisk {
  commission: Commission;
  chargeback_risk: ChargebackRisk;
  existing_chargebacks: any[];
}

export interface CommissionMetrics {
  totalCommissions: number;
  totalAmount: number;
  avgCommissionRate: number;
  autoCalculatedCount: number;
  manualCount: number;
}

export interface NetCommissionMetrics {
  totalCommissions: number;
  totalChargebacks: number;
  netIncome: number;
  chargebackRate: number;
  riskAdjustedProjection: number;
}

class CommissionAnalyticsService {
  /**
   * Handles errors by logging and re-throwing with context
   *
   * @param error - The error to handle
   * @param context - The context/method where the error occurred
   * @throws {Error} Re-throws the error with context information
   *
   * @private
   */
  private handleError(error: unknown, context: string): never {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`CommissionAnalyticsService.${context}`, error instanceof Error ? error : new Error(String(error)));
    throw new Error(`${context} failed: ${message}`);
  }

  /**
   * Retrieves aggregated commission metrics for analysis
   *
   * @param userId - Optional user ID to filter metrics by specific user
   * @param startDate - Optional start date to filter commissions
   * @param endDate - Optional end date to filter commissions
   * @returns Promise resolving to commission metrics including totals and averages
   * @throws {Error} If the database query fails
   *
   * @example
   * ```ts
   * const metrics = await commissionAnalyticsService.getCommissionMetrics(
   *   'user-123',
   *   new Date('2024-01-01'),
   *   new Date('2024-12-31')
   * );
   * console.log(`Total: $${metrics.totalAmount}, Avg Rate: ${metrics.avgCommissionRate}%`);
   * ```
   */
  async getCommissionMetrics(userId?: string, startDate?: Date, endDate?: Date): Promise<CommissionMetrics> {
    try {
      let query = supabase
        .from(TABLES.COMMISSIONS)
        .select('commission_amount, commission_rate, is_auto_calculated');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch commission metrics: ${error.message}`);
      }

      const metrics = {
        totalCommissions: data?.length || 0,
        totalAmount: 0,
        avgCommissionRate: 0,
        autoCalculatedCount: 0,
        manualCount: 0,
      };

      if (data && data.length > 0) {
        let totalRate = 0;

        data.forEach((commission) => {
          const amount = parseFloat(commission.commission_amount);
          const rate = parseFloat(commission.commission_rate);

          metrics.totalAmount += amount;
          totalRate += rate;

          if (commission.is_auto_calculated) {
            metrics.autoCalculatedCount++;
          } else {
            metrics.manualCount++;
          }
        });

        metrics.avgCommissionRate = totalRate / data.length;
      }

      return metrics;
    } catch (error) {
      throw this.handleError(error, 'getCommissionMetrics');
    }
  }

  /**
   * Calculates chargeback risk for a specific commission
   *
   * @param commissionId - The unique identifier of the commission
   * @returns Promise resolving to chargeback risk assessment
   * @throws {Error} If commission is not found or risk calculation fails
   *
   * @example
   * ```ts
   * const risk = await commissionAnalyticsService.getChargebackRisk('123e4567-e89b-12d3');
   * console.log(`Risk Level: ${risk.riskLevel}`);
   * console.log(`Factors: ${risk.riskFactors.join(', ')}`);
   * ```
   */
  async getChargebackRisk(commissionId: string): Promise<ChargebackRisk> {
    try {
      const commission = await commissionCRUDService.getById(commissionId);
      if (!commission) {
        throw new Error('Commission not found');
      }

      const { chargebackService } = await import('./index');

      // Use standard chargeback grace period (24 months)
      const chargebackGracePeriod = 24;

      // Calculate months since commission was paid
      const monthsSincePaid = commission.paidDate
        ? Math.floor((Date.now() - commission.paidDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
        : 0;

      // Check for existing chargebacks
      const existingChargebacks = await chargebackService.getByCommissionId(commission.id);
      const hasActiveChargebacks = existingChargebacks.some(cb =>
        cb.status === 'pending' || cb.status === 'disputed'
      );

      // Calculate risk factors
      const riskFactors: string[] = [];
      let riskScore = 0;

      // Time-based risk
      if (monthsSincePaid < 6) {
        riskFactors.push('Recent payment - higher lapse risk');
        riskScore += 3;
      } else if (monthsSincePaid < 12) {
        riskFactors.push('Within first year - moderate lapse risk');
        riskScore += 2;
      } else if (monthsSincePaid >= chargebackGracePeriod) {
        riskFactors.push('Beyond grace period - low risk');
        riskScore -= 2;
      }

      // Commission amount risk
      if ((commission.advanceAmount ?? 0) > 5000) {
        riskFactors.push('High commission amount');
        riskScore += 2;
      }

      // Existing chargeback risk
      if (hasActiveChargebacks) {
        riskFactors.push('Has active chargebacks');
        riskScore += 3;
      }

      // Auto-calculated vs manual commission risk
      if (!commission.isAutoCalculated) {
        riskFactors.push('Manually calculated commission');
        riskScore += 1;
      }

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high';
      if (riskScore <= 1) {
        riskLevel = 'low';
      } else if (riskScore <= 4) {
        riskLevel = 'medium';
      } else {
        riskLevel = 'high';
      }

      return {
        riskLevel,
        monthsSincePaid,
        chargebackGracePeriod,
        hasActiveChargebacks,
        potentialChargebackAmount: commission.advanceAmount ?? 0,
        riskFactors,
      };
    } catch (error) {
      throw this.handleError(error, 'getChargebackRisk');
    }
  }

  /**
   * Calculates chargeback risk for a commission using existing chargeback data
   *
   * @param commission - The commission to analyze
   * @param existingChargebacks - Array of existing chargeback records
   * @returns Chargeback risk assessment with score and factors
   *
   * @example
   * ```ts
   * const risk = commissionAnalyticsService.calculateChargebackRiskForCommission(
   *   commission,
   *   chargebacks
   * );
   * ```
   */
  calculateChargebackRiskForCommission(commission: Commission, existingChargebacks: any[]): ChargebackRisk {
    // Use standard chargeback grace period
    const chargebackGracePeriod = CHARGEBACK_THRESHOLDS.GRACE_PERIOD_MONTHS;

    // Calculate months since commission was paid
    const monthsSincePaid = commission.paidDate
      ? Math.floor((Date.now() - commission.paidDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 0;

    // Check for existing chargebacks
    const hasActiveChargebacks = existingChargebacks.some(cb =>
      cb.status === 'pending' || cb.status === 'disputed'
    );

    // Calculate risk factors
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Time-based risk
    if (monthsSincePaid < CHARGEBACK_THRESHOLDS.RECENT_PAYMENT_MONTHS) {
      riskFactors.push('Recent payment - higher lapse risk');
      riskScore += RISK_SCORE_WEIGHTS.RECENT_PAYMENT;
    } else if (monthsSincePaid < CHARGEBACK_THRESHOLDS.FIRST_YEAR_MONTHS) {
      riskFactors.push('Within first year - moderate lapse risk');
      riskScore += RISK_SCORE_WEIGHTS.FIRST_YEAR_PAYMENT;
    } else if (monthsSincePaid >= chargebackGracePeriod) {
      riskFactors.push('Beyond grace period - low risk');
      riskScore -= 2;
    }

    // Commission amount risk
    if ((commission.advanceAmount ?? 0) > CHARGEBACK_THRESHOLDS.HIGH_COMMISSION_AMOUNT) {
      riskFactors.push('High commission amount');
      riskScore += RISK_SCORE_WEIGHTS.HIGH_COMMISSION_AMOUNT;
    }

    // Existing chargeback risk
    if (hasActiveChargebacks) {
      riskFactors.push('Has active chargebacks');
      riskScore += RISK_SCORE_WEIGHTS.ACTIVE_CHARGEBACK;
    }

    // Auto-calculated vs manual commission risk
    if (!commission.isAutoCalculated) {
      riskFactors.push('Manually calculated commission');
      riskScore += RISK_SCORE_WEIGHTS.MANUAL_CALCULATION;
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (riskScore <= RISK_LEVELS.LOW_THRESHOLD) {
      riskLevel = 'low';
    } else if (riskScore <= RISK_LEVELS.MEDIUM_THRESHOLD) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    return {
      riskLevel,
      monthsSincePaid,
      chargebackGracePeriod,
      hasActiveChargebacks,
      potentialChargebackAmount: commission.advanceAmount ?? 0,
      riskFactors,
    };
  }

  /**
   * Creates a chargeback record associated with a commission
   *
   * @param commissionId - The unique identifier of the commission
   * @param chargebackData - Chargeback details
   * @param chargebackData.chargebackType - Type of chargeback (policy_lapse, refund, cancellation)
   * @param chargebackData.chargebackAmount - Optional chargeback amount (defaults to commission amount)
   * @param chargebackData.chargebackReason - Optional reason for the chargeback
   * @param chargebackData.policyLapseDate - Optional date the policy lapsed
   * @param chargebackData.chargebackDate - Date the chargeback occurred
   * @returns Promise resolving to the created chargeback record
   * @throws {Error} If commission is not found or chargeback creation fails
   *
   * @example
   * ```ts
   * const chargeback = await commissionAnalyticsService.createChargebackForCommission(
   *   '123e4567-e89b-12d3',
   *   {
   *     chargebackType: 'policy_lapse',
   *     chargebackReason: 'Client stopped payments',
   *     chargebackDate: new Date(),
   *     policyLapseDate: new Date('2024-06-15')
   *   }
   * );
   * ```
   */
  async createChargebackForCommission(
    commissionId: string,
    chargebackData: {
      chargebackType: 'policy_lapse' | 'refund' | 'cancellation';
      chargebackAmount?: number;
      chargebackReason?: string;
      policyLapseDate?: Date;
      chargebackDate: Date;
    }
  ): Promise<any> {
    try {
      const commission = await commissionCRUDService.getById(commissionId);
      if (!commission) {
        throw new Error('Commission not found');
      }

      const { chargebackService } = await import('./index');

      return chargebackService.create({
        policyId: commission.policyId || '',
        commissionId: commission.id,
        userId: commission.userId,
        chargebackType: chargebackData.chargebackType,
        chargebackAmount: chargebackData.chargebackAmount || commission.advanceAmount || 0,
        chargebackReason: chargebackData.chargebackReason,
        policyLapseDate: chargebackData.policyLapseDate,
        chargebackDate: chargebackData.chargebackDate,
      });
    } catch (error) {
      throw this.handleError(error, 'createChargebackForCommission');
    }
  }

  /**
   * Retrieves all commissions with calculated chargeback risk assessments
   *
   * @param userId - Optional user ID to filter commissions by specific user
   * @returns Promise resolving to array of commissions with risk data and existing chargebacks
   * @throws {Error} If database query or risk calculation fails
   *
   * @example
   * ```ts
   * const commissionsWithRisk = await commissionAnalyticsService.getCommissionsWithChargebackRisk('user-123');
   * commissionsWithRisk.forEach(item => {
   *   console.log(`Commission ${item.commission.id}: ${item.chargeback_risk.riskLevel} risk`);
   * });
   * ```
   */
  async getCommissionsWithChargebackRisk(userId?: string): Promise<CommissionWithChargebackRisk[]> {
    try {
      // Fetch all commissions first
      const commissions = userId ? await commissionCRUDService.getCommissionsByUser(userId) : await commissionCRUDService.getAll();
      if (commissions.length === 0) return [];

      const { chargebackService } = await import('./index');
      const commissionIds = commissions.map(c => c.id);

      // Single query for all chargebacks
      const allChargebacks = await chargebackService.getByCommissionIds(commissionIds);

      // Group chargebacks by commission ID
      const chargebacksByCommissionId = allChargebacks.reduce((acc, cb) => {
        (acc[cb.commissionId] = acc[cb.commissionId] || []).push(cb);
        return acc;
      }, {} as Record<string, any[]>);

      // Calculate risk for each commission using the grouped data
      return commissions.map(commission => {
        const existingChargebacks = chargebacksByCommissionId[commission.id] || [];
        const chargebackRisk = this.calculateChargebackRiskForCommission(commission, existingChargebacks);
        return {
          commission,
          chargeback_risk: chargebackRisk,
          existing_chargebacks: existingChargebacks,
        };
      });
    } catch (error) {
      throw this.handleError(error, 'getCommissionsWithChargebackRisk');
    }
  }

  /**
   * Calculates net commission income after accounting for chargebacks
   *
   * @param userId - Optional user ID to filter calculations by specific user
   * @param startDate - Optional start date to filter commissions
   * @param endDate - Optional end date to filter commissions
   * @returns Promise resolving to net commission metrics including chargeback impact
   * @throws {Error} If metrics calculation fails
   *
   * @example
   * ```ts
   * const netMetrics = await commissionAnalyticsService.calculateNetCommissionAfterChargebacks(
   *   'user-123',
   *   new Date('2024-01-01'),
   *   new Date('2024-12-31')
   * );
   * console.log(`Net Income: $${netMetrics.netIncome}`);
   * console.log(`Chargeback Rate: ${netMetrics.chargebackRate}%`);
   * ```
   */
  async calculateNetCommissionAfterChargebacks(
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<NetCommissionMetrics> {
    try {
      const metrics = await this.getCommissionMetrics(userId, startDate, endDate);
      const { chargebackService } = await import('./index');

      const chargebackMetrics = await chargebackService.getChargebackMetrics(userId);

      const chargebackRate = metrics.totalAmount > 0
        ? (chargebackMetrics.totalAmount / metrics.totalAmount) * 100
        : 0;

      const netIncome = metrics.totalAmount - chargebackMetrics.totalAmount;

      // Risk-adjusted projection assumes future chargeback rate will be similar
      const pendingRisk = chargebackMetrics.pendingAmount;
      const riskAdjustedProjection = netIncome - pendingRisk;

      return {
        totalCommissions: metrics.totalAmount,
        totalChargebacks: chargebackMetrics.totalAmount,
        netIncome,
        chargebackRate,
        riskAdjustedProjection,
      };
    } catch (error) {
      throw this.handleError(error, 'calculateNetCommissionAfterChargebacks');
    }
  }
}

export const commissionAnalyticsService = new CommissionAnalyticsService();
