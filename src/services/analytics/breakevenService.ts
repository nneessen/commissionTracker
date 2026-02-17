// src/services/analytics/breakevenService.ts

import { commissionService, expenseService } from "../index";
import { BREAKEVEN_RATES, EMERGENCY_FUND } from "../../constants/financial";
import type { NetCommissionMetrics } from "../commissions/CommissionAnalyticsService";

export interface BreakevenScenario {
  scenarioName: string;
  chargebackRate: number; // Percentage of commissions that become chargebacks
  timeFrame: number; // Months
  expectedChargebacks: number;
  requiredCommissions: number;
  netIncome: number;
  breakevenPoint: number; // Months to breakeven
  riskLevel: "low" | "medium" | "high";
}

export interface BreakevenAnalysis {
  currentMetrics: {
    totalCommissions: number;
    totalChargebacks: number;
    netIncome: number;
    chargebackRate: number;
  };
  monthlyExpenses: number;
  targetProfit: number;
  scenarios: {
    optimistic: BreakevenScenario;
    realistic: BreakevenScenario;
    pessimistic: BreakevenScenario;
  };
  recommendations: string[];
  timeToTarget: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
}

export interface ProfitTarget {
  targetAmount: number;
  currentProgress: number;
  progressPercentage: number;
  monthsToTarget: number;
  requiredMonthlyCommissions: number;
  riskAdjustedTarget: number;
}

class BreakevenService {
  async calculateBreakevenAnalysis(
    userId?: string,
    targetProfit: number = 5000,
    analysisMonths: number = 12,
  ): Promise<BreakevenAnalysis> {
    // Get current metrics
    const currentMetrics =
      await commissionService.calculateNetCommissionAfterChargebacks(
        userId,
        new Date(Date.now() - analysisMonths * 30 * 24 * 60 * 60 * 1000),
        new Date(),
      );

    // Get monthly expenses
    const expenseResult = await expenseService.getAll();
    const expenses = expenseResult.success ? expenseResult.data || [] : [];
    const monthlyExpenses = expenses.reduce(
      (total: number, expense: { amount: number }) => total + expense.amount,
      0,
    );

    // Calculate scenarios
    const optimisticScenario = await this.calculateScenario(
      "Optimistic (5% chargeback rate)",
      BREAKEVEN_RATES.OPTIMISTIC_CHARGEBACK_RATE,
      currentMetrics,
      monthlyExpenses,
      targetProfit,
      analysisMonths,
    );

    const realisticScenario = await this.calculateScenario(
      "Realistic (Current rate)",
      Math.max(
        currentMetrics.chargebackRate / 100,
        BREAKEVEN_RATES.MINIMUM_REALISTIC_RATE,
      ),
      currentMetrics,
      monthlyExpenses,
      targetProfit,
      analysisMonths,
    );

    const pessimisticScenario = await this.calculateScenario(
      "Pessimistic (25% chargeback rate)",
      BREAKEVEN_RATES.PESSIMISTIC_CHARGEBACK_RATE,
      currentMetrics,
      monthlyExpenses,
      targetProfit,
      analysisMonths,
    );

    // Generate recommendations
    const recommendations = await this.generateRecommendations(
      currentMetrics,
      monthlyExpenses,
      targetProfit,
      [optimisticScenario, realisticScenario, pessimisticScenario],
      analysisMonths,
    );

    return {
      currentMetrics,
      monthlyExpenses,
      targetProfit,
      scenarios: {
        optimistic: optimisticScenario,
        realistic: realisticScenario,
        pessimistic: pessimisticScenario,
      },
      recommendations,
      timeToTarget: {
        optimistic: optimisticScenario.breakevenPoint,
        realistic: realisticScenario.breakevenPoint,
        pessimistic: pessimisticScenario.breakevenPoint,
      },
    };
  }

  private async calculateScenario(
    scenarioName: string,
    chargebackRate: number,
    currentMetrics: NetCommissionMetrics,
    monthlyExpenses: number,
    targetProfit: number,
    timeFrame: number,
  ): Promise<BreakevenScenario> {
    // Calculate required gross commissions to achieve target after chargebacks and expenses
    const monthlyTarget = monthlyExpenses + targetProfit / timeFrame;
    const requiredNetIncome = monthlyTarget;
    const requiredGrossCommissions = requiredNetIncome / (1 - chargebackRate);

    const expectedChargebacks = requiredGrossCommissions * chargebackRate;
    const netIncome =
      requiredGrossCommissions - expectedChargebacks - monthlyExpenses;

    // Calculate breakeven point (months to reach target)
    const currentMonthlyNet =
      currentMetrics.netIncome / timeFrame - monthlyExpenses;
    const breakevenPoint =
      currentMonthlyNet > 0
        ? Math.ceil(targetProfit / currentMonthlyNet)
        : Infinity;

    // Determine risk level
    let riskLevel: "low" | "medium" | "high";
    if (chargebackRate <= 0.1) {
      riskLevel = "low";
    } else if (chargebackRate <= 0.2) {
      riskLevel = "medium";
    } else {
      riskLevel = "high";
    }

    return {
      scenarioName,
      chargebackRate: chargebackRate * 100,
      timeFrame,
      expectedChargebacks,
      requiredCommissions: requiredGrossCommissions,
      netIncome,
      breakevenPoint: isFinite(breakevenPoint) ? breakevenPoint : 999,
      riskLevel,
    };
  }

  private async generateRecommendations(
    currentMetrics: NetCommissionMetrics,
    monthlyExpenses: number,
    targetProfit: number,
    scenarios: BreakevenScenario[],
    analysisMonths: number = 12,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Chargeback rate recommendations
    if (currentMetrics.chargebackRate > 20) {
      recommendations.push(
        "CRITICAL: Chargeback rate above 20% - review policy quality and client screening",
      );
    } else if (currentMetrics.chargebackRate > 15) {
      recommendations.push(
        "HIGH: Chargeback rate above 15% - implement better policy retention strategies",
      );
    }

    // Income recommendations
    const currentMonthlyNet =
      currentMetrics.netIncome / analysisMonths - monthlyExpenses;
    if (currentMonthlyNet < 0) {
      recommendations.push(
        "URGENT: Currently operating at a loss - focus on increasing commission volume",
      );
    }

    // Commission volume recommendations
    const realisticScenario = scenarios.find((s) =>
      s.scenarioName.includes("Realistic"),
    );
    if (realisticScenario) {
      const currentMonthlyCommissions =
        currentMetrics.totalCommissions / analysisMonths;
      const requiredMonthlyCommissions =
        realisticScenario.requiredCommissions / realisticScenario.timeFrame;

      if (requiredMonthlyCommissions > currentMonthlyCommissions * 2) {
        recommendations.push(
          `Need to ${Math.ceil(requiredMonthlyCommissions / currentMonthlyCommissions)}x current commission volume`,
        );
      }
    }

    // Expense recommendations
    if (monthlyExpenses > targetProfit / 2) {
      recommendations.push(
        "Consider reducing monthly expenses to improve profitability timeline",
      );
    }

    // Contract level recommendations
    recommendations.push(
      "Review contract comp levels - higher levels reduce chargeback risk and increase rates",
    );

    // Diversification recommendations
    if (scenarios.every((s) => s.breakevenPoint > 18)) {
      recommendations.push(
        "Consider diversifying product mix or carriers to improve commission rates",
      );
    }

    return recommendations;
  }

  async calculateProfitTarget(
    targetAmount: number,
    userId?: string,
    analysisMonths: number = 12,
  ): Promise<ProfitTarget> {
    const currentMetrics =
      await commissionService.calculateNetCommissionAfterChargebacks(userId);
    const expenseResult = await expenseService.getAll();
    const allExpenses = expenseResult.success ? expenseResult.data || [] : [];
    const monthlyExpenses = allExpenses.reduce(
      (total: number, expense: { amount: number }) => total + expense.amount,
      0,
    );

    const currentProgress = Math.max(
      0,
      currentMetrics.netIncome - monthlyExpenses * analysisMonths,
    );
    const progressPercentage = Math.min(
      100,
      (currentProgress / targetAmount) * 100,
    );

    const remainingTarget = Math.max(0, targetAmount - currentProgress);
    const chargebackRate = currentMetrics.chargebackRate / 100;
    const riskAdjustedTarget = remainingTarget / (1 - chargebackRate);

    // Calculate required monthly commissions (gross) to reach target in specified timeframe
    const requiredNetMonthly =
      remainingTarget / analysisMonths + monthlyExpenses;
    const requiredMonthlyCommissions =
      requiredNetMonthly / (1 - chargebackRate);

    const currentMonthlyNet =
      currentMetrics.netIncome / analysisMonths - monthlyExpenses;
    const monthsToTarget =
      currentMonthlyNet > 0
        ? Math.ceil(remainingTarget / currentMonthlyNet)
        : 999;

    return {
      targetAmount,
      currentProgress,
      progressPercentage,
      monthsToTarget: isFinite(monthsToTarget) ? monthsToTarget : 999,
      requiredMonthlyCommissions,
      riskAdjustedTarget,
    };
  }

  async getChargebackProjections(
    userId?: string,
    _projectionMonths: number = 6,
  ): Promise<{
    currentChargebacks: number;
    projectedChargebacks: number;
    riskFactors: Array<{
      factor: string;
      risk: number;
      description: string;
    }>;
    mitigation: string[];
  }> {
    const commissions =
      await commissionService.getCommissionsWithChargebackRisk(userId);

    let currentChargebacks = 0;
    let projectedChargebacks = 0;
    const riskFactors: Array<{
      factor: string;
      risk: number;
      description: string;
    }> = [];

    // Analyze existing chargebacks and risk
    commissions.forEach(
      ({ commission, chargeback_risk, existing_chargebacks }) => {
        currentChargebacks += existing_chargebacks.reduce(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chargeback records have dynamic shape
          (sum: number, cb: any) => sum + cb.chargebackAmount,
          0,
        );

        // Project future chargebacks based on risk level
        if (chargeback_risk.riskLevel === "high") {
          projectedChargebacks += (commission.amount ?? 0) * 0.8; // 80% chance
        } else if (chargeback_risk.riskLevel === "medium") {
          projectedChargebacks += (commission.amount ?? 0) * 0.3; // 30% chance
        } else {
          projectedChargebacks += (commission.amount ?? 0) * 0.05; // 5% chance
        }
      },
    );

    // Identify risk factors
    const highRiskCount = commissions.filter(
      (c) => c.chargeback_risk.riskLevel === "high",
    ).length;
    const recentCommissions = commissions.filter(
      (c) => c.chargeback_risk.monthsSincePaid < 6,
    ).length;

    if (highRiskCount > 0) {
      riskFactors.push({
        factor: "High Risk Commissions",
        risk: (highRiskCount / commissions.length) * 100,
        description: `${highRiskCount} commissions with high chargeback risk`,
      });
    }

    if (recentCommissions > commissions.length * 0.5) {
      riskFactors.push({
        factor: "Recent Payment Risk",
        risk: (recentCommissions / commissions.length) * 100,
        description: "High percentage of recently paid commissions",
      });
    }

    const mitigation = [
      "Monitor high-risk policies for early warning signs",
      "Implement client retention strategies",
      "Diversify carrier and product mix",
      "Focus on higher contract comp levels",
      "Build emergency fund for chargeback coverage",
    ];

    return {
      currentChargebacks,
      projectedChargebacks,
      riskFactors,
      mitigation,
    };
  }

  async calculateEmergencyFund(
    userId?: string,
    analysisMonths: number = 12,
  ): Promise<{
    recommendedFund: number;
    currentRisk: number;
    monthsOfCoverage: number;
    riskScenarios: Array<{
      scenario: string;
      requiredFund: number;
      probability: number;
    }>;
  }> {
    const projectionMonths = EMERGENCY_FUND.PROJECTION_MONTHS; // Use a consistent 12-month projection for clarity
    const chargebackProjections = await this.getChargebackProjections(
      userId,
      projectionMonths,
    );
    const currentMetrics =
      await commissionService.calculateNetCommissionAfterChargebacks(userId);

    const monthlyProjectedChargebacks =
      chargebackProjections.projectedChargebacks / projectionMonths;

    // Calculate recommended fund based on scenarios
    const scenarios = [
      {
        scenario: "Conservative (3 months of projected chargebacks)",
        requiredFund:
          monthlyProjectedChargebacks * EMERGENCY_FUND.CONSERVATIVE_MONTHS,
        probability: 0.8,
      },
      {
        scenario: "Moderate (6 months of projected chargebacks)",
        requiredFund:
          monthlyProjectedChargebacks * EMERGENCY_FUND.MODERATE_MONTHS,
        probability: 0.6,
      },
      {
        scenario: "Aggressive (12 months of projected chargebacks)",
        requiredFund:
          monthlyProjectedChargebacks * EMERGENCY_FUND.AGGRESSIVE_MONTHS,
        probability: 0.2,
      },
    ];

    const recommendedFund = scenarios[1].requiredFund; // Use moderate scenario
    const monthlyCommissions = currentMetrics.totalCommissions / analysisMonths;
    const monthsOfCoverage =
      monthlyCommissions > 0 ? recommendedFund / monthlyCommissions : 0;

    return {
      recommendedFund,
      currentRisk: chargebackProjections.projectedChargebacks,
      monthsOfCoverage,
      riskScenarios: scenarios,
    };
  }
}

export const breakevenService = new BreakevenService();
