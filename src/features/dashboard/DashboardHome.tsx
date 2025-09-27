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
import { useExpensesContext } from '../../contexts/ExpensesContext';
import { useMetrics } from '../../hooks/useMetrics';
import { getBreakevenCalculation, getTargetCalculation } from '../../utils/calculationUtils';

export const DashboardHome: React.FC = () => {
  const { totals, calculations, performanceMetrics, constants } = useExpensesContext();
  const { commissionMetrics, policyMetrics, clientMetrics } = useMetrics();

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const breakeven = getBreakevenCalculation(calculations);
  const target1 = getTargetCalculation(calculations, constants.target1);
  const target2 = getTargetCalculation(calculations, constants.target2);

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