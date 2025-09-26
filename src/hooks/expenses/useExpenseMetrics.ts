// src/hooks/expenses/useExpenseMetrics.ts
import { useState, useEffect } from 'react';
import { ExpenseData, ExpenseTotals, CalculationResult, PerformanceMetrics } from '../../types/expense.types';
import { useLocalStorageState } from '../base/useLocalStorageState';
import { useConstants } from './useConstants';

const EXPENSES_STORAGE_KEY = 'expenses';

const DEFAULT_EXPENSES: ExpenseData = {
  personal: [],
  business: [],
  debt: [],
};

export interface UseExpenseMetricsResult {
  totals: ExpenseTotals;
  calculations: CalculationResult[];
  performanceMetrics: PerformanceMetrics;
  isLoading: boolean;
  exportToCSV: () => void;
  refresh: () => void;
}

export function useExpenseMetrics(): UseExpenseMetricsResult {
  const [expenseData] = useLocalStorageState<ExpenseData>(EXPENSES_STORAGE_KEY, DEFAULT_EXPENSES);
  const { constants } = useConstants();
  const [totals, setTotals] = useState<ExpenseTotals>({
    personalTotal: 0,
    businessTotal: 0,
    debtTotal: 0,
    monthlyExpenses: 0,
  });
  const [calculations, setCalculations] = useState<CalculationResult[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    weeklyAPTarget: 0,
    dailyAPTarget: 0,
    quarterlyAPTarget: 0,
    commissionPerPolicy: 0,
    expenseRatio: '0',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Calculate expense totals
  useEffect(() => {
    setIsLoading(true);

    const personalTotal = expenseData.personal.reduce((sum, item) => sum + item.amount, 0);
    const businessTotal = expenseData.business.reduce((sum, item) => sum + item.amount, 0);
    const debtTotal = expenseData.debt.reduce((sum, item) => sum + item.amount, 0);
    const monthlyExpenses = personalTotal + businessTotal + debtTotal;

    setTotals({ personalTotal, businessTotal, debtTotal, monthlyExpenses });

    // Calculate commission requirements
    const results: CalculationResult[] = [];
    const scenarios = [
      { name: "Breakeven", target: 0 },
      { name: `+$${constants.target1.toLocaleString()}`, target: constants.target1 },
      { name: `+$${constants.target2.toLocaleString()}`, target: constants.target2 },
    ];

    scenarios.forEach((scenario) => {
      const commissionNeeded = monthlyExpenses + scenario.target;
      const apNeeded100 = commissionNeeded / constants.commissionRate;
      const apNeeded90 = apNeeded100 / 0.9;
      const apNeeded80 = apNeeded100 / 0.8;
      const apNeeded70 = apNeeded100 / 0.7;

      results.push({
        scenario: scenario.name,
        commissionNeeded,
        apNeeded100,
        policies100: Math.ceil(apNeeded100 / constants.avgAP),
        apNeeded90,
        policies90: Math.ceil(apNeeded90 / constants.avgAP),
        apNeeded80,
        policies80: Math.ceil(apNeeded80 / constants.avgAP),
        apNeeded70,
        policies70: Math.ceil(apNeeded70 / constants.avgAP),
      });
    });

    setCalculations(results);

    // Calculate performance metrics
    const breakeven = results[0];
    const metrics: PerformanceMetrics = {
      weeklyAPTarget: Math.round(breakeven.apNeeded100 / 4.33),
      dailyAPTarget: Math.round(breakeven.apNeeded100 / 30),
      quarterlyAPTarget: Math.round(breakeven.apNeeded100 * 3),
      commissionPerPolicy: Math.round(constants.avgAP * constants.commissionRate),
      expenseRatio: (
        (monthlyExpenses / (breakeven.apNeeded100 * constants.commissionRate)) * 100
      ).toFixed(1),
    };

    setPerformanceMetrics(metrics);
    setIsLoading(false);
  }, [expenseData, constants, refreshKey]);

  const exportToCSV = () => {
    const headers = [
      "Scenario",
      "Commission Needed",
      "AP (100%)",
      "Policies (100%)",
      "AP (90%)",
      "Policies (90%)",
      "AP (80%)",
      "Policies (80%)",
      "AP (70%)",
      "Policies (70%)",
    ];

    const rows = calculations.map((calc) => [
      calc.scenario,
      calc.commissionNeeded.toLocaleString(),
      Math.round(calc.apNeeded100).toLocaleString(),
      calc.policies100,
      Math.round(calc.apNeeded90).toLocaleString(),
      calc.policies90,
      Math.round(calc.apNeeded80).toLocaleString(),
      calc.policies80,
      Math.round(calc.apNeeded70).toLocaleString(),
      calc.policies70,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "commission-calculations.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const refresh = () => setRefreshKey(key => key + 1);

  return {
    totals,
    calculations,
    performanceMetrics,
    isLoading,
    exportToCSV,
    refresh,
  };
}