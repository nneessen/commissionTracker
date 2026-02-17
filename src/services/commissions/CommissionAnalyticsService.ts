// src/services/commissions/CommissionAnalyticsService.ts
// Handles commission metrics, reporting, and chargeback analysis

import { Commission, Chargeback } from "../../types/commission.types";
import { supabase, TABLES } from "../base/supabase";
import {
  RISK_SCORE_WEIGHTS,
  CHARGEBACK_THRESHOLDS,
  RISK_LEVELS,
} from "../../constants/financial";
import { commissionCRUDService } from "./CommissionCRUDService";
import { logger } from "../base/logger";

export interface ChargebackRisk {
  riskLevel: "low" | "medium" | "high";
  monthsSincePaid: number;
  chargebackGracePeriod: number;
  hasActiveChargebacks: boolean;
  potentialChargebackAmount: number;
  riskFactors: string[];
}

export interface CommissionWithChargebackRisk {
  commission: Commission;
  chargeback_risk: ChargebackRisk;
  existing_chargebacks: Chargeback[];
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
  private handleError(error: unknown, context: string): never {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      `CommissionAnalyticsService.${context}`,
      error instanceof Error ? error : new Error(String(error)),
    );
    throw new Error(`${context} failed: ${message}`);
  }

  async getCommissionMetrics(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CommissionMetrics> {
    try {
      let query = supabase.from(TABLES.COMMISSIONS).select("amount, status");

      if (userId) {
        query = query.eq("user_id", userId);
      }

      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }

      if (endDate) {
        query = query.lte("created_at", endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch commission metrics: ${error.message}`);
      }

      const metrics: CommissionMetrics = {
        totalCommissions: data?.length || 0,
        totalAmount: 0,
        avgCommissionRate: 0,
        autoCalculatedCount: 0,
        manualCount: data?.length || 0,
      };

      if (data && data.length > 0) {
        data.forEach((commission) => {
          metrics.totalAmount += Number(commission.amount || 0);
        });
      }

      return metrics;
    } catch (error) {
      throw this.handleError(error, "getCommissionMetrics");
    }
  }

  async getChargebackRisk(commissionId: string): Promise<ChargebackRisk> {
    try {
      const commission = await commissionCRUDService.getById(commissionId);
      if (!commission) {
        throw new Error("Commission not found");
      }

      const { chargebackService } = await import("./index");

      const chargebackGracePeriod = 24;

      // Calculate months since commission was paid
      const paidDate = commission.paymentDate
        ? new Date(commission.paymentDate)
        : null;
      const monthsSincePaid = paidDate
        ? Math.floor(
            (Date.now() - paidDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
          )
        : 0;

      const existingChargebacks = await chargebackService.getByCommissionId(
        commission.id,
      );
      const hasActiveChargebacks = existingChargebacks.some(
        (cb) => cb.status === "pending" || cb.status === "disputed",
      );

      const riskFactors: string[] = [];
      let riskScore = 0;

      if (monthsSincePaid < 6) {
        riskFactors.push("Recent payment - higher lapse risk");
        riskScore += 3;
      } else if (monthsSincePaid < 12) {
        riskFactors.push("Within first year - moderate lapse risk");
        riskScore += 2;
      } else if (monthsSincePaid >= chargebackGracePeriod) {
        riskFactors.push("Beyond grace period - low risk");
        riskScore -= 2;
      }

      if (commission.amount > 5000) {
        riskFactors.push("High commission amount");
        riskScore += 2;
      }

      if (hasActiveChargebacks) {
        riskFactors.push("Has active chargebacks");
        riskScore += 3;
      }

      let riskLevel: "low" | "medium" | "high";
      if (riskScore <= 1) {
        riskLevel = "low";
      } else if (riskScore <= 4) {
        riskLevel = "medium";
      } else {
        riskLevel = "high";
      }

      return {
        riskLevel,
        monthsSincePaid,
        chargebackGracePeriod,
        hasActiveChargebacks,
        potentialChargebackAmount: commission.amount,
        riskFactors,
      };
    } catch (error) {
      throw this.handleError(error, "getChargebackRisk");
    }
  }

  calculateChargebackRiskForCommission(
    commission: Commission,
    existingChargebacks: Chargeback[],
  ): ChargebackRisk {
    const chargebackGracePeriod = CHARGEBACK_THRESHOLDS.GRACE_PERIOD_MONTHS;

    const paidDate = commission.paymentDate
      ? new Date(commission.paymentDate)
      : null;
    const monthsSincePaid = paidDate
      ? Math.floor(
          (Date.now() - paidDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
        )
      : 0;

    const hasActiveChargebacks = existingChargebacks.some(
      (cb) => cb.status === "pending" || cb.status === "disputed",
    );

    const riskFactors: string[] = [];
    let riskScore = 0;

    if (monthsSincePaid < CHARGEBACK_THRESHOLDS.RECENT_PAYMENT_MONTHS) {
      riskFactors.push("Recent payment - higher lapse risk");
      riskScore += RISK_SCORE_WEIGHTS.RECENT_PAYMENT;
    } else if (monthsSincePaid < CHARGEBACK_THRESHOLDS.FIRST_YEAR_MONTHS) {
      riskFactors.push("Within first year - moderate lapse risk");
      riskScore += RISK_SCORE_WEIGHTS.FIRST_YEAR_PAYMENT;
    } else if (monthsSincePaid >= chargebackGracePeriod) {
      riskFactors.push("Beyond grace period - low risk");
      riskScore -= 2;
    }

    if (commission.amount > CHARGEBACK_THRESHOLDS.HIGH_COMMISSION_AMOUNT) {
      riskFactors.push("High commission amount");
      riskScore += RISK_SCORE_WEIGHTS.HIGH_COMMISSION_AMOUNT;
    }

    if (hasActiveChargebacks) {
      riskFactors.push("Has active chargebacks");
      riskScore += RISK_SCORE_WEIGHTS.ACTIVE_CHARGEBACK;
    }

    let riskLevel: "low" | "medium" | "high";
    if (riskScore <= RISK_LEVELS.LOW_THRESHOLD) {
      riskLevel = "low";
    } else if (riskScore <= RISK_LEVELS.MEDIUM_THRESHOLD) {
      riskLevel = "medium";
    } else {
      riskLevel = "high";
    }

    return {
      riskLevel,
      monthsSincePaid,
      chargebackGracePeriod,
      hasActiveChargebacks,
      potentialChargebackAmount: commission.amount,
      riskFactors,
    };
  }

  async createChargebackForCommission(
    commissionId: string,
    chargebackData: {
      chargebackType: "policy_lapse" | "refund" | "cancellation";
      chargebackAmount?: number;
      chargebackReason?: string;
      policyLapseDate?: Date;
      chargebackDate: Date;
    },
  ): Promise<Chargeback> {
    try {
      const commission = await commissionCRUDService.getById(commissionId);
      if (!commission) {
        throw new Error("Commission not found");
      }

      const { chargebackService } = await import("./index");

      return chargebackService.create({
        commissionId: commission.id,
        chargebackAmount: chargebackData.chargebackAmount || commission.amount,
        reason: chargebackData.chargebackReason,
        chargebackDate: chargebackData.chargebackDate,
      });
    } catch (error) {
      throw this.handleError(error, "createChargebackForCommission");
    }
  }

  async getCommissionsWithChargebackRisk(
    userId?: string,
  ): Promise<CommissionWithChargebackRisk[]> {
    try {
      const commissions = userId
        ? await commissionCRUDService.getCommissionsByUser(userId)
        : await commissionCRUDService.getAll();
      if (commissions.length === 0) return [];

      const { chargebackService } = await import("./index");
      const commissionIds = commissions.map((c) => c.id);

      const allChargebacks =
        await chargebackService.getByCommissionIds(commissionIds);

      const chargebacksByCommissionId = allChargebacks.reduce(
        (acc, cb) => {
          const cId = cb.commissionId;
          if (cId) {
            (acc[cId] = acc[cId] || []).push(cb);
          }
          return acc;
        },
        {} as Record<string, Chargeback[]>,
      );

      return commissions.map((commission) => {
        const existingChargebacks =
          chargebacksByCommissionId[commission.id] || [];
        const chargebackRisk = this.calculateChargebackRiskForCommission(
          commission,
          existingChargebacks,
        );
        return {
          commission,
          chargeback_risk: chargebackRisk,
          existing_chargebacks: existingChargebacks,
        };
      });
    } catch (error) {
      throw this.handleError(error, "getCommissionsWithChargebackRisk");
    }
  }

  async calculateNetCommissionAfterChargebacks(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<NetCommissionMetrics> {
    try {
      const metrics = await this.getCommissionMetrics(
        userId,
        startDate,
        endDate,
      );
      const { chargebackService } = await import("./index");

      const chargebackMetrics = await chargebackService.getChargebackMetrics();

      const chargebackRate =
        metrics.totalAmount > 0
          ? (chargebackMetrics.totalAmount / metrics.totalAmount) * 100
          : 0;

      const netIncome = metrics.totalAmount - chargebackMetrics.totalAmount;
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
      throw this.handleError(error, "calculateNetCommissionAfterChargebacks");
    }
  }
}

export const commissionAnalyticsService = new CommissionAnalyticsService();
