import { useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { ExpenseData, ExpenseItem, ExpenseCategory, NewExpenseForm, ExpenseTotals, Constants, CalculationResult, PerformanceMetrics } from '../types';

// Default expense data
const DEFAULT_EXPENSES: ExpenseData = {
  personal: [
    { id: "1", name: "Electric", amount: 50, category: "personal" },
    { id: "2", name: "Legends", amount: 75, category: "personal" },
    { id: "3", name: "Home", amount: 4200, category: "personal" },
    { id: "4", name: "Car", amount: 1000, category: "personal" },
    { id: "5", name: "Car Insurance", amount: 200, category: "personal" },
    { id: "6", name: "Cook Unity", amount: 800, category: "personal" },
    { id: "7", name: "Misc Food", amount: 600, category: "personal" },
  ],
  business: [
    { id: "8", name: "Office", amount: 1000, category: "business" },
    { id: "9", name: "Supabase", amount: 65, category: "business" },
    { id: "10", name: "Railway", amount: 5, category: "business" },
    { id: "11", name: "Claude", amount: 200, category: "business" },
    { id: "12", name: "Close CRM", amount: 300, category: "business" },
    { id: "13", name: "T-Mobile", amount: 250, category: "business" },
    { id: "14", name: "London Leads", amount: 5000, category: "business" },
  ],
  debt: [
    { id: "15", name: "US Bank Personal", amount: 301, category: "debt" },
    { id: "16", name: "US Bank Business", amount: 35, category: "debt" },
    { id: "17", name: "Amex Plat", amount: 634, category: "debt" },
    { id: "18", name: "Amex Biz", amount: 1500, category: "debt" },
    { id: "19", name: "Wells Fargo", amount: 85, category: "debt" },
    { id: "20", name: "Discover", amount: 114, category: "debt" },
  ],
};

const DEFAULT_CONSTANTS: Constants = {
  avgAP: 2000,
  commissionRate: 0.75,
  target1: 5000,
  target2: 10000,
};

export function useExpenses() {
  const [expenses, setExpenses] = useLocalStorage<ExpenseData>('expenses', DEFAULT_EXPENSES);
  const [constants, setConstants] = useLocalStorage<Constants>('constants', DEFAULT_CONSTANTS);

  // Calculate expense totals
  const totals = useMemo((): ExpenseTotals => {
    const personalTotal = expenses.personal.reduce((sum, item) => sum + item.amount, 0);
    const businessTotal = expenses.business.reduce((sum, item) => sum + item.amount, 0);
    const debtTotal = expenses.debt.reduce((sum, item) => sum + item.amount, 0);
    const monthlyExpenses = personalTotal + businessTotal + debtTotal;

    return { personalTotal, businessTotal, debtTotal, monthlyExpenses };
  }, [expenses]);

  // Calculate commission requirements
  const calculations = useMemo((): CalculationResult[] => {
    console.log('🔄 RECALCULATING with constants:', {
      avgAP: constants.avgAP,
      commissionRate: constants.commissionRate,
      target1: constants.target1,
      target2: constants.target2,
      monthlyExpenses: totals.monthlyExpenses
    });

    const results: CalculationResult[] = [];
    const scenarios = [
      { name: "Breakeven", target: 0 },
      { name: `+$${constants.target1.toLocaleString()}`, target: constants.target1 },
      { name: `+$${constants.target2.toLocaleString()}`, target: constants.target2 },
    ];

    scenarios.forEach((scenario) => {
      const commissionNeeded = totals.monthlyExpenses + scenario.target;
      const apNeeded100 = commissionNeeded / constants.commissionRate;
      const apNeeded90 = apNeeded100 / 0.9;
      const apNeeded80 = apNeeded100 / 0.8;
      const apNeeded70 = apNeeded100 / 0.7;

      console.log(`   📊 ${scenario.name}:
        - Commission Needed: $${commissionNeeded}
        - AP Needed (100%): $${Math.round(apNeeded100)}
        - Policies (100%): ${Math.ceil(apNeeded100 / constants.avgAP)}
        - Commission Rate: ${constants.commissionRate}
        - Avg AP: ${constants.avgAP}`);

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

    return results;
  }, [totals.monthlyExpenses, constants]);

  // Additional performance metrics
  const performanceMetrics = useMemo((): PerformanceMetrics => {
    const breakeven = calculations[0];
    console.log('🎯 RECALCULATING Performance Metrics with:', {
      breakevenAPNeeded: breakeven?.apNeeded100,
      avgAP: constants.avgAP,
      commissionRate: constants.commissionRate,
      monthlyExpenses: totals.monthlyExpenses
    });

    const metrics = {
      weeklyAPTarget: Math.round(breakeven.apNeeded100 / 4.33),
      dailyAPTarget: Math.round(breakeven.apNeeded100 / 30),
      quarterlyAPTarget: Math.round(breakeven.apNeeded100 * 3),
      commissionPerPolicy: Math.round(constants.avgAP * constants.commissionRate),
      expenseRatio: (
        (totals.monthlyExpenses / (breakeven.apNeeded100 * constants.commissionRate)) * 100
      ).toFixed(1),
    };

    console.log('   Metrics calculated:', metrics);
    return metrics;
  }, [calculations, constants, totals]);

  // Expense management functions
  const addExpense = (newExpense: NewExpenseForm) => {
    const expense: ExpenseItem = {
      id: Date.now().toString(),
      name: newExpense.name.trim(),
      amount: newExpense.amount,
      category: newExpense.category,
      createdAt: new Date(),
    };

    setExpenses((prev) => ({
      ...prev,
      [newExpense.category]: [...prev[newExpense.category], expense],
    }));

    return expense;
  };

  const updateExpense = (category: ExpenseCategory, id: string, amount: number) => {
    setExpenses((prev) => ({
      ...prev,
      [category]: prev[category].map((item) =>
        item.id === id ? { ...item, amount, updatedAt: new Date() } : item
      ),
    }));
  };

  const deleteExpense = (category: ExpenseCategory, id: string) => {
    setExpenses((prev) => ({
      ...prev,
      [category]: prev[category].filter((item) => item.id !== id),
    }));
  };

  const updateConstant = (field: keyof Constants, value: number) => {
    setConstants((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Export to CSV function
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

  return {
    expenses,
    constants,
    totals,
    calculations,
    performanceMetrics,
    addExpense,
    updateExpense,
    deleteExpense,
    updateConstant,
    exportToCSV,
  };
}