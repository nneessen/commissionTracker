// src/features/dashboard/DashboardHome.tsx

import React from 'react';
import {
  TrendingUp,
  DollarSign,
  Target,
  FileText,
  Users,
  Calendar,
  BarChart3,
  Calculator
} from 'lucide-react';
import { PageLayout } from '../../components/layout';
import { MetricsCard } from '../analytics';
import { useExpenseMetrics, useConstants } from '../../hooks';
import { useMetrics } from '../../hooks/useMetrics';
import { getBreakevenCalculation, getTargetCalculation } from '../../utils/calculationUtils';
import {
  FinancialHealthCard,
  PerformanceMetrics,
  PaceTracker,
  ActivityFeed,
} from './components';

export const DashboardHome: React.FC = () => {
  // Use new modular hooks
  const { data: expenseMetrics } = useExpenseMetrics();
  const { data: constants } = useConstants(); // Only for user-configurable targets
  const { commissionMetrics, policyMetrics, clientMetrics } = useMetrics();

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Create totals from expense metrics
  const totals = {
    personalTotal: expenseMetrics?.personal || 0,
    businessTotal: expenseMetrics?.business || 0,
    monthlyExpenses: expenseMetrics?.monthlyTotal || 0,
  };

  // Create calculations based on constants and totals
  interface CalculationResult {
    scenario: string;
    commissionNeeded: number;
    apNeeded100: number;
    policies100: number;
    apNeeded90: number;
    policies90: number;
    apNeeded80: number;
    policies80: number;
    apNeeded70: number;
    policies70: number;
  }

  const createCalculationResult = (scenario: string, commissionNeeded: number): CalculationResult => {
    // Use REAL data from actual policies and commissions, NOT hardcoded constants
    const avgAP = policyMetrics?.averagePremium || 0;
    const commissionRate = policyMetrics?.activePolicies && policyMetrics.activePolicies > 0
      ? (commissionMetrics?.averageCommissionRate || 0)
      : (constants?.commissionRate || 0.1); // Fallback only if no policies exist yet

    // Prevent division by zero
    if (avgAP === 0 || commissionRate === 0) {
      return {
        scenario,
        commissionNeeded,
        apNeeded100: 0,
        policies100: 0,
        apNeeded90: 0,
        policies90: 0,
        apNeeded80: 0,
        policies80: 0,
        apNeeded70: 0,
        policies70: 0,
      };
    }

    const apNeeded100 = commissionNeeded / commissionRate;
    const policies100 = Math.ceil(apNeeded100 / avgAP);

    return {
      scenario,
      commissionNeeded,
      apNeeded100,
      policies100,
      apNeeded90: apNeeded100 * 0.9,
      policies90: Math.ceil((apNeeded100 * 0.9) / avgAP),
      apNeeded80: apNeeded100 * 0.8,
      policies80: Math.ceil((apNeeded100 * 0.8) / avgAP),
      apNeeded70: apNeeded100 * 0.7,
      policies70: Math.ceil((apNeeded100 * 0.7) / avgAP),
    };
  };

  const calculations: CalculationResult[] = [
    createCalculationResult('Breakeven', totals.monthlyExpenses),
    createCalculationResult(`+$${(constants?.target1 || 5000).toLocaleString()}`, totals.monthlyExpenses + (constants?.target1 || 5000)),
    createCalculationResult(`+$${(constants?.target2 || 10000).toLocaleString()}`, totals.monthlyExpenses + (constants?.target2 || 10000)),
  ];

  // Create performance metrics based on REAL data from policies and commissions
  const realCommissionRate = policyMetrics?.activePolicies && policyMetrics.activePolicies > 0
    ? (commissionMetrics?.averageCommissionRate || 0)
    : (constants?.commissionRate || 0.1);

  const realAvgAP = policyMetrics?.averagePremium || 0;

  const performanceMetrics = {
    dailyAPTarget: realCommissionRate > 0
      ? Math.ceil((totals.monthlyExpenses * 12) / realCommissionRate / 250) // 250 working days per year
      : 0,
    weeklyAPTarget: realCommissionRate > 0
      ? Math.ceil((totals.monthlyExpenses * 12) / realCommissionRate / 50) // 50 working weeks per year
      : 0,
    quarterlyAPTarget: realCommissionRate > 0
      ? Math.ceil((totals.monthlyExpenses * 3) / realCommissionRate) // quarterly
      : 0,
    commissionPerPolicy: realAvgAP * realCommissionRate,
    expenseRatio: commissionMetrics?.totalEarned ?
      ((totals.monthlyExpenses * 12) / commissionMetrics.totalEarned * 100).toFixed(1) : '0',
  };

  const breakeven = getBreakevenCalculation(calculations);
  const target1 = getTargetCalculation(calculations, constants?.target1 || 5000);
  const target2 = getTargetCalculation(calculations, constants?.target2 || 10000);

  // Calculate days remaining
  const now = new Date();
  const endOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
  const endOfYear = new Date(now.getFullYear(), 11, 31);
  const daysRemainingInQuarter = Math.ceil((endOfQuarter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemainingInYear = Math.ceil((endOfYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Prepare data for new components
  const annualExpenses = totals.monthlyExpenses * 12;
  const surplusDeficit = (commissionMetrics?.totalEarned || 0) - annualExpenses;

  return (
    <PageLayout>
      {/* Header */}
      <div className="dashboard-header">
        <h1>Commission Dashboard</h1>
        <p>Real-time KPI tracking powered by your policy data</p>
      </div>

      {/* Key Performance Metrics - Hero Section */}
      <div className="dashboard-metrics-grid">
        <MetricsCard
          title="YTD Commission"
          value={formatCurrency(commissionMetrics?.totalEarned || 0)}
          subtitle={`${formatCurrency(commissionMetrics?.totalPending || 0)} pending`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
          trend={{
            value: commissionMetrics?.yearOverYearGrowth || 0,
            isPositive: (commissionMetrics?.yearOverYearGrowth || 0) > 0,
          }}
        />
        <MetricsCard
          title="Active Policies"
          value={policyMetrics?.activePolicies || 0}
          subtitle={`${policyMetrics?.retentionRate?.toFixed(0) || 0}% retention rate`}
          icon={<FileText className="w-5 h-5" />}
          color="purple"
        />
        <MetricsCard
          title="Average Premium"
          value={formatCurrency(policyMetrics?.averagePremium || 0)}
          subtitle="Real from policy data"
          icon={<DollarSign className="w-5 h-5" />}
          color="blue"
        />
        <MetricsCard
          title="Pipeline Value"
          value={formatCurrency(commissionMetrics?.totalPending || 0)}
          subtitle="Expected commissions"
          icon={<Target className="w-5 h-5" />}
          color="yellow"
        />
      </div>

      {/* Financial Health Section */}
      <FinancialHealthCard
        monthlyExpenses={totals.monthlyExpenses}
        totalEarned={commissionMetrics?.totalEarned || 0}
        totalPending={commissionMetrics?.totalPending || 0}
        breakevenCommission={annualExpenses}
        surplusDeficit={surplusDeficit}
      />

      {/* Performance Metrics Section */}
      <PerformanceMetrics
        totalPolicies={policyMetrics?.totalPolicies || 0}
        activePolicies={policyMetrics?.activePolicies || 0}
        retentionRate={policyMetrics?.retentionRate || 0}
        averageCommissionPerPolicy={commissionMetrics?.averageCommissionPerPolicy || 0}
        topProducts={policyMetrics?.premiumByProduct ? Object.entries(policyMetrics.premiumByProduct).map(([product, premium]) => ({
          product,
          policies: policyMetrics.statusBreakdown?.active || 0,
          revenue: premium,
        })).slice(0, 3) : []}
        topCarriers={policyMetrics?.policyDistributionByCarrier?.slice(0, 3).map(carrier => ({
          carrierId: carrier.carrierId,
          carrierName: carrier.carrierName,
          policies: carrier.count,
          revenue: carrier.percentage,
        })) || []}
      />

      {/* Pace Tracker Section */}
      <PaceTracker
        policiesNeededPerWeek={Math.ceil((annualExpenses / realCommissionRate / realAvgAP) / 52)}
        policiesNeededPerMonth={Math.ceil((annualExpenses / realCommissionRate / realAvgAP) / 12)}
        daysRemainingInQuarter={daysRemainingInQuarter}
        daysRemainingInYear={daysRemainingInYear}
        currentRunRate={commissionMetrics?.totalEarned || 0}
        targetRunRate={annualExpenses}
        averageAP={realAvgAP}
      />

      {/* Activity Feed Section */}
      <ActivityFeed
        recentPolicies={[]}
        recentCommissions={[]}
      />
    </PageLayout>
  );
};