/* /home/nneessen/projects/commissionTracker/commission-tracker/src/App.tsx */

import React, { useState, useCallback, useMemo } from 'react';
import { Download, Plus, X } from 'lucide-react';
import './App.css';

// Types for our data structures
interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
}

interface ExpenseData {
  personal: ExpenseItem[];
  business: ExpenseItem[];
  debt: ExpenseItem[];
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

type ExpenseCategory = 'personal' | 'business' | 'debt';

interface NewExpenseForm {
  name: string;
  amount: number;
  category: ExpenseCategory;
}

function App() {
  // State for all expenses
  const [expenses, setExpenses] = useState<ExpenseData>({
    personal: [
      { id: '1', name: 'Electric', amount: 50 },
      { id: '2', name: 'Legends', amount: 75 },
      { id: '3', name: 'Home', amount: 4200 },
      { id: '4', name: 'Car', amount: 1000 },
      { id: '5', name: 'Car Insurance', amount: 200 },
      { id: '6', name: 'Cook Unity', amount: 800 },
      { id: '7', name: 'Misc Food', amount: 600 }
    ],
    business: [
      { id: '8', name: 'Office', amount: 1000 },
      { id: '9', name: 'Supabase', amount: 65 },
      { id: '10', name: 'Railway', amount: 5 },
      { id: '11', name: 'Claude', amount: 200 },
      { id: '12', name: 'Close CRM', amount: 300 },
      { id: '13', name: 'T-Mobile', amount: 250 },
      { id: '14', name: 'London Leads', amount: 5000 }
    ],
    debt: [
      { id: '15', name: 'US Bank Personal', amount: 301 },
      { id: '16', name: 'US Bank Business', amount: 35 },
      { id: '17', name: 'Amex Plat', amount: 634 },
      { id: '18', name: 'Amex Biz', amount: 1500 },
      { id: '19', name: 'Wells Fargo', amount: 85 },
      { id: '20', name: 'Discover', amount: 114 }
    ]
  });

  // State for constants
  const [constants, setConstants] = useState<Constants>({
    avgAP: 2000,
    commissionRate: 0.75,
    target1: 5000,
    target2: 10000
  });

  // State for add expense modal
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState<NewExpenseForm>({
    name: '',
    amount: 0,
    category: 'personal'
  });

  // Calculated totals
  const totals = useMemo(() => {
    const personalTotal = expenses.personal.reduce((sum, item) => sum + item.amount, 0);
    const businessTotal = expenses.business.reduce((sum, item) => sum + item.amount, 0);
    const debtTotal = expenses.debt.reduce((sum, item) => sum + item.amount, 0);
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
  const updateExpense = useCallback((category: ExpenseCategory, id: string, amount: number) => {
    setExpenses(prev => ({
      ...prev,
      [category]: prev[category].map(item =>
        item.id === id ? { ...item, amount } : item
      )
    }));
  }, []);

  // Handle constant changes
  const updateConstant = useCallback((field: keyof Constants, value: number) => {
    setConstants(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Handle new expense form
  const handleNewExpenseChange = useCallback((field: keyof NewExpenseForm, value: string | number) => {
    setNewExpense(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Add new expense
  const addExpense = useCallback(() => {
    if (newExpense.name.trim() && newExpense.amount >= 0) {
      const id = Date.now().toString();
      setExpenses(prev => ({
        ...prev,
        [newExpense.category]: [
          ...prev[newExpense.category],
          { id, name: newExpense.name.trim(), amount: newExpense.amount }
        ]
      }));
      setNewExpense({ name: '', amount: 0, category: 'personal' });
      setShowAddExpenseModal(false);
    }
  }, [newExpense]);

  // Cancel new expense
  const cancelAddExpense = useCallback(() => {
    setNewExpense({ name: '', amount: 0, category: 'personal' });
    setShowAddExpenseModal(false);
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
        <button className="btn btn-primary" onClick={() => setShowAddExpenseModal(true)}>
          <Plus size={12} />
          Add Expense
        </button>
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
              {expenses.personal.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td className="currency-cell">
                    <input
                      type="number"
                      className="cell-input"
                      value={item.amount}
                      onChange={(e) => updateExpense('personal', item.id, Number(e.target.value))}
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
              {expenses.business.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td className="currency-cell">
                    <input
                      type="number"
                      className="cell-input"
                      value={item.amount}
                      onChange={(e) => updateExpense('business', item.id, Number(e.target.value))}
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
            {expenses.debt.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td className="currency-cell">
                  <input
                    type="number"
                    className="cell-input"
                    value={item.amount}
                    onChange={(e) => updateExpense('debt', item.id, Number(e.target.value))}
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

      {/* Results Table - Redesigned */}
      <div className="results-section">
        <div className="section-header">
          Commission Requirements & Sales Targets
          <div className="section-subtitle">Monthly targets based on different persistency rates (how many policies remain active)</div>
        </div>

        <div className="results-grid">
          {calculations.map((calc, index) => (
            <div
              key={calc.scenario}
              className={`result-card ${
                index === 0 ? 'breakeven-card' :
                index === 1 ? 'target-card-1' :
                'target-card-2'
              }`}
            >
              <div className="result-header">
                <h4 className="scenario-title">{calc.scenario}</h4>
                <div className="commission-needed">${calc.commissionNeeded.toLocaleString()}</div>
                <div className="commission-label">Commission Needed</div>
              </div>

              <div className="persistency-grid">
                <div className="persistency-item">
                  <div className="persistency-rate">100%</div>
                  <div className="persistency-label">Perfect Retention</div>
                  <div className="ap-amount">${Math.round(calc.apNeeded100).toLocaleString()}</div>
                  <div className="policies-count">{calc.policies100} policies</div>
                </div>

                <div className="persistency-item">
                  <div className="persistency-rate">90%</div>
                  <div className="persistency-label">Excellent Retention</div>
                  <div className="ap-amount">${Math.round(calc.apNeeded90).toLocaleString()}</div>
                  <div className="policies-count">{calc.policies90} policies</div>
                </div>

                <div className="persistency-item">
                  <div className="persistency-rate">80%</div>
                  <div className="persistency-label">Good Retention</div>
                  <div className="ap-amount">${Math.round(calc.apNeeded80).toLocaleString()}</div>
                  <div className="policies-count">{calc.policies80} policies</div>
                </div>

                <div className="persistency-item">
                  <div className="persistency-rate">70%</div>
                  <div className="persistency-label">Fair Retention</div>
                  <div className="ap-amount">${Math.round(calc.apNeeded70).toLocaleString()}</div>
                  <div className="policies-count">{calc.policies70} policies</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpenseModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New Expense</h3>
              <button className="modal-close" onClick={cancelAddExpense}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Expense Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newExpense.name}
                  onChange={(e) => handleNewExpenseChange('name', e.target.value)}
                  placeholder="Enter expense name"
                />
              </div>
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  className="form-input"
                  value={newExpense.amount}
                  onChange={(e) => handleNewExpenseChange('amount', Number(e.target.value))}
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  className="form-select"
                  value={newExpense.category}
                  onChange={(e) => handleNewExpenseChange('category', e.target.value as ExpenseCategory)}
                >
                  <option value="personal">Personal</option>
                  <option value="business">Business</option>
                  <option value="debt">Debt</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={cancelAddExpense}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={addExpense}
                disabled={!newExpense.name.trim() || newExpense.amount < 0}
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;