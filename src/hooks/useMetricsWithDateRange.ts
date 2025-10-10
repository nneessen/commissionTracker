// src/hooks/useMetricsWithDateRange.ts

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TimePeriod,
  DateRange,
  getDateRange,
  isInDateRange,
  getTimeRemaining,
  getDaysInPeriod,
  getAveragePeriodValue
} from '../utils/dateRange';
import { usePolicies } from './policies/usePolicies';
import { useCommissions } from './commissions/useCommissions';
import { useExpenses } from './expenses/useExpenses';
import { useCarriers } from './carriers/useCarriers';
import { Commission, Policy, Expense, ProductType } from '../types';

interface UseMetricsWithDateRangeOptions {
  timePeriod: TimePeriod;
  enabled?: boolean;
}

interface PeriodCommissionMetrics {
  earned: number;
  pending: number;
  count: number;
  byCarrier: Record<string, number>;
  byProduct: Record<ProductType, number>;
  byState: Record<string, number>;
  averageRate: number;
  averageAmount: number;
}

interface PeriodExpenseMetrics {
  total: number;
  byCategory: Record<string, number>;
  recurring: number;
  oneTime: number;
  count: number;
  averageAmount: number;
}

interface PeriodPolicyMetrics {
  newCount: number;
  premiumWritten: number;
  averagePremium: number;
  cancelled: number;
  lapsed: number;
  commissionableValue: number;
}

interface PeriodClientMetrics {
  newCount: number;
  averageAge: number;
  byState: Record<string, number>;
  totalValue: number;
}

interface CurrentStateMetrics {
  activePolicies: number;
  pendingPolicies: number;
  totalClients: number;
  pendingPipeline: number;
  retentionRate: number;
  totalPolicies: number;
}

interface PeriodAnalytics {
  surplusDeficit: number;
  breakevenNeeded: number;
  policiesNeeded: number;
  netIncome: number;
  profitMargin: number;
  paceMetrics: {
    dailyTarget: number;
    weeklyTarget: number;
    monthlyTarget: number;
    policiesPerDayNeeded: number;
  };
}

export interface DateFilteredMetrics {
  periodCommissions: PeriodCommissionMetrics;
  periodExpenses: PeriodExpenseMetrics;
  periodPolicies: PeriodPolicyMetrics;
  periodClients: PeriodClientMetrics;
  currentState: CurrentStateMetrics;
  periodAnalytics: PeriodAnalytics;
  dateRange: DateRange;
  isLoading: boolean;
}

export function useMetricsWithDateRange(
  options: UseMetricsWithDateRangeOptions
): DateFilteredMetrics {
  const { timePeriod, enabled = true } = options;

  // Get base data
  const { data: policies = [], isLoading: policiesLoading } = usePolicies();
  const { data: commissions = [], isLoading: commissionsLoading } = useCommissions();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: carriers = [], isLoading: carriersLoading } = useCarriers();

  const isLoading = policiesLoading || commissionsLoading || expensesLoading || carriersLoading;

  // Calculate date range
  const dateRange = useMemo(() => getDateRange(timePeriod), [timePeriod]);

  // Filter commissions by date range
  const filteredCommissions = useMemo(() => {
    return commissions.filter(commission => {
      const dateToCheck = commission.status === 'paid' && commission.paidDate
        ? new Date(commission.paidDate)
        : new Date(commission.createdAt);
      return isInDateRange(dateToCheck, dateRange);
    });
  }, [commissions, dateRange]);

  // Filter expenses by date range
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const expenseDate = expense.date || expense.createdAt;
      return isInDateRange(expenseDate, dateRange);
    });
  }, [expenses, dateRange]);

  // Filter policies by date range (for new policies)
  const filteredPolicies = useMemo(() => {
    return policies.filter(policy => {
      const policyDate = policy.effectiveDate || policy.createdAt;
      return isInDateRange(policyDate, dateRange);
    });
  }, [policies, dateRange]);

  // Calculate period commission metrics
  const periodCommissions = useMemo((): PeriodCommissionMetrics => {
    // Calculate actual totals for the period (NO SCALING)
    // Use advanceAmount (total commission received), not earnedAmount (portion earned over time)
    const earned = filteredCommissions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + (c.advanceAmount || 0), 0);

    const pending = filteredCommissions
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + (c.advanceAmount || 0), 0);

    // Group by carrier - use advanceAmount (total commission value)
    const byCarrier: Record<string, number> = {};
    filteredCommissions.forEach(c => {
      const carrierId = c.carrierId;
      if (carrierId) {
        byCarrier[carrierId] = (byCarrier[carrierId] || 0) + (c.advanceAmount || 0);
      }
    });

    // Group by product - use advanceAmount (total commission value)
    const byProduct: Record<ProductType, number> = {} as Record<ProductType, number>;
    filteredCommissions.forEach(c => {
      if (c.product) {
        byProduct[c.product] = (byProduct[c.product] || 0) + (c.advanceAmount || 0);
      }
    });

    // Group by state - use advanceAmount (total commission value)
    const byState: Record<string, number> = {};
    filteredCommissions.forEach(c => {
      const state = c.client?.state || 'Unknown';
      byState[state] = (byState[state] || 0) + (c.advanceAmount || 0);
    });

    const count = filteredCommissions.length;
    const averageRate = count > 0
      ? filteredCommissions.reduce((sum, c) => sum + (c.commissionRate || 0), 0) / count
      : 0;

    // Average based on total commission value, not just earned + pending
    const totalCommissionValue = filteredCommissions.reduce((sum, c) => sum + (c.advanceAmount || 0), 0);
    const averageAmount = count > 0 ? totalCommissionValue / count : 0;

    return {
      earned,
      pending,
      count,
      byCarrier,
      byProduct,
      byState,
      averageRate,
      averageAmount
    };
  }, [filteredCommissions]);

  // Calculate period expense metrics
  const periodExpenses = useMemo((): PeriodExpenseMetrics => {
    // Calculate actual totals for the period (NO SCALING)
    const total = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Group by category
    const byCategory: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const category = e.category || 'Uncategorized';
      byCategory[category] = (byCategory[category] || 0) + e.amount;
    });

    const recurring = filteredExpenses
      .filter(e => e.is_recurring)
      .reduce((sum, e) => sum + e.amount, 0);

    const oneTime = total - recurring;

    const count = filteredExpenses.length;
    const averageAmount = count > 0 ? total / count : 0;

    return {
      total,
      byCategory,
      recurring,
      oneTime,
      count,
      averageAmount
    };
  }, [filteredExpenses]);

  // Calculate period policy metrics
  const periodPolicies = useMemo((): PeriodPolicyMetrics => {
    const newCount = filteredPolicies.length;

    const premiumWritten = filteredPolicies.reduce(
      (sum, p) => sum + (p.annualPremium || 0),
      0
    );

    const averagePremium = newCount > 0 ? premiumWritten / newCount : 0;

    const cancelled = filteredPolicies.filter(p => p.status === 'cancelled').length;
    const lapsed = filteredPolicies.filter(p => p.status === 'lapsed').length;

    // Calculate total commissionable value
    const commissionableValue = filteredPolicies.reduce((sum, p) => {
      const premium = p.annualPremium || 0;
      const rate = p.commissionPercentage || 0;
      return sum + (premium * rate);
    }, 0);

    return {
      newCount,
      premiumWritten,
      averagePremium,
      cancelled,
      lapsed,
      commissionableValue
    };
  }, [filteredPolicies]);

  // Calculate period client metrics
  const periodClients = useMemo((): PeriodClientMetrics => {
    // Get unique clients from filtered policies
    const clientsInPeriod = new Map<string, any>();

    filteredPolicies.forEach(p => {
      const clientKey = p.client?.name || p.clientId;
      if (clientKey && !clientsInPeriod.has(clientKey)) {
        clientsInPeriod.set(clientKey, p.client);
      }
    });

    const newCount = clientsInPeriod.size;

    // Calculate average age
    let totalAge = 0;
    let ageCount = 0;
    clientsInPeriod.forEach(client => {
      if (client?.age) {
        totalAge += client.age;
        ageCount++;
      }
    });
    const averageAge = ageCount > 0 ? totalAge / ageCount : 0;

    // Group by state
    const byState: Record<string, number> = {};
    clientsInPeriod.forEach(client => {
      const state = client?.state || 'Unknown';
      byState[state] = (byState[state] || 0) + 1;
    });

    // Calculate total value (actual total, no scaling)
    const totalValue = filteredPolicies.reduce(
      (sum, p) => sum + (p.annualPremium || 0),
      0
    );

    return {
      newCount,
      averageAge,
      byState,
      totalValue
    };
  }, [filteredPolicies]);

  // Calculate current state metrics (point-in-time, not filtered by date)
  const currentState = useMemo((): CurrentStateMetrics => {
    const activePolicies = policies.filter(p => p.status === 'active').length;
    const pendingPolicies = policies.filter(p => p.status === 'pending').length;
    const totalPolicies = policies.length;

    // Get unique clients from all policies
    const allClients = new Set(policies.map(p => p.client?.name || p.clientId));
    const totalClients = allClients.size;

    // ✅ FIXED: Pending pipeline - all pending commissions regardless of date (total value)
    const pendingPipeline = commissions
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + (c.advanceAmount || 0), 0);

    // Calculate retention rate
    const retentionRate = totalPolicies > 0
      ? (activePolicies / totalPolicies) * 100
      : 0;

    return {
      activePolicies,
      pendingPolicies,
      totalClients,
      pendingPipeline,
      retentionRate,
      totalPolicies
    };
  }, [policies, commissions]);

  // Calculate period analytics
  const periodAnalytics = useMemo((): PeriodAnalytics => {
    const surplusDeficit = periodCommissions.earned - periodExpenses.total;
    const netIncome = surplusDeficit;
    const breakevenNeeded = surplusDeficit < 0 ? Math.abs(surplusDeficit) : 0;

    // Calculate profit margin
    const profitMargin = periodCommissions.earned > 0
      ? (netIncome / periodCommissions.earned) * 100
      : 0;

    // Calculate average commission per policy
    const avgCommissionPerPolicy = periodPolicies.newCount > 0
      ? periodCommissions.earned / periodPolicies.newCount
      : periodPolicies.averagePremium * (periodCommissions.averageRate / 100);

    // Calculate policies needed to break even
    const policiesNeeded = avgCommissionPerPolicy > 0
      ? Math.ceil(breakevenNeeded / avgCommissionPerPolicy)
      : 0;

    // Calculate pace metrics
    const timeRemaining = getTimeRemaining(timePeriod);
    const daysRemaining = Math.max(1, timeRemaining.days + (timeRemaining.hours / 24));

    let dailyTarget = 0;
    let weeklyTarget = 0;
    let monthlyTarget = 0;
    let policiesPerDayNeeded = 0;

    if (policiesNeeded > 0) {
      switch (timePeriod) {
        case 'daily':
          // For daily, we need to close this many policies today
          dailyTarget = policiesNeeded;
          policiesPerDayNeeded = policiesNeeded;
          break;

        case 'weekly':
          // For weekly, distribute over remaining days
          policiesPerDayNeeded = policiesNeeded / daysRemaining;
          dailyTarget = Math.ceil(policiesPerDayNeeded);
          weeklyTarget = policiesNeeded;
          break;

        case 'monthly':
          // For monthly, distribute over remaining days
          policiesPerDayNeeded = policiesNeeded / daysRemaining;
          dailyTarget = Math.ceil(policiesPerDayNeeded);
          weeklyTarget = Math.ceil(policiesPerDayNeeded * 7);
          monthlyTarget = policiesNeeded;
          break;

        case 'yearly':
          // For yearly, calculate monthly and weekly targets
          const monthsRemaining = 12 - new Date().getMonth();
          policiesPerDayNeeded = policiesNeeded / daysRemaining;
          dailyTarget = Math.ceil(policiesPerDayNeeded);
          weeklyTarget = Math.ceil(policiesPerDayNeeded * 7);
          monthlyTarget = Math.ceil(policiesNeeded / monthsRemaining);
          break;
      }
    }

    return {
      surplusDeficit,
      breakevenNeeded,
      policiesNeeded,
      netIncome,
      profitMargin,
      paceMetrics: {
        dailyTarget,
        weeklyTarget,
        monthlyTarget,
        policiesPerDayNeeded
      }
    };
  }, [periodCommissions, periodExpenses, periodPolicies, timePeriod]);

  return {
    periodCommissions,
    periodExpenses,
    periodPolicies,
    periodClients,
    currentState,
    periodAnalytics,
    dateRange,
    isLoading
  };
}