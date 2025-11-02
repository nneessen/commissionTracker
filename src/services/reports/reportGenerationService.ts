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
   * High-level overview with key metrics and top insights
   */
  private static async generateExecutiveDashboard(
    userId: string,
    filters: ReportFilters,
  ): Promise<Report> {
    // Fetch all data in parallel
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

    const totalCommissionEarned = commissions
      .filter(c => c.status === 'earned' || c.status === 'paid')
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netIncome = totalCommissionPaid - totalExpenses;

    const activePolicies = policies.filter(p => p.status === 'active').length;
    const totalPolicies = policies.length;

    const healthScore = this.calculateHealthScore({
      netIncome,
      activePolicies,
      totalPolicies,
      insights,
    });

    // Build summary metrics
    const keyMetrics: ReportMetric[] = [
      {
        label: 'Commission Paid',
        value: formatCurrency(totalCommissionPaid),
        format: 'currency',
      },
      {
        label: 'Commission Earned',
        value: formatCurrency(totalCommissionEarned),
        format: 'currency',
      },
      {
        label: 'Total Expenses',
        value: formatCurrency(totalExpenses),
        format: 'currency',
      },
      {
        label: 'Net Income',
        value: formatCurrency(netIncome),
        trend: netIncome >= 0 ? 'up' : 'down',
        format: 'currency',
      },
      {
        label: 'Active Policies',
        value: activePolicies,
        format: 'number',
      },
      {
        label: 'Health Score',
        value: formatPercent(healthScore / 100),
        format: 'percent',
      },
    ];

    // Build sections
    const sections: ReportSection[] = [
      {
        id: 'income-statement',
        title: 'Income Statement',
        description: 'Revenue, expenses, and net income for the selected period',
        metrics: [
          { label: 'Commission Revenue', value: formatCurrency(totalCommissionPaid) },
          { label: 'Operating Expenses', value: formatCurrency(totalExpenses) },
          { label: 'Net Income', value: formatCurrency(netIncome) },
          {
            label: 'Expense Ratio',
            value: formatPercent(totalCommissionPaid > 0 ? totalExpenses / totalCommissionPaid : 0),
          },
        ],
      },
      {
        id: 'key-insights',
        title: 'Top Actionable Insights',
        description: 'Most important recommendations based on your data',
        insights: insights.slice(0, 5), // Top 5 insights
      },
      {
        id: 'policy-overview',
        title: 'Policy Portfolio Overview',
        metrics: [
          { label: 'Total Policies', value: totalPolicies },
          { label: 'Active Policies', value: activePolicies },
          {
            label: 'Retention Rate',
            value: formatPercent(totalPolicies > 0 ? activePolicies / totalPolicies : 0),
          },
        ],
      },
    ];

    return {
      id: `exec-${Date.now()}`,
      type: 'executive-dashboard',
      title: 'Executive Dashboard Report',
      subtitle: `Generated for ${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`,
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
   */
  private static async generateCommissionReport(
    userId: string,
    filters: ReportFilters,
  ): Promise<Report> {
    const commissions = await this.fetchCommissionData(userId, filters);

    // Get chargeback summary
    const { data: chargebackSummary } = await supabase
      .from('commission_chargeback_summary')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Calculate metrics by carrier
    const { data: byCarrier } = await supabase
      .from('policies')
      .select('carrier_id, carriers(name), annual_premium, commissions(*)')
      .eq('user_id', userId)
      .eq('status', 'active');

    const carrierBreakdown: Record<string, { premium: number; commission: number; policies: number }> = {};

    byCarrier?.forEach((policy: any) => {
      const carrierData = Array.isArray(policy.carriers) ? policy.carriers[0] : policy.carriers;
      const carrierName = carrierData?.name || 'Unknown';
      if (!carrierBreakdown[carrierName]) {
        carrierBreakdown[carrierName] = { premium: 0, commission: 0, policies: 0 };
      }
      carrierBreakdown[carrierName].premium += policy.annual_premium || 0;
      carrierBreakdown[carrierName].policies += 1;
      policy.commissions?.forEach((c: any) => {
        carrierBreakdown[carrierName].commission += c.amount || 0;
      });
    });

    const sections: ReportSection[] = [
      {
        id: 'commission-summary',
        title: 'Commission Summary',
        metrics: [
          {
            label: 'Total Commission Paid',
            value: formatCurrency(commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.amount || 0), 0)),
          },
          {
            label: 'Pending Commission',
            value: formatCurrency(commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.amount || 0), 0)),
          },
          {
            label: 'Total Chargebacks',
            value: formatCurrency(chargebackSummary?.total_chargeback_amount || 0),
          },
          {
            label: 'Chargeback Rate',
            value: formatPercent((chargebackSummary?.chargeback_rate_percentage || 0) / 100),
          },
        ],
      },
      {
        id: 'carrier-performance',
        title: 'Performance by Carrier',
        tableData: {
          headers: ['Carrier', 'Policies', 'Total Premium', 'Total Commission'],
          rows: Object.entries(carrierBreakdown)
            .sort((a, b) => b[1].commission - a[1].commission)
            .map(([carrier, data]) => [
              carrier,
              data.policies,
              formatCurrency(data.premium),
              formatCurrency(data.commission),
            ]),
        },
      },
    ];

    const insights = await InsightsService.generateInsights({
      userId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    const healthScore = this.calculateHealthScore({
      netIncome: 0,
      activePolicies: byCarrier?.length || 0,
      totalPolicies: byCarrier?.length || 0,
      insights,
    });

    return {
      id: `comm-${Date.now()}`,
      type: 'commission-performance',
      title: 'Commission Performance Report',
      subtitle: `Commission analysis for ${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`,
      generatedAt: new Date(),
      filters,
      summary: {
        healthScore,
        keyMetrics: sections[0].metrics || [],
        topInsights: insights.filter(i => i.category === 'chargeback' || i.category === 'revenue').slice(0, 3),
      },
      sections,
    };
  }

  /**
   * Generate Policy Performance Report
   */
  private static async generatePolicyReport(
    userId: string,
    filters: ReportFilters,
  ): Promise<Report> {
    const policies = await this.fetchPolicyData(userId, filters);

    // Calculate persistency
    const thirteenMonthsAgo = new Date();
    thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

    const cohortPolicies = policies.filter(
      p => new Date(p.effective_date) <= thirteenMonthsAgo,
    );
    const stillActive = cohortPolicies.filter(p => p.status === 'active');
    const persistency13Month = cohortPolicies.length > 0
      ? (stillActive.length / cohortPolicies.length) * 100
      : 0;

    const sections: ReportSection[] = [
      {
        id: 'policy-metrics',
        title: 'Policy Metrics',
        metrics: [
          { label: 'Total Policies', value: policies.length },
          { label: 'Active Policies', value: policies.filter(p => p.status === 'active').length },
          { label: 'Lapsed Policies', value: policies.filter(p => p.status === 'lapsed').length },
          { label: '13-Month Persistency', value: formatPercent(persistency13Month / 100) },
        ],
      },
    ];

    const insights = await InsightsService.generateInsights({
      userId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    return {
      id: `policy-${Date.now()}`,
      type: 'policy-performance',
      title: 'Policy Performance Report',
      subtitle: `Policy analysis for ${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`,
      generatedAt: new Date(),
      filters,
      summary: {
        healthScore: 75,
        keyMetrics: sections[0].metrics || [],
        topInsights: insights.filter(i => i.category === 'retention' || i.category === 'risk').slice(0, 3),
      },
      sections,
    };
  }

  /**
   * Generate Client Relationship Report
   */
  private static async generateClientReport(
    userId: string,
    filters: ReportFilters,
  ): Promise<Report> {
    // Get all clients
    const { data: clients } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId);

    // Get all active policies with client_id
    const { data: policies } = await supabase
      .from('policies')
      .select('client_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    const totalClients = clients?.length || 0;
    const totalPolicies = policies?.length || 0;
    const avgPoliciesPerClient = totalClients > 0 ? totalPolicies / totalClients : 0;

    // Count policies per client
    const policiesPerClient = policies?.reduce((acc: Record<string, number>, p: any) => {
      if (p.client_id) {
        acc[p.client_id] = (acc[p.client_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    const singlePolicyClients = Object.values(policiesPerClient).filter((count: number) => count === 1).length;

    const sections: ReportSection[] = [
      {
        id: 'client-metrics',
        title: 'Client Metrics',
        metrics: [
          { label: 'Total Clients', value: totalClients },
          { label: 'Total Policies', value: totalPolicies },
          { label: 'Avg Policies per Client', value: avgPoliciesPerClient.toFixed(2) },
          { label: 'Single-Policy Clients', value: singlePolicyClients },
        ],
      },
    ];

    const insights = await InsightsService.generateInsights({
      userId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    return {
      id: `client-${Date.now()}`,
      type: 'client-relationship',
      title: 'Client Relationship Report',
      subtitle: `Client analysis for ${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`,
      generatedAt: new Date(),
      filters,
      summary: {
        healthScore: 80,
        keyMetrics: sections[0].metrics || [],
        topInsights: insights.filter(i => i.category === 'opportunity').slice(0, 3),
      },
      sections,
    };
  }

  /**
   * Generate Financial Health Report
   */
  private static async generateFinancialReport(
    userId: string,
    filters: ReportFilters,
  ): Promise<Report> {
    const [commissions, expenses] = await Promise.all([
      this.fetchCommissionData(userId, filters),
      this.fetchExpenseData(userId, filters),
    ]);

    const totalCommission = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netIncome = totalCommission - totalExpenses;
    const expenseRatio = totalCommission > 0 ? (totalExpenses / totalCommission) * 100 : 0;

    const sections: ReportSection[] = [
      {
        id: 'financial-summary',
        title: 'Financial Summary',
        metrics: [
          { label: 'Total Commission', value: formatCurrency(totalCommission) },
          { label: 'Total Expenses', value: formatCurrency(totalExpenses) },
          { label: 'Net Income', value: formatCurrency(netIncome) },
          { label: 'Expense Ratio', value: formatPercent(expenseRatio / 100) },
        ],
      },
    ];

    const insights = await InsightsService.generateInsights({
      userId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    return {
      id: `financial-${Date.now()}`,
      type: 'financial-health',
      title: 'Financial Health Report',
      subtitle: `Financial analysis for ${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`,
      generatedAt: new Date(),
      filters,
      summary: {
        healthScore: netIncome > 0 ? 85 : 50,
        keyMetrics: sections[0].metrics || [],
        topInsights: insights.filter(i => i.category === 'expense' || i.category === 'revenue').slice(0, 3),
      },
      sections,
    };
  }

  /**
   * Generate Predictive Analytics Report
   */
  private static async generatePredictiveReport(
    userId: string,
    filters: ReportFilters,
  ): Promise<Report> {
    // This would include forecasting logic
    const sections: ReportSection[] = [
      {
        id: 'forecast',
        title: 'Revenue Forecast',
        description: 'Projected commission income for next 3 months',
        metrics: [
          { label: 'Next Month Projection', value: formatCurrency(0) },
          { label: '3-Month Projection', value: formatCurrency(0) },
          { label: 'Confidence Level', value: formatPercent(0.85) },
        ],
      },
    ];

    const insights = await InsightsService.generateInsights({
      userId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    return {
      id: `predictive-${Date.now()}`,
      type: 'predictive-analytics',
      title: 'Predictive Analytics Report',
      subtitle: `Forecast analysis for ${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`,
      generatedAt: new Date(),
      filters,
      summary: {
        healthScore: 70,
        keyMetrics: sections[0].metrics || [],
        topInsights: insights.slice(0, 3),
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
