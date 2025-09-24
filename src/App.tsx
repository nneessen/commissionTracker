/* /home/nneessen/projects/commissionTracker/commission-tracker/src/App.tsx */

import React, { useState, useCallback, useMemo } from 'react';
import { Download } from 'lucide-react';
import './App.css';

// Types for our data structures
interface ExpenseData {
  personal: {
    electric: number;
    legends: number;
    home: number;
    car: number;
    carInsurance: number;
    cookUnity: number;
    miscFood: number;
  };
  business: {
    office: number;
    supabase: number;
    railway: number;
    claude: number;
    closeCRM: number;
    tmobile: number;
    londonLeads: number;
  };
  debt: {
    usBankPersonal: number;
    usBankBusiness: number;
    amexPlat: number;
    amexBiz: number;
    wellsFargo: number;
    discover: number;
  };
}

interface Constants {
  avgAP: number;
  commissionRate: number;
  target1: number;
  target2: number;
}

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

function App() {
  // State for all expenses
  const [expenses, setExpenses] = useState<ExpenseData>({
    personal: {
      electric: 50,
      legends: 75,
      home: 4200,
      car: 1000,
      carInsurance: 200,
      cookUnity: 800,
      miscFood: 600
    },
    business: {
      office: 1000,
      supabase: 65,
      railway: 5,
      claude: 200,
      closeCRM: 300,
      tmobile: 250,
      londonLeads: 5000
    },
    debt: {
      usBankPersonal: 301,
      usBankBusiness: 35,
      amexPlat: 634,
      amexBiz: 1500,
      wellsFargo: 85,
      discover: 114
    }
  });

  // State for constants
  const [constants, setConstants] = useState<Constants>({
    avgAP: 2000,
    commissionRate: 0.75,
    target1: 5000,
    target2: 10000
  });

  // Calculated totals
  const totals = useMemo(() => {
    const personalTotal = Object.values(expenses.personal).reduce((sum, val) => sum + val, 0);
    const businessTotal = Object.values(expenses.business).reduce((sum, val) => sum + val, 0);
    const debtTotal = Object.values(expenses.debt).reduce((sum, val) => sum + val, 0);
    const monthlyExpenses = personalTotal + businessTotal + debtTotal;

    return { personalTotal, businessTotal, debtTotal, monthlyExpenses };
  }, [expenses]);

  // Calculate commission requirements
  const calculations = useMemo((): CalculationResult[] => {
    const results: CalculationResult[] = [];
    const scenarios = [
      { name: 'Breakeven', target: 0 },
      { name: `+$${constants.target1.toLocaleString()}`, target: constants.target1 },
      { name: `+$${constants.target2.toLocaleString()}`, target: constants.target2 }
    ];

    scenarios.forEach(scenario => {
      const commissionNeeded = totals.monthlyExpenses + scenario.target;
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
        policies70: Math.ceil(apNeeded70 / constants.avgAP)
      });
    });

    return results;
  }, [totals.monthlyExpenses, constants]);

  // Additional metrics
  const metrics = useMemo(() => {
    const breakeven = calculations[0];
    return {
      weeklyAPTarget: Math.round(breakeven.apNeeded100 / 4.33), // Monthly to weekly
      dailyAPTarget: Math.round(breakeven.apNeeded100 / 30), // Monthly to daily
      quarterlyAPTarget: Math.round(breakeven.apNeeded100 * 3), // Monthly to quarterly
      commissionPerPolicy: Math.round((constants.avgAP * constants.commissionRate)),
      expenseRatio: ((totals.monthlyExpenses / (breakeven.apNeeded100 * constants.commissionRate)) * 100).toFixed(1)
    };
  }, [calculations, constants, totals]);

  // Handle expense changes
  const updateExpense = useCallback((category: keyof ExpenseData, field: string, value: number) => {
    setExpenses(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  }, []);

  // Handle constant changes
  const updateConstant = useCallback((field: keyof Constants, value: number) => {
    setConstants(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Export to CSV function
  const exportToCSV = useCallback(() => {
    const headers = ['Scenario', 'Commission Needed', 'AP (100%)', 'Policies (100%)', 'AP (90%)', 'Policies (90%)', 'AP (80%)', 'Policies (80%)', 'AP (70%)', 'Policies (70%)'];
    const rows = calculations.map(calc => [
      calc.scenario,
      calc.commissionNeeded.toLocaleString(),
      Math.round(calc.apNeeded100).toLocaleString(),
      calc.policies100,
      Math.round(calc.apNeeded90).toLocaleString(),
      calc.policies90,
      Math.round(calc.apNeeded80).toLocaleString(),
      calc.policies80,
      Math.round(calc.apNeeded70).toLocaleString(),
      calc.policies70
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'commission-calculations.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [calculations]);

  return (
    <div className="app">
      <div className="app-header">
        Commission Tracker
      </div>

      {/* Constants Section */}
      <div className="constants-section">
        <div className="constant-group">
          <div className="constant-label">Avg AP</div>
          <input
            type="number"
            className="constant-input"
            value={constants.avgAP}
            onChange={(e) => updateConstant('avgAP', Number(e.target.value))}
          />
        </div>
        <div className="constant-group">
          <div className="constant-label">Comm Rate</div>
          <input
            type="number"
            className="constant-input"
            step="0.01"
            value={constants.commissionRate}
            onChange={(e) => updateConstant('commissionRate', Number(e.target.value))}
          />
        </div>
        <div className="constant-group">
          <div className="constant-label">Target 1</div>
          <input
            type="number"
            className="constant-input"
            value={constants.target1}
            onChange={(e) => updateConstant('target1', Number(e.target.value))}
          />
        </div>
        <div className="constant-group">
          <div className="constant-label">Target 2</div>
          <input
            type="number"
            className="constant-input"
            value={constants.target2}
            onChange={(e) => updateConstant('target2', Number(e.target.value))}
          />
        </div>
      </div>

      {/* Controls Bar */}
      <div className="controls-bar">
        <button className="btn btn-primary" onClick={exportToCSV}>
          <Download size={12} />
          Export CSV
        </button>
        <span className="text-gray text-xs">
          Monthly Expenses: ${totals.monthlyExpenses.toLocaleString()}
        </span>
      </div>

      {/* Expenses Grid */}
      <div className="spreadsheet-container">
        {/* Personal Expenses */}
        <div className="spreadsheet-section">
          <div className="section-header">Personal Expenses</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(expenses.personal).map(([key, value]) => (
                <tr key={key}>
                  <td>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</td>
                  <td className="currency-cell">
                    <input
                      type="number"
                      className="cell-input"
                      value={value}
                      onChange={(e) => updateExpense('personal', key, Number(e.target.value))}
                    />
                  </td>
                </tr>
              ))}
              <tr style={{ fontWeight: 600, backgroundColor: '#e6f3ff' }}>
                <td>Total</td>
                <td className="currency-cell">${totals.personalTotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Business Expenses */}
        <div className="spreadsheet-section">
          <div className="section-header">Business Expenses</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(expenses.business).map(([key, value]) => (
                <tr key={key}>
                  <td>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</td>
                  <td className="currency-cell">
                    <input
                      type="number"
                      className="cell-input"
                      value={value}
                      onChange={(e) => updateExpense('business', key, Number(e.target.value))}
                    />
                  </td>
                </tr>
              ))}
              <tr style={{ fontWeight: 600, backgroundColor: '#e6f3ff' }}>
                <td>Total</td>
                <td className="currency-cell">${totals.businessTotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Debt Payments */}
      <div className="spreadsheet-section mb-2">
        <div className="section-header">Monthly Debt Payments</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Creditor</th>
              <th className="text-right">Payment</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(expenses.debt).map(([key, value]) => (
              <tr key={key}>
                <td>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</td>
                <td className="currency-cell">
                  <input
                    type="number"
                    className="cell-input"
                    value={value}
                    onChange={(e) => updateExpense('debt', key, Number(e.target.value))}
                  />
                </td>
              </tr>
            ))}
            <tr style={{ fontWeight: 600, backgroundColor: '#e6f3ff' }}>
              <td>Total</td>
              <td className="currency-cell">${totals.debtTotal.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Quick Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <h4>Weekly AP Target</h4>
          <div className="metric-value">${metrics.weeklyAPTarget.toLocaleString()}</div>
          <div className="metric-label">For breakeven</div>
        </div>
        <div className="metric-card">
          <h4>Daily AP Target</h4>
          <div className="metric-value">${metrics.dailyAPTarget.toLocaleString()}</div>
          <div className="metric-label">For breakeven</div>
        </div>
        <div className="metric-card">
          <h4>Commission per Policy</h4>
          <div className="metric-value">${metrics.commissionPerPolicy.toLocaleString()}</div>
          <div className="metric-label">At current rates</div>
        </div>
        <div className="metric-card">
          <h4>Expense Ratio</h4>
          <div className="metric-value">{metrics.expenseRatio}%</div>
          <div className="metric-label">Of gross commission</div>
        </div>
      </div>

      {/* Results Table */}
      <div className="results-section">
        <div className="section-header">Commission Requirements by Persistency</div>
        <table className="results-table">
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Commission</th>
              <th>AP (100%)</th>
              <th>Policies</th>
              <th>AP (90%)</th>
              <th>Policies</th>
              <th>AP (80%)</th>
              <th>Policies</th>
              <th>AP (70%)</th>
              <th>Policies</th>
            </tr>
          </thead>
          <tbody>
            {calculations.map((calc, index) => (
              <tr
                key={calc.scenario}
                className={
                  index === 0 ? 'breakeven-row' :
                  index === 1 ? 'target-row-1' :
                  'target-row-2'
                }
              >
                <td className="text-left font-semibold">{calc.scenario}</td>
                <td>${calc.commissionNeeded.toLocaleString()}</td>
                <td>${Math.round(calc.apNeeded100).toLocaleString()}</td>
                <td>{calc.policies100}</td>
                <td>${Math.round(calc.apNeeded90).toLocaleString()}</td>
                <td>{calc.policies90}</td>
                <td>${Math.round(calc.apNeeded80).toLocaleString()}</td>
                <td>{calc.policies80}</td>
                <td>${Math.round(calc.apNeeded70).toLocaleString()}</td>
                <td>{calc.policies70}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;