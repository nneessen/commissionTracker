// src/services/reports/forecastingService.ts

import { supabase } from "../base/supabase";
import { logger } from "../base/logger";
import { ReportDataFetchError } from "./reportGenerationService";

export interface ForecastResult {
  nextMonth: number;
  threeMonth: number;
  confidence: number; // 0-1
  trend: "up" | "down" | "stable";
  historicalMonths: number;
  warnings: string[];
}

interface MonthlyData {
  month: string; // YYYY-MM format
  total: number;
  monthIndex: number;
}

/**
 * Forecasting Service - Predicts future commission based on historical data
 *
 * Uses linear regression to detect trends and project forward.
 * Calculates confidence based on data consistency (R² and variance).
 */
export class ForecastingService {
  /**
   * Forecast commission income for next 1 and 3 months
   */
  static async forecastCommission(userId: string): Promise<ForecastResult> {
    // Fetch last 12 months of commission data
    const commissions = await this.fetchHistoricalData(userId);

    // Aggregate by month
    const monthlyData = this.aggregateByMonth(commissions);

    // Check if we have enough data
    if (monthlyData.length < 3) {
      return {
        nextMonth: 0,
        threeMonth: 0,
        confidence: 0,
        trend: "stable",
        historicalMonths: monthlyData.length,
        warnings: [
          "Insufficient data: Need at least 3 months of commission history for forecasting",
        ],
      };
    }

    // Calculate linear regression
    const { slope, intercept, rSquared } =
      this.calculateLinearRegression(monthlyData);

    // Project forward
    const nextMonthIndex = monthlyData.length;
    const nextMonth = Math.max(0, slope * nextMonthIndex + intercept);

    const month2 = Math.max(0, slope * (nextMonthIndex + 1) + intercept);
    const month3 = Math.max(0, slope * (nextMonthIndex + 2) + intercept);
    const threeMonth = nextMonth + month2 + month3;

    // Calculate confidence
    const confidence = this.calculateConfidence(
      monthlyData,
      slope,
      intercept,
      rSquared,
    );

    // Determine trend
    const trend = this.determineTrend(slope);

    // Generate warnings
    const warnings = this.generateWarnings(monthlyData, confidence, rSquared);

    return {
      nextMonth,
      threeMonth,
      confidence,
      trend,
      historicalMonths: monthlyData.length,
      warnings,
    };
  }

  /**
   * Fetch last 12 months of paid commission data
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- aggregation result type
  private static async fetchHistoricalData(userId: string): Promise<any[]> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    twelveMonthsAgo.setDate(1); // Start of month

    const { data, error } = await supabase
      .from("commissions")
      .select("payment_date, amount, status")
      .eq("user_id", userId)
      .eq("status", "paid")
      .gte("payment_date", twelveMonthsAgo.toISOString())
      .order("payment_date", { ascending: true });

    if (error) {
      logger.error(
        "Error fetching commission history",
        error,
        "ForecastingService",
      );
      throw new ReportDataFetchError(
        "commission history for forecasting",
        error,
      );
    }

    return data || [];
  }

  /**
   * Aggregate commissions by month
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- aggregation result type
  private static aggregateByMonth(commissions: any[]): MonthlyData[] {
    const monthlyMap: Record<string, number> = {};

    commissions.forEach((commission) => {
      const month = commission.payment_date.substring(0, 7); // YYYY-MM
      monthlyMap[month] = (monthlyMap[month] || 0) + (commission.amount || 0);
    });

    // Convert to array and sort
    const monthlyData: MonthlyData[] = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map((entry, index) => ({
        month: entry[0],
        total: entry[1],
        monthIndex: index,
      }));

    return monthlyData;
  }

  /**
   * Calculate linear regression: y = mx + b
   * Returns slope (m), intercept (b), and R-squared
   */
  private static calculateLinearRegression(monthlyData: MonthlyData[]): {
    slope: number;
    intercept: number;
    rSquared: number;
  } {
    const n = monthlyData.length;

    // Calculate sums
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    monthlyData.forEach((data) => {
      const x = data.monthIndex;
      const y = data.total;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    // Calculate slope and intercept
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared (coefficient of determination)
    const meanY = sumY / n;
    let ssTotal = 0;
    let ssResidual = 0;

    monthlyData.forEach((data) => {
      const predicted = slope * data.monthIndex + intercept;
      ssTotal += (data.total - meanY) ** 2;
      ssResidual += (data.total - predicted) ** 2;
    });

    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    return { slope, intercept, rSquared };
  }

  /**
   * Calculate confidence score (0-1) based on:
   * - R-squared (how well the line fits)
   * - Coefficient of variation (relative variance)
   * - Amount of historical data
   */
  private static calculateConfidence(
    monthlyData: MonthlyData[],
    _slope: number,
    _intercept: number,
    rSquared: number,
  ): number {
    const n = monthlyData.length;

    // Base confidence on R-squared (how well trend fits)
    let confidence = rSquared;

    // Calculate coefficient of variation (std dev / mean)
    const values = monthlyData.map((d) => d.total);
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const variance =
      values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;

    // Lower variance = higher confidence
    // CV < 0.2 = very stable, CV > 0.5 = very volatile
    const varianceFactor = Math.max(0, 1 - coefficientOfVariation);
    confidence *= 0.7 + varianceFactor * 0.3;

    // More data = higher confidence
    // 3 months = 0.6 factor, 12+ months = 1.0 factor
    const dataFactor = Math.min(1, 0.6 + (n - 3) / 30);
    confidence *= dataFactor;

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Determine trend direction based on slope
   */
  private static determineTrend(slope: number): "up" | "down" | "stable" {
    const threshold = 50; // $50/month change considered meaningful

    if (slope > threshold) return "up";
    if (slope < -threshold) return "down";
    return "stable";
  }

  /**
   * Generate warnings based on data quality
   */
  private static generateWarnings(
    monthlyData: MonthlyData[],
    confidence: number,
    rSquared: number,
  ): string[] {
    const warnings: string[] = [];

    // Limited data warning
    if (monthlyData.length < 6) {
      warnings.push(
        "Limited historical data (less than 6 months). Predictions may be less accurate.",
      );
    }

    // Low confidence warning
    if (confidence < 0.5) {
      warnings.push(
        "Low confidence due to high variance in commission amounts.",
      );
    }

    // Poor fit warning
    if (rSquared < 0.5) {
      warnings.push(
        "Historical data does not follow a clear trend. Predictions based on average.",
      );
    }

    // Check for recent volatility (last 3 months vs prior)
    if (monthlyData.length >= 6) {
      const recentAvg =
        monthlyData.slice(-3).reduce((sum, d) => sum + d.total, 0) / 3;
      const priorAvg =
        monthlyData.slice(0, -3).reduce((sum, d) => sum + d.total, 0) /
        (monthlyData.length - 3);
      const change = Math.abs((recentAvg - priorAvg) / priorAvg);

      if (change > 0.5) {
        warnings.push(
          "Recent commission pattern differs significantly from historical average.",
        );
      }
    }

    return warnings;
  }
}
