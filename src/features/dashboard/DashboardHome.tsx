// src/features/dashboard/DashboardHome.v2.tsx
// COMPLETELY REDESIGNED - NO CARD GRIDS, DATA-DENSE, PROFESSIONAL

import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PageLayout } from '../../components/layout';
import { useConstants } from '../../hooks';
import { useMetricsWithDateRange } from '../../hooks/useMetricsWithDateRange';
import { useCreateExpense } from '../../hooks/expenses/useCreateExpense';
import { useCreatePolicy } from '../../hooks/policies/useCreatePolicy';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import showToast from '../../utils/toast';
import { ExpenseDialog } from '../expenses/components/ExpenseDialog';
import { PolicyForm } from '../policies/PolicyForm';
import type { CreateExpenseData } from '../../types/expense.types';
import type { NewPolicyForm, CreatePolicyData } from '../../types/policy.types';
import { clientService } from '../../services/clients/clientService';
import { useAuth } from '../../contexts/AuthContext';
import { TimePeriod, getPeriodLabel, formatDateRange, getDaysInPeriod, DAYS_PER_PERIOD } from '../../utils/dateRange';
import { MetricTooltip } from '../../components/ui/MetricTooltip';

export const DashboardHome: React.FC = () => {
  // Navigation
  const navigate = useNavigate();

  // Auth
  const { user } = useAuth();

  // Data hooks
  const { data: constants } = useConstants();

  // Time period filter state
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly');

  // Always fetch MONTHLY data - we'll scale it for display based on timePeriod
  const {
    periodCommissions,
    periodExpenses,
    periodPolicies,
    periodClients,
    currentState,
    periodAnalytics,
    dateRange,
    isLoading
  } = useMetricsWithDateRange({ timePeriod: 'monthly' }); // ALWAYS fetch monthly data

  // Mutation hooks
  const createExpense = useCreateExpense();
  const createPolicy = useCreatePolicy();

  // Dialog state for quick actions
  const [activeDialog, setActiveDialog] = useState<'policy' | 'expense' | null>(null);

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  /**
   * Scale a value to the display period
   * This converts monthly totals to per-period breakdowns
   * For example: $5,000 monthly → $1,154 weekly → $164 daily → $60,000 yearly
   *
   * IMPORTANT: This assumes the input value is a MONTHLY total
   * and scales it to show the equivalent per-period amount
   */
  const scaleToDisplayPeriod = (monthlyValue: number): number => {
    switch (timePeriod) {
      case 'daily':
        return monthlyValue / 30.44;  // Divide by average days per month
      case 'weekly':
        return monthlyValue / 4.33;   // Divide by average weeks per month
      case 'monthly':
        return monthlyValue;          // Show as-is for monthly
      case 'yearly':
        return monthlyValue * 12;     // Multiply by 12 for annual
      default:
        return monthlyValue;
    }
  };

  /**
   * Scale a count/integer value to the display period
   * Uses the same logic but rounds to nearest integer
   */
  const scaleCountToDisplayPeriod = (monthlyCount: number): number => {
    return Math.round(scaleToDisplayPeriod(monthlyCount));
  };

  /**
   * Get the appropriate policies needed value based on selected timeframe
   * This breaks down large goals into manageable per-period targets
   */
  const getPoliciesNeededDisplay = (): number => {
    switch (timePeriod) {
      case 'daily':
        return periodAnalytics.paceMetrics.dailyTarget;
      case 'weekly':
        return periodAnalytics.paceMetrics.weeklyTarget;
      case 'monthly':
        return periodAnalytics.paceMetrics.monthlyTarget;
      case 'yearly':
        return periodAnalytics.policiesNeeded;
    }
  };

  /**
   * Get the timeframe-appropriate label suffix for metrics
   * Examples: "Per Day", "Per Week", "Per Month", "Per Year"
   */
  const getPeriodSuffix = (): string => {
    switch (timePeriod) {
      case 'daily':
        return ' Per Day';
      case 'weekly':
        return ' Per Week';
      case 'monthly':
        return ' Per Month';
      case 'yearly':
        return ' Per Year';
    }
  };

  /**
   * Scale the breakeven amount to the selected display period
   * This shows how much needs to be earned per day/week/month/year
   */
  const getBreakevenDisplay = (): number => {
    const daysInRange = getDaysInPeriod(timePeriod);
    const dailyBreakeven = periodAnalytics.breakevenNeeded / Math.max(1, daysInRange);
    return dailyBreakeven * DAYS_PER_PERIOD[timePeriod];
  };


  /**
   * Handles quick action button clicks
   * Opens appropriate dialog or navigates to correct page
   */
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'Add Policy':
        setActiveDialog('policy');
        break;
      case 'Add Expense':
        setActiveDialog('expense');
        break;
      case 'View Reports':
        navigate({ to: '/analytics' });
        break;
      default:
        console.warn(`Unknown action: ${action}`);
    }
  };

  /**
   * Handles saving a new expense from the quick action dialog
   */
  const handleSaveExpense = async (data: CreateExpenseData) => {
    try {
      await createExpense.mutateAsync(data);
      showToast.success('Expense created successfully!');
      setActiveDialog(null);
    } catch (error) {
      showToast.error('Failed to create expense. Please try again.');
      console.error('Error creating expense:', error);
    }
  };

  /**
   * Adapter function for PolicyForm - handles client creation and policy creation
   * Copied from PolicyDashboard to ensure consistency
   */
  const handleAddPolicy = async (formData: NewPolicyForm) => {
    try {
      // Verify user is authenticated
      if (!user?.id) {
        throw new Error('You must be logged in to create a policy');
      }

      // Create or find the client (with user_id for RLS compliance)
      const client = await clientService.createOrFind({
        name: formData.clientName,
        email: formData.clientEmail || undefined,
        phone: formData.clientPhone || undefined,
        address: {
          state: formData.clientState,
        },
      }, user.id);

      // Calculate monthly premium based on payment frequency
      const monthlyPremium = formData.paymentFrequency === 'annual'
        ? (formData.annualPremium || 0) / 12
        : formData.paymentFrequency === 'semi-annual'
        ? (formData.annualPremium || 0) / 6
        : formData.paymentFrequency === 'quarterly'
        ? (formData.annualPremium || 0) / 3
        : (formData.annualPremium || 0) / 12; // Default to monthly

      // Validate commission percentage
      const commissionPercent = formData.commissionPercentage || 0;
      if (commissionPercent < 0 || commissionPercent > 999.99) {
        showToast.error('Commission percentage must be between 0 and 999.99');
        throw new Error('Commission percentage must be between 0 and 999.99');
      }

      // Convert form data to match database schema
      const policyData: CreatePolicyData = {
        policyNumber: formData.policyNumber,
        status: formData.status,
        clientId: client.id,
        userId: user.id,
        carrierId: formData.carrierId,
        product: formData.product,
        effectiveDate: new Date(formData.effectiveDate),
        termLength: formData.termLength,
        expirationDate: formData.expirationDate
          ? new Date(formData.expirationDate)
          : undefined,
        annualPremium: formData.annualPremium || 0,
        monthlyPremium: monthlyPremium,
        paymentFrequency: formData.paymentFrequency,
        commissionPercentage: commissionPercent / 100,
        notes: formData.notes || undefined,
      };

      const result = await createPolicy.mutateAsync(policyData);
      showToast.success(`Policy ${result.policyNumber} created successfully!`);
      setActiveDialog(null);
      return result;
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to create policy. Please try again.';
      showToast.error(errorMessage);
      console.error('Error creating policy:', error);
      throw error; // Re-throw to keep modal open
    }
  };

  // Calculate derived metrics
  const lapsedRate = (periodPolicies.lapsed / Math.max(1, periodPolicies.newCount)) * 100;
  const cancellationRate = (periodPolicies.cancelled / Math.max(1, periodPolicies.newCount)) * 100;
  const avgClientValue = periodClients.newCount > 0
    ? periodClients.totalValue / periodClients.newCount
    : 0;

  // Date calculations
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed = now.getDate();
  const monthProgress = (daysPassed / daysInMonth) * 100;

  const isBreakeven = periodAnalytics.surplusDeficit >= 0;

  // Loading state for quick actions
  const isCreating = createPolicy.isPending || createExpense.isPending;

  return (
    <PageLayout>
      {/* COMPACT HEADER */}
      <div style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px 0' }}>
              Commission Tracker
            </h1>
            <div style={{ fontSize: '11px', color: '#656d76', display: 'flex', gap: '16px' }}>
              <span>Last Updated: {now.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span>Month Progress: {monthProgress.toFixed(0)}% ({daysPassed}/{daysInMonth} days)</span>
            </div>
          </div>

          {/* Time Period Switcher */}
          <div style={{
            display: 'flex',
            gap: '4px',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '8px',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
          }}>
            {(['daily', 'weekly', 'monthly', 'yearly'] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: timePeriod === period
                    ? 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%)'
                    : 'transparent',
                  color: timePeriod === period ? '#ffffff' : '#64748b',
                  boxShadow: timePeriod === period ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT: 3-COLUMN SPLIT */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', gap: '16px', marginBottom: '16px' }}>

        {/* LEFT SIDEBAR - QUICK STATS */}
        <div style={{
          background: 'linear-gradient(180deg, #1a1a1a 0%, #2d3748 100%)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: '#f8f9fa',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #4a5568', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Key Metrics
          </div>

          {/* Stat Item Component */}
          {[
            {
              label: `${getPeriodLabel(timePeriod)} Commission Earned`,
              value: formatCurrency(scaleToDisplayPeriod(periodCommissions.earned)),
              trend: periodAnalytics.surplusDeficit >= 0 ? 'up' : 'down',
              color: periodCommissions.earned > 0 ? '#10b981' : '#ef4444',
              tooltip: {
                title: `${getPeriodLabel(timePeriod)} Commission Earned`,
                description: `Commission earned scaled to ${timePeriod.toLowerCase()} period.`,
                formula: `Monthly total ${timePeriod === 'weekly' ? '÷ 4.33' : timePeriod === 'daily' ? '÷ 30.44' : timePeriod === 'yearly' ? '× 12' : ''}`,
                example: `$5,000 monthly → ${timePeriod === 'weekly' ? '$1,154 weekly' : timePeriod === 'daily' ? '$164 daily' : timePeriod === 'yearly' ? '$60,000 yearly' : '$5,000 monthly'}`,
                note: `Scaled from monthly total to show ${timePeriod} breakdown`
              }
            },
            {
              label: 'Pending Pipeline',
              value: formatCurrency(currentState.pendingPipeline),
              color: '#3b82f6',
              tooltip: {
                title: 'Pending Pipeline',
                description: 'Total value of ALL commissions awaiting payment (current state, not filtered by period).',
                formula: 'SUM(advance_amount) WHERE status=pending',
                example: 'Shows total amount you are currently owed',
                note: 'This is a point-in-time metric - does NOT change with time period'
              }
            },
            {
              label: `${getPeriodLabel(timePeriod)} Total Expenses`,
              value: formatCurrency(scaleToDisplayPeriod(periodExpenses.total)),
              color: '#f59e0b',
              tooltip: {
                title: `${getPeriodLabel(timePeriod)} Total Expenses`,
                description: `Expenses scaled to ${timePeriod.toLowerCase()} period.`,
                formula: `Monthly total ${timePeriod === 'weekly' ? '÷ 4.33' : timePeriod === 'daily' ? '÷ 30.44' : timePeriod === 'yearly' ? '× 12' : ''}`,
                example: `$5,000 monthly → ${timePeriod === 'weekly' ? '$1,154 weekly' : timePeriod === 'daily' ? '$164 daily' : timePeriod === 'yearly' ? '$60,000 yearly' : '$5,000 monthly'}`,
                note: `Scaled from monthly total to show ${timePeriod} breakdown`
              }
            },
            {
              label: `${getPeriodLabel(timePeriod)} Net Income`,
              value: formatCurrency(Math.abs(scaleToDisplayPeriod(periodAnalytics.surplusDeficit))),
              trend: periodAnalytics.surplusDeficit >= 0 ? 'up' : 'down',
              color: periodAnalytics.surplusDeficit >= 0 ? '#10b981' : '#ef4444',
              tooltip: {
                title: `${getPeriodLabel(timePeriod)} Net Income`,
                description: `Net income scaled to ${timePeriod.toLowerCase()} period.`,
                formula: `(Commission - Expenses) ${timePeriod === 'weekly' ? '÷ 4.33' : timePeriod === 'daily' ? '÷ 30.44' : timePeriod === 'yearly' ? '× 12' : ''}`,
                example: `Net income scaled to show ${timePeriod} breakdown`,
                note: `Scaled from monthly total to show ${timePeriod} breakdown`
              }
            },
            {
              label: 'Breakeven Needed' + getPeriodSuffix(),
              value: formatCurrency(Math.max(0, getBreakevenDisplay())),
              color: periodAnalytics.breakevenNeeded <= 0 ? '#10b981' : '#ef4444',
              tooltip: {
                title: 'Breakeven Needed' + getPeriodSuffix(),
                description: `Additional commission needed ${timePeriod === 'daily' ? 'per day' : timePeriod === 'weekly' ? 'per week' : timePeriod === 'monthly' ? 'per month' : 'per year'} to cover expenses. Scales with timeframe to show per-period breakdown.`,
                formula: 'IF deficit: (Expenses - Commission) / Days, ELSE: 0',
                example: 'Need $1,000 monthly ÷ 30 days = $33.33 per day',
                note: 'Green ($0) means you are profitable. Scales with timeframe selection.'
              }
            },
            {
              label: 'Policies Needed' + getPeriodSuffix(),
              value: getPoliciesNeededDisplay().toString(),
              color: '#8b5cf6',
              tooltip: {
                title: 'Policies Needed' + getPeriodSuffix(),
                description: `Number of new policies to sell ${timePeriod === 'daily' ? 'today' : timePeriod === 'weekly' ? 'this week' : timePeriod === 'monthly' ? 'this month' : 'this year'} to reach breakeven. Changes with timeframe selection to show per-period breakdown.`,
                formula: 'Breakeven Needed / Avg Commission per Policy / Days in Period',
                example: 'Need 60 policies monthly ÷ 30 days = 2 policies per day',
                note: 'Scales with selected timeframe to make goals achievable'
              }
            },
            {
              label: 'Active Policies',
              value: currentState.activePolicies.toString(),
              color: '#06b6d4',
              tooltip: {
                title: 'Active Policies',
                description: 'Total number of CURRENTLY active insurance policies (point-in-time).',
                formula: 'COUNT(policies) WHERE status=active',
                note: 'Does NOT change with time period - shows current state'
              }
            },
            {
              label: 'Total Policies',
              value: currentState.totalPolicies.toString(),
              color: '#64748b',
              tooltip: {
                title: 'Total Policies',
                description: 'Lifetime total of ALL policies ever written (active, lapsed, cancelled).',
                formula: 'COUNT(all policies)',
                note: 'Does NOT change with time period - shows lifetime total'
              }
            },
            {
              label: 'Retention Rate',
              value: formatPercent(currentState.retentionRate),
              color: currentState.retentionRate >= 80 ? '#10b981' : '#f59e0b',
              tooltip: {
                title: 'Retention Rate',
                description: 'Percentage of policies that remain active vs total ever written.',
                formula: '(Active Policies / Total Policies) × 100',
                example: '80 active / 100 total = 80% retention',
                note: 'Above 80% is good, below 70% needs attention'
              }
            },
            {
              label: 'Lapse Rate',
              value: formatPercent(lapsedRate),
              color: lapsedRate < 10 ? '#10b981' : '#ef4444',
              tooltip: {
                title: 'Lapse Rate',
                description: `Percentage of policies that lapsed in the ${timePeriod.toLowerCase()} period.`,
                formula: '(Lapsed Policies in Period / New Policies in Period) × 100',
                example: '2 lapsed / 20 new = 10% lapse rate',
                note: 'Below 10% is good, above 20% is concerning'
              }
            },
            {
              label: 'Total Clients',
              value: currentState.totalClients.toString(),
              color: '#ec4899',
              tooltip: {
                title: 'Total Clients',
                description: 'Lifetime total of unique clients across all policies.',
                formula: 'COUNT(DISTINCT clients)',
                note: 'Point-in-time metric - shows total client base'
              }
            },
            {
              label: 'Policies/Client',
              value: currentState.totalClients > 0 ? (currentState.totalPolicies / currentState.totalClients).toFixed(2) : '0',
              color: '#a855f7',
              tooltip: {
                title: 'Policies per Client',
                description: 'Average number of policies per client (cross-sell metric).',
                formula: 'Total Policies / Total Clients',
                example: '150 policies / 100 clients = 1.5 policies/client',
                note: 'Higher is better - shows cross-sell success'
              }
            },
            {
              label: 'Avg Premium',
              value: formatCurrency(periodPolicies.averagePremium),
              color: '#0ea5e9',
              tooltip: {
                title: 'Average Premium',
                description: `Average annual premium of new policies written in ${timePeriod.toLowerCase()} period.`,
                formula: 'AVG(annual_premium) for policies in period',
                example: 'Total premiums $100,000 / 50 policies = $2,000 avg'
              }
            },
            {
              label: 'Avg Comm/Policy',
              value: formatCurrency(periodPolicies.newCount > 0
                ? periodCommissions.earned / periodPolicies.newCount
                : periodPolicies.averagePremium * periodCommissions.averageRate),
              color: '#14b8a6',
              tooltip: {
                title: 'Average Commission per Policy',
                description: `Average commission earned per policy in ${timePeriod.toLowerCase()} period.`,
                formula: 'Total Commission Earned / New Policies Written',
                example: '$10,000 commission / 50 policies = $200/policy'
              }
            },
            {
              label: 'Avg Client LTV',
              value: formatCurrency(avgClientValue),
              color: '#f97316',
              tooltip: {
                title: 'Average Client Lifetime Value',
                description: `Average total premium value per new client in ${timePeriod.toLowerCase()} period.`,
                formula: 'Total Premium Written / New Clients',
                example: '$100,000 premium / 25 new clients = $4,000 LTV',
                note: 'Higher LTV means more valuable clients'
              }
            },
          ].map((stat, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 0',
              borderBottom: i < 14 ? '1px solid #374151' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: '#cbd5e0' }}>{stat.label}</span>
                {stat.tooltip && (
                  <MetricTooltip {...stat.tooltip} />
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {stat.trend && (
                  stat.trend === 'up' ? <TrendingUp size={10} color="#10b981" /> : <TrendingDown size={10} color="#ef4444" />
                )}
                <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'Monaco, monospace', color: stat.color }}>
                  {stat.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CENTER - MAIN PERFORMANCE TABLE */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Performance Overview
          </div>

          {/* Status Banner */}
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            background: isBreakeven ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' : 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            {isBreakeven ? <CheckCircle size={20} color="#065f46" /> : <AlertCircle size={20} color="#9a3412" />}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: isBreakeven ? '#065f46' : '#9a3412' }}>
                {isBreakeven ? `✓ Above Breakeven (${getPeriodLabel(timePeriod)})` : `⚠ Below Breakeven (${getPeriodLabel(timePeriod)})`}
              </div>
              <div style={{ fontSize: '10px', color: isBreakeven ? '#047857' : '#92400e' }}>
                {isBreakeven
                  ? `${getPeriodLabel(timePeriod)} surplus of ${formatCurrency(scaleToDisplayPeriod(periodAnalytics.surplusDeficit))}`
                  : `Need ${formatCurrency(getBreakevenDisplay())}${getPeriodSuffix().toLowerCase()} (${Math.ceil(getPoliciesNeededDisplay())} policies)`
                }
              </div>
            </div>
          </div>

          {/* Performance Table */}
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px', fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>Metric</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>Current</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>Target</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>%</th>
                <th style={{ textAlign: 'center', padding: '8px 4px', fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { metric: `${getPeriodLabel(timePeriod)} Commission Earned`, current: scaleToDisplayPeriod(periodCommissions.earned), target: null, unit: '$', showTarget: false },
                { metric: `${getPeriodLabel(timePeriod)} New Policies`, current: scaleCountToDisplayPeriod(periodPolicies.newCount), target: null, unit: '#', showTarget: false },
                { metric: `${getPeriodLabel(timePeriod)} Premium Written`, current: scaleToDisplayPeriod(periodPolicies.premiumWritten), target: null, unit: '$', showTarget: false },
                { metric: `${getPeriodLabel(timePeriod)} New Clients`, current: scaleCountToDisplayPeriod(periodClients.newCount), target: null, unit: '#', showTarget: false },
                { metric: `Avg Premium per Policy`, current: periodPolicies.averagePremium, target: constants?.avgAP, unit: '$', showTarget: !!constants?.avgAP },
                { metric: `Avg Commission Rate`, current: periodCommissions.averageRate, target: null, unit: '%', showTarget: false },
                { metric: `${getPeriodLabel(timePeriod)} Total Expenses`, current: scaleToDisplayPeriod(periodExpenses.total), target: null, unit: '$', showTarget: false },
                { metric: `${getPeriodLabel(timePeriod)} Net Income`, current: scaleToDisplayPeriod(periodAnalytics.netIncome), target: null, unit: '$', showTarget: false },
              ].map((row, i) => {
                const pct = row.showTarget && row.target && row.target > 0 ? (row.current / row.target) * 100 : 0;
                const status = row.showTarget ? (pct >= 100 ? 'hit' : pct >= 75 ? 'good' : pct >= 50 ? 'fair' : 'poor') : 'neutral';
                const statusColor = status === 'hit' ? '#10b981' : status === 'good' ? '#3b82f6' : status === 'fair' ? '#f59e0b' : status === 'poor' ? '#ef4444' : '#94a3b8';

                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 4px', color: '#1a1a1a', fontWeight: 500 }}>{row.metric}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'Monaco, monospace', fontWeight: 600 }}>
                      {row.unit === '$' ? formatCurrency(row.current) : row.unit === '%' ? formatPercent(row.current) : row.current.toFixed(1)}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', color: '#656d76', fontFamily: 'Monaco, monospace' }}>
                      {row.showTarget && row.target ? (row.unit === '$' ? formatCurrency(row.target) : row.unit === '%' ? formatPercent(row.target) : row.target) : '—'}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600, color: statusColor }}>
                      {row.showTarget ? `${pct.toFixed(0)}%` : '—'}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                      {row.showTarget && (
                        <span style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: statusColor,
                        }} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* RIGHT SIDEBAR - ALERTS & INSIGHTS */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {/* Alerts */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '10px', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Alerts
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {periodCommissions.earned === 0 && (
                <div style={{ padding: '8px', borderRadius: '6px', background: '#fef3c7', borderLeft: '3px solid #f59e0b' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#92400e' }}>No Commissions {getPeriodLabel(timePeriod)}</div>
                  <div style={{ fontSize: '9px', color: '#78350f', marginTop: '2px' }}>No commission earned in this {timePeriod.toLowerCase()} period</div>
                </div>
              )}
              {!isBreakeven && (
                <div style={{ padding: '8px', borderRadius: '6px', background: '#fed7aa', borderLeft: '3px solid #ea580c' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#7c2d12' }}>Below Breakeven ({getPeriodLabel(timePeriod)})</div>
                  <div style={{ fontSize: '9px', color: '#7c2d12', marginTop: '2px' }}>Need {Math.ceil(getPoliciesNeededDisplay())} policies{getPeriodSuffix().toLowerCase()} to break even</div>
                </div>
              )}
              {periodPolicies.newCount === 0 && (
                <div style={{ padding: '8px', borderRadius: '6px', background: '#fef3c7', borderLeft: '3px solid #f59e0b' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#92400e' }}>No New Policies {getPeriodLabel(timePeriod)}</div>
                  <div style={{ fontSize: '9px', color: '#78350f', marginTop: '2px' }}>No policies written in this {timePeriod.toLowerCase()} period</div>
                </div>
              )}
              {lapsedRate > 10 && periodPolicies.newCount > 0 && (
                <div style={{ padding: '8px', borderRadius: '6px', background: '#fee2e2', borderLeft: '3px solid #dc2626' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#991b1b' }}>High Lapse Rate ({getPeriodLabel(timePeriod)})</div>
                  <div style={{ fontSize: '9px', color: '#7f1d1d', marginTop: '2px' }}>{formatPercent(lapsedRate)} of {timePeriod.toLowerCase()} policies lapsed</div>
                </div>
              )}
              {currentState.activePolicies === 0 && (
                <div style={{ padding: '8px', borderRadius: '6px', background: '#dbeafe', borderLeft: '3px solid #3b82f6' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#1e3a8a' }}>Get Started</div>
                  <div style={{ fontSize: '9px', color: '#1e40af', marginTop: '2px' }}>Add your first policy</div>
                </div>
              )}
              {periodExpenses.total > periodCommissions.earned && periodCommissions.earned > 0 && (
                <div style={{ padding: '8px', borderRadius: '6px', background: '#fed7aa', borderLeft: '3px solid #ea580c' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#7c2d12' }}>Expenses Exceed Income</div>
                  <div style={{ fontSize: '9px', color: '#7c2d12', marginTop: '2px' }}>{getPeriodLabel(timePeriod)} deficit: {formatCurrency(Math.abs(scaleToDisplayPeriod(periodAnalytics.surplusDeficit)))}</div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '10px', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Quick Actions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {['Add Policy', 'Add Expense', 'View Reports'].map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickAction(action)}
                  disabled={isCreating}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    background: isCreating ? '#f3f4f6' : '#f8f9fa',
                    fontSize: '10px',
                    fontWeight: 500,
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    color: isCreating ? '#94a3b8' : '#1a1a1a',
                    transition: 'all 0.2s ease',
                    opacity: isCreating ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isCreating) {
                      e.currentTarget.style.background = '#e2e8f0';
                      e.currentTarget.style.borderColor = '#cbd5e0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCreating) {
                      e.currentTarget.style.background = '#f8f9fa';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  {isCreating && action !== 'View Reports' ? `${action}...` : action}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION - DETAILED KPI GRID */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Detailed KPI Breakdown
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            { category: `${getPeriodLabel(timePeriod)} Financial`, kpis: [
              { label: 'Commission Earned', value: formatCurrency(scaleToDisplayPeriod(periodCommissions.earned)) },
              { label: 'Total Expenses', value: formatCurrency(scaleToDisplayPeriod(periodExpenses.total)) },
              { label: 'Net Income', value: formatCurrency(scaleToDisplayPeriod(periodAnalytics.netIncome)) },
              { label: 'Profit Margin', value: formatPercent(periodAnalytics.profitMargin) },
              { label: 'Recurring Expenses', value: formatCurrency(scaleToDisplayPeriod(periodExpenses.recurring)) },
              { label: 'One-Time Expenses', value: formatCurrency(scaleToDisplayPeriod(periodExpenses.oneTime)) },
            ]},
            { category: `${getPeriodLabel(timePeriod)} Production`, kpis: [
              { label: 'New Policies', value: scaleCountToDisplayPeriod(periodPolicies.newCount) },
              { label: 'Premium Written', value: formatCurrency(scaleToDisplayPeriod(periodPolicies.premiumWritten)) },
              { label: 'Avg Premium/Policy', value: formatCurrency(periodPolicies.averagePremium) },
              { label: 'Cancelled', value: scaleCountToDisplayPeriod(periodPolicies.cancelled) },
              { label: 'Lapsed', value: scaleCountToDisplayPeriod(periodPolicies.lapsed) },
              { label: 'Commissionable Value', value: formatCurrency(scaleToDisplayPeriod(periodPolicies.commissionableValue)) },
            ]},
            { category: `${getPeriodLabel(timePeriod)} Metrics`, kpis: [
              { label: 'Lapse Rate', value: formatPercent(lapsedRate) },
              { label: 'Cancel Rate', value: formatPercent(cancellationRate) },
              { label: 'Commission Count', value: scaleCountToDisplayPeriod(periodCommissions.count) },
              { label: 'Avg Commission', value: formatCurrency(periodCommissions.averageAmount) },
              { label: 'Avg Comm Rate', value: formatPercent(periodCommissions.averageRate) },
              { label: 'Expense Count', value: scaleCountToDisplayPeriod(periodExpenses.count) },
            ]},
            { category: `${getPeriodLabel(timePeriod)} Clients`, kpis: [
              { label: 'New Clients', value: scaleCountToDisplayPeriod(periodClients.newCount) },
              { label: 'Avg Client Age', value: periodClients.averageAge > 0 ? periodClients.averageAge.toFixed(1) : '—' },
              { label: 'Total Value', value: formatCurrency(scaleToDisplayPeriod(periodClients.totalValue)) },
              { label: 'Avg Value/Client', value: formatCurrency(avgClientValue) },
            ]},
            { category: 'Current Status', kpis: [
              { label: 'Active Policies', value: currentState.activePolicies },
              { label: 'Total Policies', value: currentState.totalPolicies },
              { label: 'Total Clients', value: currentState.totalClients },
              { label: 'Pending Pipeline', value: formatCurrency(currentState.pendingPipeline) },
              { label: 'Retention Rate', value: formatPercent(currentState.retentionRate) },
            ]},
            { category: 'Targets & Pace', kpis: [
              { label: 'Breakeven Needed' + getPeriodSuffix(), value: formatCurrency(Math.max(0, getBreakevenDisplay())) },
              { label: 'Policies Needed' + getPeriodSuffix(), value: Math.ceil(getPoliciesNeededDisplay()) },
              { label: 'Daily Target', value: periodAnalytics.paceMetrics.dailyTarget },
              { label: 'Weekly Target', value: periodAnalytics.paceMetrics.weeklyTarget },
              { label: 'Monthly Target', value: periodAnalytics.paceMetrics.monthlyTarget },
            ]},
          ].map((section, i) => (
            <div key={i} style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%)',
              border: '1px solid #cbd5e0',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {section.category}
              </div>
              {section.kpis.map((kpi, j) => (
                <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: j < section.kpis.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                  <span style={{ fontSize: '9px', color: '#656d76' }}>{kpi.label}</span>
                  <span style={{ fontSize: '10px', fontWeight: 600, fontFamily: 'Monaco, monospace', color: '#1a1a1a' }}>{kpi.value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Action Dialogs */}
      <ExpenseDialog
        open={activeDialog === 'expense'}
        onOpenChange={(open) => setActiveDialog(open ? 'expense' : null)}
        onSave={handleSaveExpense}
        isSubmitting={createExpense.isPending}
      />

      {/* Policy Modal - Using same pattern as PolicyDashboard */}
      {activeDialog === 'policy' && (
        <div className="modal-overlay" onClick={() => setActiveDialog(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Policy Submission</h2>
              <button className="modal-close" onClick={() => setActiveDialog(null)}>
                ×
              </button>
            </div>
            <PolicyForm
              onClose={() => setActiveDialog(null)}
              addPolicy={handleAddPolicy}
              updatePolicy={() => Promise.resolve()}
              getPolicyById={() => undefined}
            />
          </div>
        </div>
      )}
    </PageLayout>
  );
};
