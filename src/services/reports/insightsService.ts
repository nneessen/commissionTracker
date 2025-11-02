// src/services/reports/insightsService.ts

import { ActionableInsight, InsightSeverity, InsightCategory } from '../../types/reports.types';
import { supabase } from '../base/supabase';

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
  static async generateInsights(context: InsightContext): Promise<ActionableInsight[]> {
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
   * Detect policies at risk of chargeback
   */
  private static async detectChargebackRisks(
    context: InsightContext,
  ): Promise<ActionableInsight[]> {
    const { data: atRiskPolicies } = await supabase
      .from('commission_earning_detail')
      .select('*')
      .eq('user_id', context.userId)
      .lt('months_paid', 3)
      .gt('unearned_amount', 0)
      .eq('policy_status', 'active')
      .order('unearned_amount', { ascending: false });

    if (!atRiskPolicies || atRiskPolicies.length === 0) return [];

    const totalAtRisk = atRiskPolicies.reduce((sum: number, p: any) => sum + (p.unearned_amount || 0), 0);
    const criticalPolicies = atRiskPolicies.filter((p: any) => (p.months_paid || 0) < 2);

    const insights: ActionableInsight[] = [];

    if (criticalPolicies.length > 0) {
      insights.push({
        id: 'chargeback-critical-risk',
        severity: 'critical',
        category: 'chargeback',
        title: `${criticalPolicies.length} Policies at Critical Chargeback Risk`,
        description: `You have ${criticalPolicies.length} policies with less than 2 months paid that could result in chargebacks if they lapse.`,
        impact: `$${totalAtRisk.toFixed(2)} at risk of chargeback`,
        recommendedActions: [
          `Contact the ${Math.min(5, criticalPolicies.length)} highest-risk clients this week`,
          'Set up automated 30/60/90 day follow-up reminders',
          'Review onboarding process to improve early retention',
          'Consider offering payment assistance or policy review calls',
        ],
        priority: 10,
        affectedEntities: {
          policies: criticalPolicies.map(p => p.policy_id).filter(Boolean),
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
      .from('policies')
      .select('*, carrier:carriers(name), product:products(name)')
      .eq('user_id', context.userId)
      .eq('status', 'lapsed')
      .gte('effective_date', context.startDate.toISOString())
      .lte('effective_date', context.endDate.toISOString());

    if (!lapsedPolicies || lapsedPolicies.length < 3) return [];

    // Analyze lapse patterns by carrier
    const lapseByCarrier = lapsedPolicies.reduce((acc: Record<string, number>, p: any) => {
      const carrierName = p.carrier?.name || 'Unknown';
      acc[carrierName] = (acc[carrierName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const insights: ActionableInsight[] = [];

    // Find carriers with unusually high lapse rates
    Object.entries(lapseByCarrier).forEach(([carrier, count]: [string, number]) => {
      if (count >= 3) {
        insights.push({
          id: `lapse-pattern-${carrier}`,
          severity: 'high',
          category: 'retention',
          title: `High Lapse Rate with ${carrier}`,
          description: `${count} policies from ${carrier} have lapsed in the selected period, indicating a potential issue with this carrier's products or pricing.`,
          impact: `${count} policies lost`,
          recommendedActions: [
            `Review ${carrier} product fit with your client base`,
            'Compare pricing vs competitors',
            'Check if carrier service quality has declined',
            'Consider focusing on carriers with better retention',
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
    const { data: commissionData } = await supabase
      .rpc('get_user_commission_profile', { p_user_id: context.userId });

    if (commissionData && commissionData.length > 0) {
      const profile = commissionData[0];

      // Check if premium-weighted rate differs significantly from count-weighted
      if (profile.data_quality === 'insufficient') {
        insights.push({
          id: 'revenue-insufficient-data',
          severity: 'medium',
          category: 'performance',
          title: 'Insufficient Data for Accurate Commission Forecasting',
          description: `You have less than 5 policies or $10,000 in premium. Commission projections may be inaccurate.`,
          impact: 'Forecasting accuracy reduced',
          recommendedActions: [
            'Focus on writing more policies to improve data quality',
            'Target minimum 5 policies or $10,000 in premium for reliable forecasts',
          ],
          priority: 4,
        });
      }

      // Check average premium opportunity
      const { data: policies } = await supabase
        .from('policies')
        .select('annual_premium')
        .eq('user_id', context.userId)
        .eq('status', 'active');

      if (policies && policies.length > 10) {
        const avgPremium = policies.reduce((sum: number, p: any) => sum + (p.annual_premium || 0), 0) / policies.length;
        const topQuartilePremium = policies
          .map((p: any) => p.annual_premium || 0)
          .sort((a: number, b: number) => b - a)
          .slice(0, Math.floor(policies.length * 0.25))
          .reduce((sum: number, premium: number) => sum + premium, 0) / Math.floor(policies.length * 0.25);

        if (topQuartilePremium > avgPremium * 1.5) {
          const potentialIncrease = (topQuartilePremium - avgPremium) * policies.length;
          insights.push({
            id: 'revenue-premium-opportunity',
            severity: 'medium',
            category: 'opportunity',
            title: 'Opportunity to Increase Average Premium',
            description: `Your top 25% of policies have an average premium of $${topQuartilePremium.toFixed(2)}, while your overall average is $${avgPremium.toFixed(2)}.`,
            impact: `Potential additional $${potentialIncrease.toFixed(2)}/year in premium`,
            recommendedActions: [
              'Focus on selling products similar to your top performers',
              'Review what makes your high-premium policies successful',
              'Consider upselling existing clients to higher-premium products',
              'Target higher net-worth clients',
            ],
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
      .from('expenses')
      .select('*')
      .eq('user_id', context.userId)
      .gte('date', context.startDate.toISOString())
      .lte('date', context.endDate.toISOString());

    if (!currentExpenses || currentExpenses.length === 0) return insights;

    const totalExpenses = currentExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    // Get commission for same period
    const { data: commissions } = await supabase
      .from('commissions')
      .select('amount')
      .eq('user_id', context.userId)
      .eq('status', 'paid')
      .gte('payment_date', context.startDate.toISOString())
      .lte('payment_date', context.endDate.toISOString());

    const totalCommission = commissions?.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0;
    const expenseRatio = totalCommission > 0 ? (totalExpenses / totalCommission) * 100 : 0;

    // Alert if expense ratio is high
    if (expenseRatio > 40) {
      insights.push({
        id: 'expense-high-ratio',
        severity: 'high',
        category: 'expense',
        title: 'High Expense Ratio Detected',
        description: `Your expenses are ${expenseRatio.toFixed(1)}% of your commission income, which is above the recommended 25-35% range.`,
        impact: `Reducing expenses by 10% would save $${(totalExpenses * 0.1).toFixed(2)}`,
        recommendedActions: [
          'Review all recurring expenses for potential cuts',
          'Evaluate ROI on marketing spend',
          'Consider more cost-effective lead generation methods',
          'Negotiate better rates with vendors',
        ],
        priority: 8,
      });
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

    // Get all active policies
    const { data: activePolicies } = await supabase
      .from('policies')
      .select('client_id')
      .eq('user_id', context.userId)
      .eq('status', 'active');

    if (!activePolicies || activePolicies.length === 0) return insights;

    // Group by client_id
    const policiesPerClient = activePolicies.reduce((acc: Record<string, number>, p: any) => {
      const clientId = p.client_id;
      if (!clientId) return acc;
      acc[clientId] = (acc[clientId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const singlePolicyCount = Object.values(policiesPerClient).filter((count: number) => count === 1).length;
    const totalClients = Object.keys(policiesPerClient).length;

    if (singlePolicyCount > 5) {
      insights.push({
        id: 'opportunity-cross-sell',
        severity: 'medium',
        category: 'opportunity',
        title: `${singlePolicyCount} Clients Have Only One Policy`,
        description: `You have ${singlePolicyCount} out of ${totalClients} clients with only one policy, representing potential cross-sell opportunities.`,
        impact: `Selling just 1 additional policy to 20% of these clients could add significant revenue`,
        recommendedActions: [
          'Schedule policy review calls with single-policy clients',
          'Identify needs gaps (life, disability, long-term care, etc.)',
          'Create a systematic cross-sell campaign',
          'Offer bundling discounts if available',
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
      .from('policies')
      .select('effective_date, status')
      .eq('user_id', context.userId);

    if (!cohorts || cohorts.length === 0) return insights;

    // Calculate 13-month persistency
    const thirteenMonthsAgo = new Date();
    thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

    const cohortPolicies = cohorts.filter(
      p => new Date(p.effective_date) <= thirteenMonthsAgo,
    );
    const stillActive = cohortPolicies.filter(p => p.status === 'active');
    const persistency = cohortPolicies.length > 0
      ? (stillActive.length / cohortPolicies.length) * 100
      : 0;

    // Alert if persistency is low
    if (cohortPolicies.length >= 10 && persistency < 70) {
      insights.push({
        id: 'risk-low-persistency',
        severity: 'critical',
        category: 'risk',
        title: 'Low 13-Month Persistency Rate',
        description: `Your 13-month persistency is ${persistency.toFixed(1)}%, which is below industry average (typically 75-85%).`,
        impact: `Low persistency increases chargebacks and reduces long-term income`,
        recommendedActions: [
          'Improve client onboarding and education',
          'Increase touchpoints in first 90 days',
          'Review product suitability and pricing',
          'Implement systematic client retention program',
        ],
        priority: 9,
      });
    }

    return insights;
  }
}
