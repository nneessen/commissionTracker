// src/services/reports/reportGenerationService.ts

import {
  Report,
  ReportFilters,
  ReportType,
  ReportSection,
  ReportMetric,
} from '../../types/reports.types';
import { supabase } from '../base/supabase';
import { InsightsService } from './insightsService';
import { ForecastingService } from './forecastingService';
import { formatCurrency, formatPercent } from '../../lib/format';

interface GenerateReportOptions {
  userId: string;
  type: ReportType;
  filters: ReportFilters;
}

/**
 * Report Generation Service - Creates comprehensive, actionable reports
 */
export class ReportGenerationService {
  /**
   * Generate a report based on type and filters
   */
  static async generateReport(options: GenerateReportOptions): Promise<Report> {
    const { userId, type, filters } = options;

    switch (type) {
      case 'executive-dashboard':
        return this.generateExecutiveDashboard(userId, filters);
      case 'commission-performance':
        return this.generateCommissionReport(userId, filters);
      case 'policy-performance':
        return this.generatePolicyReport(userId, filters);
      case 'client-relationship':
        return this.generateClientReport(userId, filters);
      case 'financial-health':
        return this.generateFinancialReport(userId, filters);
      case 'predictive-analytics':
        return this.generatePredictiveReport(userId, filters);
      default:
        throw new Error(`Unknown report type: ${type}`);
    }
  }

  /**
   * Generate Executive Dashboard Report
   * HIGH-LEVEL SNAPSHOT ONLY - no detailed tables
   * Designed to give quick overview and drive to detailed reports
   */
  private static async generateExecutiveDashboard(
    userId: string,
    filters: ReportFilters,
  ): Promise<Report> {
    // Fetch core data in parallel - minimal queries for snapshot
    const [commissions, expenses, policies, insights] = await Promise.all([
      this.fetchCommissionData(userId, filters),
      this.fetchExpenseData(userId, filters),
      this.fetchPolicyData(userId, filters),
      InsightsService.generateInsights({
        userId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }),
    ]);

    // Calculate key metrics
    const totalCommissionPaid = commissions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netIncome = totalCommissionPaid - totalExpenses;

    const activePolicies = policies.filter(p => p.status === 'active').length;
    const totalPolicies = policies.length;
    const totalPremium = policies.reduce((sum, p) => sum + (p.annual_premium || 0), 0);
    const retentionRate = totalPolicies > 0 ? activePolicies / totalPolicies : 0;

    const healthScore = this.calculateHealthScore({
      netIncome,
      activePolicies,
      totalPolicies,
      insights,
    });

    // Executive summary - 6 key numbers only
    const keyMetrics: ReportMetric[] = [
      { label: 'Net Income', value: formatCurrency(netIncome), trend: netIncome >= 0 ? 'up' : 'down' },
      { label: 'Commission Paid', value: formatCurrency(totalCommissionPaid) },
      { label: 'Expenses', value: formatCurrency(totalExpenses) },
      { label: 'Active Policies', value: activePolicies },
      { label: 'Total Premium', value: formatCurrency(totalPremium) },
      { label: 'Retention', value: formatPercent(retentionRate) },
    ];

    // Single section with top insights - no redundant tables
    const sections: ReportSection[] = [
      {
        id: 'key-insights',
        title: 'Action Items',
        description: 'Top priorities requiring attention',
        insights: insights.slice(0, 3),
      },
    ];

    return {
      id: `exec-${Date.now()}`,
      type: 'executive-dashboard',
      title: 'Executive Summary',
      subtitle: `${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`,
      generatedAt: new Date(),
      filters,
      summary: {
        healthScore,
        keyMetrics,
        topInsights: insights.slice(0, 3),
      },
      sections,
    };
  }

  /**
   * Generate Commission Performance Report
   * DEEP DIVE: Commission risk, carrier profitability, chargebacks
   * NOT for basic totals (see Executive Dashboard)
   */
  private static async generateCommissionReport(
    userId: string,
    filters: ReportFilters,
  ): Promise<Report> {
    // Fetch MVs for deep analysis
    const [chargebackSummaryResult, carrierPerformance, commissionAging] = await Promise.all([
      supabase
        .from('commission_chargeback_summary')
        .select('*')
        .eq('user_id', userId)
        .single(),
      this.fetchCarrierPerformance(userId),
      this.fetchCommissionAging(userId),
    ]);

    const chargebackSummary = chargebackSummaryResult.data;

    // Risk metrics from aging MV
    const totalAtRisk = commissionAging.reduce((sum, bucket) => sum + (bucket.total_at_risk || 0), 0);
    const totalEarned = commissionAging.reduce((sum, bucket) => sum + (bucket.total_earned || 0), 0);
    const criticalRisk = commissionAging.find(b => b.risk_level === 'Critical');
    const highRisk = commissionAging.find(b => b.risk_level === 'High');

    // Carrier profitability table
    const carrierTableRows = carrierPerformance
      .sort((a, b) => (b.total_commission_amount || 0) - (a.total_commission_amount || 0))
      .map(carrier => [
        carrier.carrier_name || 'Unknown',
        formatCurrency(carrier.total_commission_amount || 0),
        formatPercent((carrier.avg_commission_rate_pct || 0) / 100),
        formatPercent((carrier.persistency_rate || 0) / 100),
        carrier.total_policies || 0,
      ]);

    // Aging risk table
    const agingTableRows = commissionAging.map(bucket => [
      bucket.aging_bucket || 'Unknown',
      bucket.commission_count || 0,
      formatCurrency(bucket.total_at_risk || 0),
      bucket.risk_level || 'Unknown',
    ]);

    const sections: ReportSection[] = [
      {
        id: 'risk-summary',
        title: 'Chargeback Risk Summary',
        metrics: [
          { label: 'Total At-Risk', value: formatCurrency(totalAtRisk) },
          { label: 'Total Earned (Safe)', value: formatCurrency(totalEarned) },
          { label: 'Critical Risk', value: formatCurrency(criticalRisk?.total_at_risk || 0), description: 'Policies < 3 months' },
          { label: 'Chargeback Rate', value: formatPercent((chargebackSummary?.chargeback_rate_percentage || 0) / 100) },
        ],
      },
      {
        id: 'commission-aging',
        title: 'Risk by Policy Age',
        description: 'Younger policies = higher chargeback risk',
        tableData: {
          headers: ['Age Bucket', 'Count', 'At-Risk Amount', 'Risk Level'],
          rows: agingTableRows,
        },
      },
      {
        id: 'carrier-profitability',
        title: 'Carrier Profitability',
        description: 'Commission rates and persistency by carrier',
        tableData: {
          headers: ['Carrier', 'Commission', 'Comm Rate', 'Persistency', 'Policies'],
          rows: carrierTableRows,
        },
      },
    ];

    const insights = await InsightsService.generateInsights({
      userId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    // Calculate totals from MV data
    const totalPolicies = carrierPerformance.reduce((sum, c) => sum + (c.total_policies || 0), 0);
    const activePolicies = carrierPerformance.reduce((sum, c) => sum + (c.active_policies || 0), 0);

    const healthScore = this.calculateHealthScore({
      netIncome: 0,
      activePolicies,
      totalPolicies,
      insights,
    });

    return {
      id: `comm-${Date.now()}`,
      type: 'commission-performance',
      title: 'Commission Risk Analysis',
      subtitle: `${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`,
      generatedAt: new Date(),
      filters,
      summary: {
        healthScore,
        keyMetrics: sections[0].metrics || [],
        topInsights: insights.filter(i => i.category === 'chargeback').slice(0, 2),
      },
      sections,
    };
  }

  /**
   * Generate Policy Performance Report
   * DEEP DIVE: Cohort retention, persistency trends, lapse analysis
   * NOT for basic policy counts (see Executive Dashboard)
   */
  private static async generatePolicyReport(
    userId: string,
    filters: ReportFilters,
  ): Promise<Report> {
    // Fetch cohort retention MV + carrier performance for persistency breakdown
    const [cohortRetention, carrierPerformance, insights] = await Promise.all([
      this.fetchCohortRetention(userId),
      this.fetchCarrierPerformance(userId),
      InsightsService.generateInsights({
        userId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }),
    ]);

    // Calculate 13-month persistency from mature cohorts
    const matureCohorts = cohortRetention.filter(c => (c.months_since_issue || 0) >= 13);
    const avgPersistency13Month = matureCohorts.length > 0
      ? matureCohorts.reduce((sum, c) => sum + (c.retention_rate || 0), 0) / matureCohorts.length
      : 0;

    // Get unique cohort months for retention table
    const uniqueCohorts = [...new Map(
      cohortRetention.map(c => [c.cohort_month, c])
    ).values()].slice(0, 6);

    // Cohort retention table
    const cohortTableRows = uniqueCohorts.map(cohort => {
      const cohortDate = cohort.cohort_month ? new Date(cohort.cohort_month) : new Date();
      return [
        cohortDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        cohort.cohort_size || 0,
        cohort.still_active || 0,
        formatPercent((cohort.retention_rate || 0) / 100),
      ];
    });

    // Persistency by carrier table
    const persistencyByCarrier = carrierPerformance
      .filter(c => (c.total_policies || 0) > 0)
      .sort((a, b) => (b.persistency_rate || 0) - (a.persistency_rate || 0))
      .map(carrier => [
        carrier.carrier_name || 'Unknown',
        formatPercent((carrier.persistency_rate || 0) / 100),
        carrier.active_policies || 0,
        carrier.lapsed_policies || 0,
      ]);

    const sections: ReportSection[] = [
      {
        id: 'persistency-summary',
        title: 'Persistency Overview',
        metrics: [
          { label: '13-Month Persistency', value: formatPercent(avgPersistency13Month / 100) },
          { label: 'Total Cohorts Tracked', value: uniqueCohorts.length },
        ],
      },
      {
        id: 'cohort-retention',
        title: 'Cohort Retention',
        description: 'How each month\'s policies retain over time',
        tableData: {
          headers: ['Cohort Month', 'Initial', 'Active', 'Retention'],
          rows: cohortTableRows,
        },
      },
      {
        id: 'persistency-by-carrier',
        title: 'Persistency by Carrier',
        description: 'Which carriers have the best retention',
        tableData: {
          headers: ['Carrier', 'Persistency', 'Active', 'Lapsed'],
          rows: persistencyByCarrier,
        },
      },
    ];

    const totalPolicies = carrierPerformance.reduce((sum, c) => sum + (c.total_policies || 0), 0);
    const activePolicies = carrierPerformance.reduce((sum, c) => sum + (c.active_policies || 0), 0);

    const healthScore = this.calculateHealthScore({
      netIncome: 0,
      activePolicies,
      totalPolicies,
      insights,
    });

    return {
      id: `policy-${Date.now()}`,
      type: 'policy-performance',
      title: 'Persistency Analysis',
      subtitle: `${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`,
      generatedAt: new Date(),
      filters,
      summary: {
        healthScore,
        keyMetrics: sections[0].metrics || [],
        topInsights: insights.filter(i => i.category === 'retention').slice(0, 2),
      },
      sections,
    };
  }

  /**
   * Generate Client Relationship Report
   * DEEP DIVE: Client segmentation, cross-sell opportunities, top clients
   * NOT for basic counts (see Executive Dashboard)
   */
  private static async generateClientReport(
    userId: string,
    filters: ReportFilters,
  ): Promise<Report> {
    // Fetch client LTV from MV
    const [clientLTV, insights] = await Promise.all([
      this.fetchClientLTV(userId),
      InsightsService.generateInsights({
        userId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }),
    ]);

    const totalClients = clientLTV.length;
    const activePolicies = clientLTV.reduce((sum, c) => sum + (c.active_policies || 0), 0);
    const avgPoliciesPerClient = totalClients > 0 ? activePolicies / totalClients : 0;
    const crossSellOpportunities = clientLTV.filter(c => c.cross_sell_opportunity).length;

    // Client tiers
    const tierCounts = clientLTV.reduce((acc, c) => {
      const tier = c.client_tier || 'D';
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tierTableRows = [
      ['A - High Value', tierCounts['A'] || 0, '$5,000+'],
      ['B - Medium', tierCounts['B'] || 0, '$2,000-$4,999'],
      ['C - Standard', tierCounts['C'] || 0, '$500-$1,999'],
      ['D - Low', tierCounts['D'] || 0, '<$500'],
    ];

    // Top 5 clients only
    const topClientsRows = clientLTV
      .sort((a, b) => (b.active_premium || 0) - (a.active_premium || 0))
      .slice(0, 5)
      .map(client => [
        client.client_name || 'Unknown',
        formatCurrency(client.active_premium || 0),
        client.active_policies || 0,
        client.client_tier || 'D',
      ]);

    // Cross-sell opportunities list
    const crossSellClients = clientLTV
      .filter(c => c.cross_sell_opportunity)
      .sort((a, b) => (b.active_premium || 0) - (a.active_premium || 0))
      .slice(0, 5)
      .map(client => [
        client.client_name || 'Unknown',
        formatCurrency(client.active_premium || 0),
        'Single policy',
      ]);

    const sections: ReportSection[] = [
      {
        id: 'client-overview',
        title: 'Client Overview',
        metrics: [
          { label: 'Total Clients', value: totalClients },
          { label: 'Avg Policies/Client', value: avgPoliciesPerClient.toFixed(1) },
          { label: 'Cross-Sell Opportunities', value: crossSellOpportunities },
        ],
      },
      {
        id: 'client-tiers',
        title: 'Client Segmentation',
        tableData: {
          headers: ['Tier', 'Count', 'Premium Range'],
          rows: tierTableRows,
        },
      },
      {
        id: 'top-clients',
        title: 'Top Clients',
        tableData: {
          headers: ['Client', 'Premium', 'Policies', 'Tier'],
          rows: topClientsRows,
        },
      },
      {
        id: 'cross-sell',
        title: 'Cross-Sell Targets',
        description: 'High-value clients with only one policy',
        tableData: crossSellClients.length > 0 ? {
          headers: ['Client', 'Premium', 'Status'],
          rows: crossSellClients,
        } : undefined,
      },
    ];

    const totalPolicies = clientLTV.reduce((sum, c) => sum + (c.total_policies || 0), 0);
    const healthScore = this.calculateHealthScore({
      netIncome: 0,
      activePolicies,
      totalPolicies,
      insights,
    });

    return {
      id: `client-${Date.now()}`,
      type: 'client-relationship',
      title: 'Client Analysis',
      subtitle: `${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`,
      generatedAt: new Date(),
      filters,
      summary: {
        healthScore,
        keyMetrics: sections[0].metrics || [],
        topInsights: insights.filter(i => i.category === 'opportunity').slice(0, 2),
      },
      sections,
    };
  }

  /**
   * Generate Financial Health Report
   * DEEP DIVE: Expense breakdown, category analysis, profitability
   * NOT for basic totals (see Executive Dashboard)
   */
  private static async generateFinancialReport(
    userId: string,
    filters: ReportFilters,
  ): Promise<Report> {
    // Fetch expense summary MV + raw expense data for breakdown
    const [expenseSummary, expenses, commissions, insights] = await Promise.all([
      this.fetchExpenseSummary(userId),
      this.fetchExpenseData(userId, filters),
      this.fetchCommissionData(userId, filters),
      InsightsService.generateInsights({
        userId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }),
    ]);

    const totalCommission = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const expenseRatio = totalCommission > 0 ? (totalExpenses / totalCommission) * 100 : 0;

    // Aggregate expenses by category
    const byCategory = expenses.reduce((acc, e) => {
      const cat = e.category || 'Other';
      acc[cat] = (acc[cat] || 0) + (e.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    const categoryTableRows = Object.entries(byCategory)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .map(([category, amount]) => [
        category,
        formatCurrency(amount as number),
        formatPercent(totalExpenses > 0 ? (amount as number) / totalExpenses : 0),
      ]);

    // Recurring vs one-time
    const recurringExpenses = expenses.filter(e => e.is_recurring).reduce((sum, e) => sum + (e.amount || 0), 0);
    const oneTimeExpenses = totalExpenses - recurringExpenses;

    const sections: ReportSection[] = [
      {
        id: 'expense-overview',
        title: 'Expense Overview',
        metrics: [
          { label: 'Total Expenses', value: formatCurrency(totalExpenses) },
          { label: 'Expense Ratio', value: formatPercent(expenseRatio / 100), description: 'Expenses as % of commission' },
          { label: 'Recurring', value: formatCurrency(recurringExpenses) },
          { label: 'One-Time', value: formatCurrency(oneTimeExpenses) },
        ],
      },
      {
        id: 'expense-breakdown',
        title: 'Expenses by Category',
        tableData: {
          headers: ['Category', 'Amount', '% of Total'],
          rows: categoryTableRows,
        },
      },
    ];

    return {
      id: `financial-${Date.now()}`,
      type: 'financial-health',
      title: 'Expense Analysis',
      subtitle: `${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`,
      generatedAt: new Date(),
      filters,
      summary: {
        healthScore: expenseRatio < 30 ? 85 : expenseRatio < 50 ? 65 : 40,
        keyMetrics: sections[0].metrics || [],
        topInsights: insights.filter(i => i.category === 'expense').slice(0, 2),
      },
      sections,
    };
  }

  /**
   * Generate Predictive Analytics Report
   * UNIQUE: Future projections, trends, forecasting
   */
  private static async generatePredictiveReport(
    userId: string,
    filters: ReportFilters,
  ): Promise<Report> {
    const forecast = await ForecastingService.forecastCommission(userId);

    const sections: ReportSection[] = [
      {
        id: 'forecast',
        title: 'Commission Forecast',
        metrics: [
          { label: 'Next Month', value: formatCurrency(forecast.nextMonth), trend: forecast.trend === 'stable' ? 'neutral' : forecast.trend },
          { label: '3-Month Total', value: formatCurrency(forecast.threeMonth) },
          { label: 'Confidence', value: formatPercent(forecast.confidence) },
          { label: 'Trend', value: forecast.trend === 'up' ? 'Growing' : forecast.trend === 'down' ? 'Declining' : 'Stable' },
        ],
      },
    ];

    // Add warnings if any
    if (forecast.warnings.length > 0) {
      sections.push({
        id: 'forecast-notes',
        title: 'Notes',
        insights: forecast.warnings.map((warning, i) => ({
          id: `note-${i}`,
          severity: 'info' as const,
          category: 'performance' as const,
          title: 'Forecast Note',
          description: warning,
          impact: '',
          recommendedActions: [],
          priority: 3,
        })),
      });
    }

    return {
      id: `predictive-${Date.now()}`,
      type: 'predictive-analytics',
      title: 'Revenue Forecast',
      subtitle: `Based on ${forecast.historicalMonths} months of data`,
      generatedAt: new Date(),
      filters,
      summary: {
        healthScore: Math.round(forecast.confidence * 100),
        keyMetrics: sections[0].metrics || [],
        topInsights: [],
      },
      sections,
    };
  }

  // Helper methods

  private static async fetchCommissionData(userId: string, filters: ReportFilters) {
    const { data } = await supabase
      .from('commissions')
      .select('*')
      .eq('user_id', userId)
      .gte('payment_date', filters.startDate.toISOString())
      .lte('payment_date', filters.endDate.toISOString());

    return data || [];
  }

  private static async fetchExpenseData(userId: string, filters: ReportFilters) {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .gte('date', filters.startDate.toISOString())
      .lte('date', filters.endDate.toISOString());

    return data || [];
  }

  private static async fetchPolicyData(userId: string, filters: ReportFilters) {
    const { data } = await supabase
      .from('policies')
      .select('*')
      .eq('user_id', userId)
      .gte('effective_date', filters.startDate.toISOString())
      .lte('effective_date', filters.endDate.toISOString());

    return data || [];
  }

  // ============================================================================
  // Materialized View Fetch Methods - Pre-aggregated data for faster reports
  // ============================================================================

  /**
   * Fetch carrier performance metrics from materialized view
   * Pre-computed: persistency rates, commission rates, policy counts by carrier
   */
  private static async fetchCarrierPerformance(userId: string) {
    const { data, error } = await supabase
      .from('mv_carrier_performance')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching carrier performance:', error);
      return [];
    }
    return data || [];
  }

  /**
   * Fetch commission aging analysis from materialized view
   * Pre-computed: risk buckets (0-3mo, 3-6mo, etc.), at-risk amounts
   */
  private static async fetchCommissionAging(userId: string) {
    const { data, error } = await supabase
      .from('mv_commission_aging')
      .select('*')
      .eq('user_id', userId)
      .order('bucket_order', { ascending: true });

    if (error) {
      console.error('Error fetching commission aging:', error);
      return [];
    }
    return data || [];
  }

  /**
   * Fetch client lifetime value metrics from materialized view
   * Pre-computed: client tiers (A/B/C/D), cross-sell opportunities, LTV
   */
  private static async fetchClientLTV(userId: string) {
    const { data, error } = await supabase
      .from('mv_client_ltv')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching client LTV:', error);
      return [];
    }
    return data || [];
  }

  /**
   * Fetch cohort retention data from materialized view
   * Pre-computed: retention rates by cohort month
   */
  private static async fetchCohortRetention(userId: string) {
    const { data, error } = await supabase
      .from('mv_cohort_retention')
      .select('*')
      .eq('user_id', userId)
      .order('cohort_month', { ascending: false });

    if (error) {
      console.error('Error fetching cohort retention:', error);
      return [];
    }
    return data || [];
  }

  /**
   * Fetch production velocity metrics from materialized view
   * Pre-computed: weekly/monthly policies and premium
   */
  private static async fetchProductionVelocity(userId: string) {
    const { data, error } = await supabase
      .from('mv_production_velocity')
      .select('*')
      .eq('user_id', userId)
      .order('week_start', { ascending: false })
      .limit(12); // Last 12 weeks

    if (error) {
      console.error('Error fetching production velocity:', error);
      return [];
    }
    return data || [];
  }

  /**
   * Fetch expense summary from materialized view
   * Pre-computed: expenses by category and month
   */
  private static async fetchExpenseSummary(userId: string) {
    const { data, error } = await supabase
      .from('mv_expense_summary')
      .select('*')
      .eq('user_id', userId)
      .order('expense_month', { ascending: false });

    if (error) {
      console.error('Error fetching expense summary:', error);
      return [];
    }
    return data || [];
  }

  private static calculateHealthScore(params: {
    netIncome: number;
    activePolicies: number;
    totalPolicies: number;
    insights: any[];
  }): number {
    let score = 50; // Base score

    // Net income positive (+20)
    if (params.netIncome > 0) score += 20;

    // Good retention (+15)
    const retentionRate = params.totalPolicies > 0 ? params.activePolicies / params.totalPolicies : 0;
    if (retentionRate > 0.8) score += 15;
    else if (retentionRate > 0.7) score += 10;

    // Few critical insights (+15)
    const criticalInsights = params.insights.filter(i => i.severity === 'critical').length;
    if (criticalInsights === 0) score += 15;
    else if (criticalInsights <= 2) score += 8;

    return Math.min(100, Math.max(0, score));
  }
}
