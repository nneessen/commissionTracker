// src/services/reports/insightsService.ts

import { ActionableInsight } from "../../types/reports.types";
import { supabase } from "../base/supabase";
import { parseLocalDate } from "../../lib/date";

interface InsightContext {
  startDate: Date;
  endDate: Date;
  userId: string;
}

/**
 * Insights Service - Generates actionable recommendations based on data analysis
 *
 * Key principles:
 * 1. Every insight must be actionable (specific next steps)
 * 2. Quantify the impact (dollar amounts, client counts, etc.)
 * 3. Prioritize by potential impact and urgency
 * 4. Focus on what the user can control
 */
export class InsightsService {
  /**
   * Generate all insights for a given time period
   */
  static async generateInsights(
    context: InsightContext,
  ): Promise<ActionableInsight[]> {
    const insights: ActionableInsight[] = [];

    // Run all insight generators in parallel
    const [
      chargebackInsights,
      lapseInsights,
      revenueInsights,
      expenseInsights,
      opportunityInsights,
      riskInsights,
    ] = await Promise.all([
      this.detectChargebackRisks(context),
      this.detectLapsePatterns(context),
      this.identifyRevenueOpportunities(context),
      this.analyzeExpenseAnomalies(context),
      this.findCrossSellOpportunities(context),
      this.assessPolicyRisks(context),
    ]);

    insights.push(
      ...chargebackInsights,
      ...lapseInsights,
      ...revenueInsights,
      ...expenseInsights,
      ...opportunityInsights,
      ...riskInsights,
    );

    // Sort by priority (severity + impact)
    return insights.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Detect ACTUAL chargeback events (not every policy)
   * Only show insights if there are REAL chargebacks in the period
   */
  private static async detectChargebackRisks(
    context: InsightContext,
  ): Promise<ActionableInsight[]> {
    const { data: chargebacks } = await supabase
      .from("commissions")
      .select("*")
      .eq("user_id", context.userId)
      .eq("status", "charged_back")
      .gte("payment_date", context.startDate.toISOString())
      .lte("payment_date", context.endDate.toISOString());

    if (!chargebacks || chargebacks.length === 0) return [];

    const totalChargedBack = chargebacks.reduce(
      (sum: number, c: any) =>
        sum + Math.abs(c.chargeback_amount || c.amount || 0),
      0,
    );

    const insights: ActionableInsight[] = [];

    if (totalChargedBack > 0) {
      insights.push({
        id: "chargeback-actual",
        severity: "critical",
        category: "chargeback",
        title: `${chargebacks.length} Chargebacks This Period`,
        description: `You had ${chargebacks.length} commission chargebacks in this period.`,
        impact: `$${totalChargedBack.toFixed(2)} charged back`,
        recommendedActions: [
          "Review why these policies lapsed",
          "Improve client follow-up in first 90 days",
          "Set up automated retention reminders",
          "Focus on better product fit during sales process",
        ],
        priority: 10,
        affectedEntities: {
          commissions: chargebacks.map((c) => c.id).filter(Boolean),
        },
      });
    }

    return insights;
  }

  /**
   * Detect unusual lapse patterns
   */
  private static async detectLapsePatterns(
    context: InsightContext,
  ): Promise<ActionableInsight[]> {
    const { data: lapsedPolicies } = await supabase
      .from("policies")
      .select("*")
      .eq("user_id", context.userId)
      .eq("status", "lapsed")
      .gte("effective_date", context.startDate.toISOString())
      .lte("effective_date", context.endDate.toISOString());

    if (!lapsedPolicies || lapsedPolicies.length < 3) return [];

    // Analyze lapse patterns by carrier and product

    const lapseByCarrier = lapsedPolicies.reduce(
      (
        acc: Record<
          string,
          { count: number; products: Set<string>; totalPremium: number }
        >,
        p: any,
      ) => {
        const carrierName = p.carrier?.name || "Unknown";
        if (!acc[carrierName]) {
          acc[carrierName] = { count: 0, products: new Set(), totalPremium: 0 };
        }
        acc[carrierName].count++;
        acc[carrierName].products.add(p.product?.name || "Unknown Product");
        acc[carrierName].totalPremium += p.annual_premium || 0;
        return acc;
      },
      {},
    );

    const insights: ActionableInsight[] = [];

    // Find carriers with unusually high lapse rates
    Object.entries(lapseByCarrier).forEach(([carrier, data]) => {
      if (data.count >= 3) {
        const productList = Array.from(data.products).slice(0, 3);
        insights.push({
          id: `lapse-pattern-${carrier}`,
          severity: "high",
          category: "retention",
          title: `Lapse Pattern Detected`,
          description: `${data.count} ${carrier} policies lapsed (${data.totalPremium.toFixed(2)} premium lost)`,
          impact: `Lost premium: $${data.totalPremium.toFixed(2)}`,
          recommendedActions: [
            `Carrier: ${carrier} (${data.count} lapses)`,
            ...productList.map((product) => `Product involved: ${product}`),
          ],
          priority: 7,
        });
      }
    });

    return insights;
  }

  /**
   * Identify revenue optimization opportunities
   */
  private static async identifyRevenueOpportunities(
    context: InsightContext,
  ): Promise<ActionableInsight[]> {
    const insights: ActionableInsight[] = [];

    // Get commission rate data
    const { data: commissionData } = await supabase.rpc(
      "getuser_commission_profile",
      { puser_id: context.userId },
    );

    if (commissionData && commissionData.length > 0) {
      const profile = commissionData[0];

      // Check if premium-weighted rate differs significantly from count-weighted
      if (profile.data_quality === "insufficient") {
        insights.push({
          id: "revenue-insufficient-data",
          severity: "medium",
          category: "performance",
          title: "Limited Data Available",
          description: `Current data: ${profile.policy_count || 0} policies, $${(profile.total_premium || 0).toFixed(2)} in premium`,
          impact: "Commission projections may vary",
          recommendedActions: [
            `Current policy count: ${profile.policy_count || 0} (minimum 5 recommended for accuracy)`,
            `Current premium total: $${(profile.total_premium || 0).toFixed(2)} (minimum $10,000 recommended)`,
          ],
          priority: 4,
        });
      }

      // Check average premium opportunity
      // Get policies that are not cancelled (active policies)
      const { data: policies } = await supabase
        .from("policies")
        .select("annual_premium, product, carrier")
        .eq("user_id", context.userId)
        .is("cancellation_date", null);

      if (policies && policies.length > 10) {
        const avgPremium =
          policies.reduce(
            (sum: number, p: any) => sum + (p.annual_premium || 0),
            0,
          ) / policies.length;
        const topQuartilePolicies = policies

          .sort(
            (a: any, b: any) =>
              (b.annual_premium || 0) - (a.annual_premium || 0),
          )
          .slice(0, Math.floor(policies.length * 0.25));

        const topQuartilePremium =
          topQuartilePolicies
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- report data has dynamic shape
            .reduce((sum: number, p: any) => sum + (p.annual_premium || 0), 0) /
          topQuartilePolicies.length;

        if (topQuartilePremium > avgPremium * 1.5) {
          // Get the actual top performing products/carriers
          const topProducts = new Map();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- report data has dynamic shape
          topQuartilePolicies.forEach((p: any) => {
            const key = `${p.carrier} - ${p.product}`;
            topProducts.set(key, (topProducts.get(key) || 0) + 1);
          });

          const topProductsList = Array.from(topProducts.entries())
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 3)
            .map(([product]) => product);

          const _potentialIncrease =
            (topQuartilePremium - avgPremium) * policies.length;
          insights.push({
            id: "revenue-premium-opportunity",
            severity: "medium",
            category: "opportunity",
            title: "Premium Distribution Analysis",
            description: `Top 25% policies average: $${topQuartilePremium.toFixed(2)}, Overall average: $${avgPremium.toFixed(2)}`,
            impact: `Premium gap: $${(topQuartilePremium - avgPremium).toFixed(2)} per policy`,
            recommendedActions:
              topProductsList.length > 0
                ? topProductsList.map((product) => `Top performer: ${product}`)
                : [`Current average premium: $${avgPremium.toFixed(2)}`],
            priority: 6,
          });
        }
      }
    }

    return insights;
  }

  /**
   * Analyze expense patterns for anomalies
   */
  private static async analyzeExpenseAnomalies(
    context: InsightContext,
  ): Promise<ActionableInsight[]> {
    const insights: ActionableInsight[] = [];

    // Get expenses for current period
    const { data: currentExpenses } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", context.userId)
      .gte("date", context.startDate.toISOString())
      .lte("date", context.endDate.toISOString());

    if (!currentExpenses || currentExpenses.length === 0) return insights;

    const totalExpenses = currentExpenses.reduce(
      (sum: number, e: any) => sum + (e.amount || 0),
      0,
    );

    // Get commission for same period
    const { data: commissions } = await supabase
      .from("commissions")
      .select("amount")
      .eq("user_id", context.userId)
      .eq("status", "paid")
      .gte("payment_date", context.startDate.toISOString())
      .lte("payment_date", context.endDate.toISOString());

    const totalCommission =
      commissions?.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) ||
      0;
    const expenseRatio =
      totalCommission > 0 ? (totalExpenses / totalCommission) * 100 : 0;

    // Alert if expense ratio is high - but only show data-driven insights
    if (expenseRatio > 40) {
      // Analyze actual expense categories to provide specific recommendations

      const categoryTotals = currentExpenses.reduce(
        (acc: Record<string, number>, e: any) => {
          const category = e.category || "Uncategorized";
          acc[category] = (acc[category] || 0) + e.amount;
          return acc;
        },
        {},
      );

      // Find top spending categories
      const topCategories = Object.entries(categoryTotals)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([category, amount]) => ({
          category,
          amount: amount as number,
          percentage: (((amount as number) / totalExpenses) * 100).toFixed(1),
        }));

      const recommendations: string[] = [];

      // Only add specific, data-based recommendations
      if (topCategories.length > 0) {
        const topCategory = topCategories[0];
        recommendations.push(
          `Your highest expense category is ${topCategory.category} at $${topCategory.amount.toFixed(2)} (${topCategory.percentage}% of expenses)`,
        );
      }

      if (expenseRatio > 50) {
        recommendations.push(
          `Expense ratio is critically high - immediate review recommended`,
        );
      }

      // Only create insight if we have actual data-driven recommendations
      if (recommendations.length > 0) {
        insights.push({
          id: "expense-high-ratio",
          severity: "high",
          category: "expense",
          title: "High Expense Ratio",
          description: `Expenses are ${expenseRatio.toFixed(1)}% of commission income (target: 25-35%)`,
          impact: `Current expense total: $${totalExpenses.toFixed(2)}`,
          recommendedActions: recommendations,
          priority: 8,
        });
      }
    }

    return insights;
  }

  /**
   * Find cross-sell opportunities
   */
  private static async findCrossSellOpportunities(
    context: InsightContext,
  ): Promise<ActionableInsight[]> {
    const insights: ActionableInsight[] = [];

    // Get all active policies with product details
    // Active policies = not cancelled
    const { data: activePolicies } = await supabase
      .from("policies")
      .select("client_id, product, annual_premium")
      .eq("user_id", context.userId)
      .is("cancellation_date", null);

    if (!activePolicies || activePolicies.length === 0) return insights;

    // Group by client_id and track products

    const clientData = activePolicies.reduce(
      (
        acc: Record<
          string,
          { count: number; products: Set<string>; totalPremium: number }
        >,
        p: any,
      ) => {
        const clientId = p.client_id;
        if (!clientId) return acc;

        if (!acc[clientId]) {
          acc[clientId] = { count: 0, products: new Set(), totalPremium: 0 };
        }

        acc[clientId].count++;
        acc[clientId].products.add(p.product);
        acc[clientId].totalPremium += p.annual_premium || 0;

        return acc;
      },
      {},
    );

    const singlePolicyClients = Object.entries(clientData)
      .filter(([_, data]) => data.count === 1)
      .map(([clientId, data]) => ({
        clientId,
        product: Array.from(data.products)[0],
        premium: data.totalPremium,
      }));

    const totalClients = Object.keys(clientData).length;
    const avgPoliciesPerClient = activePolicies.length / totalClients;

    if (singlePolicyClients.length > 5) {
      // Calculate actual potential based on existing multi-policy clients
      const multiPolicyClients = Object.entries(clientData).filter(
        ([_, data]) => data.count > 1,
      );

      const avgMultiPolicyPremium =
        multiPolicyClients.length > 0
          ? multiPolicyClients.reduce(
              (sum, [_, data]) => sum + data.totalPremium,
              0,
            ) / multiPolicyClients.length
          : 0;

      const avgSinglePolicyPremium =
        singlePolicyClients.reduce((sum, c) => sum + c.premium, 0) /
        singlePolicyClients.length;

      insights.push({
        id: "opportunity-cross-sell",
        severity: "medium",
        category: "opportunity",
        title: `Cross-Sell Opportunity Analysis`,
        description: `${singlePolicyClients.length} of ${totalClients} clients have single policies`,
        impact:
          avgMultiPolicyPremium > 0
            ? `Multi-policy clients average $${avgMultiPolicyPremium.toFixed(2)} vs single-policy $${avgSinglePolicyPremium.toFixed(2)}`
            : `Average policies per client: ${avgPoliciesPerClient.toFixed(1)}`,
        recommendedActions: [
          `Single-policy clients: ${singlePolicyClients.length}`,
          `Multi-policy clients: ${multiPolicyClients.length}`,
          `Average single-policy premium: $${avgSinglePolicyPremium.toFixed(2)}`,
        ],
        priority: 5,
      });
    }

    return insights;
  }

  /**
   * Assess overall policy portfolio risk
   */
  private static async assessPolicyRisks(
    context: InsightContext,
  ): Promise<ActionableInsight[]> {
    const insights: ActionableInsight[] = [];

    // Get persistency metrics
    const { data: cohorts } = await supabase
      .from("policies")
      .select("effective_date, status, cancellation_date")
      .eq("user_id", context.userId);

    if (!cohorts || cohorts.length === 0) return insights;

    // Calculate 13-month persistency
    const thirteenMonthsAgo = new Date();
    thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

    const cohortPolicies = cohorts.filter(
      (p) => parseLocalDate(p.effective_date) <= thirteenMonthsAgo,
    );
    // Consider policies without cancellation date as still active
    const stillActive = cohortPolicies.filter((p) => !p.cancellation_date);
    const persistency =
      cohortPolicies.length > 0
        ? (stillActive.length / cohortPolicies.length) * 100
        : 0;

    // Alert if persistency is low
    if (cohortPolicies.length >= 10 && persistency < 70) {
      insights.push({
        id: "risk-low-persistency",
        severity: "critical",
        category: "risk",
        title: "Low 13-Month Persistency Rate",
        description: `Your 13-month persistency is ${persistency.toFixed(1)}%, which is below industry average (typically 75-85%).`,
        impact: `Low persistency increases chargebacks and reduces long-term income`,
        recommendedActions: [
          "Improve client onboarding and education",
          "Increase touchpoints in first 90 days",
          "Review product suitability and pricing",
          "Implement systematic client retention program",
        ],
        priority: 9,
      });
    }

    return insights;
  }
}
