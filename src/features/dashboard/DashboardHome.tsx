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
import { MetricsCard } from '../analytics';
import { useExpenseMetrics, useConstants } from '../../hooks';
import { useMetrics } from '../../hooks/useMetrics';
import { getBreakevenCalculation, getTargetCalculation } from '../../utils/calculationUtils';
import { CalculationResult } from '../../types/expense.types';

export const DashboardHome: React.FC = () => {
  // Use new modular hooks
  const { data: expenseMetrics } = useExpenseMetrics();
  const { data: constants } = useConstants();
  const { commissionMetrics, policyMetrics, clientMetrics } = useMetrics();

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Create totals from expense metrics
  const totals = {
    personalTotal: expenseMetrics?.personalTotal || 0,
    businessTotal: expenseMetrics?.businessTotal || 0,
    monthlyExpenses: expenseMetrics?.monthlyTotal || 0,
  };

  // Create calculations based on constants and totals
  const createCalculationResult = (scenario: string, commissionNeeded: number): CalculationResult => {
    const avgAP = constants?.avgAP || 100000;
    const commissionRate = constants?.commissionRate || 0.1;

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

  // Create performance metrics based on constants and totals
  const performanceMetrics = {
    dailyAPTarget: Math.ceil((totals.monthlyExpenses * 12) / (constants?.commissionRate || 0.1) / 250), // 250 working days per year
    weeklyAPTarget: Math.ceil((totals.monthlyExpenses * 12) / (constants?.commissionRate || 0.1) / 50), // 50 working weeks per year
    quarterlyAPTarget: Math.ceil((totals.monthlyExpenses * 3) / (constants?.commissionRate || 0.1)), // quarterly
    commissionPerPolicy: (constants?.avgAP || 100000) * (constants?.commissionRate || 0.1),
    expenseRatio: commissionMetrics?.totalEarned ?
      ((totals.monthlyExpenses * 12) / commissionMetrics.totalEarned * 100).toFixed(1) : '0',
  };

  const breakeven = getBreakevenCalculation(calculations);
  const target1 = getTargetCalculation(calculations, constants?.target1 || 5000);
  const target2 = getTargetCalculation(calculations, constants?.target2 || 10000);

  return (
    <div className="dashboard-home">
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div className="dashboard-header">
          <h1>Commission Dashboard</h1>
          <p>Your commission tracking overview and key performance metrics</p>
        </div>

        {/* Key Performance Metrics */}
        <div className="dashboard-metrics-grid">
          <MetricsCard
            title="Monthly Expenses"
            value={formatCurrency(totals.monthlyExpenses)}
            subtitle="Total monthly obligations"
            icon={<DollarSign className="w-5 h-5" />}
            color="blue"
          />
          <MetricsCard
            title="Breakeven Target"
            value={formatCurrency(breakeven?.commissionNeeded || 0)}
            subtitle="Commission needed to break even"
            icon={<Target className="w-5 h-5" />}
            color="yellow"
          />
          <MetricsCard
            title="Total Commission YTD"
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
        </div>

        {/* Commission Goals Overview */}
        <div className="dashboard-section">
          <h2>
            <Calculator size={20} />
            Commission Goals Overview
          </h2>
          <div className="commission-goals-grid">
            {/* Breakeven Card */}
            <div className="goal-card" style={{
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%)',
              border: '2px solid #1a1a1a'
            }}>
              <h3>Breakeven</h3>
              <div className="goal-amount" style={{ color: '#1a1a1a' }}>
                {formatCurrency(breakeven?.commissionNeeded || 0)}
              </div>
              <div className="goal-detail" style={{ color: '#2d3748' }}>
                {breakeven?.policies100 || 0} policies needed
              </div>
              <div className="goal-detail" style={{ color: '#2d3748' }}>
                {formatCurrency(breakeven?.apNeeded100 || 0)} AP required
              </div>
            </div>

            {/* Target 1 Card */}
            <div className="goal-card" style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
              border: '2px solid #4a5568'
            }}>
              <h3>{target1?.scenario || 'Target 1'}</h3>
              <div className="goal-amount" style={{ color: '#1a1a1a' }}>
                {formatCurrency(target1?.commissionNeeded || 0)}
              </div>
              <div className="goal-detail" style={{ color: '#4a5568' }}>
                {target1?.policies100 || 0} policies needed
              </div>
              <div className="goal-detail" style={{ color: '#4a5568' }}>
                {formatCurrency(target1?.apNeeded100 || 0)} AP required
              </div>
            </div>

            {/* Target 2 Card */}
            <div className="goal-card" style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f7fafc 100%)',
              border: '2px solid #2d3748'
            }}>
              <h3>{target2?.scenario || 'Target 2'}</h3>
              <div className="goal-amount" style={{ color: '#1a1a1a' }}>
                {formatCurrency(target2?.commissionNeeded || 0)}
              </div>
              <div className="goal-detail" style={{ color: '#2d3748' }}>
                {target2?.policies100 || 0} policies needed
              </div>
              <div className="goal-detail" style={{ color: '#2d3748' }}>
                {formatCurrency(target2?.apNeeded100 || 0)} AP required
              </div>
            </div>
          </div>
        </div>

        {/* Performance Targets */}
        <div className="performance-grid">
          <div className="performance-section">
            <h2>
              <BarChart3 size={18} />
              Performance Targets
            </h2>
            <div>
              <div className="performance-item">
                <span className="label">Daily AP Target</span>
                <span className="value">
                  {formatCurrency(performanceMetrics?.dailyAPTarget || 0)}
                </span>
              </div>
              <div className="performance-item">
                <span className="label">Weekly AP Target</span>
                <span className="value">
                  {formatCurrency(performanceMetrics?.weeklyAPTarget || 0)}
                </span>
              </div>
              <div className="performance-item">
                <span className="label">Quarterly AP Target</span>
                <span className="value">
                  {formatCurrency(performanceMetrics?.quarterlyAPTarget || 0)}
                </span>
              </div>
              <div className="performance-item">
                <span className="label">Commission per Policy</span>
                <span className="value">
                  {formatCurrency(performanceMetrics?.commissionPerPolicy || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="performance-section">
            <h2>
              <Users size={18} />
              Quick Stats
            </h2>
            <div>
              <div className="performance-item">
                <span className="label">Total Clients</span>
                <span className="value">
                  {clientMetrics?.totalClients || 0}
                </span>
              </div>
              <div className="performance-item">
                <span className="label">Average Client Age</span>
                <span className="value">
                  {Math.round(clientMetrics?.averageAge || 0)} years
                </span>
              </div>
              <div className="performance-item">
                <span className="label">Expense Ratio</span>
                <span className="value">
                  {performanceMetrics?.expenseRatio || '0'}%
                </span>
              </div>
              <div className="performance-item">
                <span className="label">Personal Expenses</span>
                <span className="value">
                  {formatCurrency(totals.personalTotal)}
                </span>
              </div>
              <div className="performance-item">
                <span className="label">Business Expenses</span>
                <span className="value">
                  {formatCurrency(totals.businessTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="dashboard-section">
          <h2>
            <Calendar size={20} />
            Recent Activity
          </h2>
          <div className="recent-activity">
            <p>Recent policy and commission activity will appear here</p>
            <p className="coming-soon">This feature is coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
};