import React, { useState } from 'react';
import { Plus, Download, Trash2 } from 'lucide-react';
import { Button, Modal, Input, Select } from '../../components/ui';
import { ExpenseItem, NewExpenseForm, ExpenseCategory } from '../../types';
import { useExpenses } from '../../hooks';

export const ExpenseManager: React.FC = () => {
  const {
    expenses,
    totals,
    addExpense,
    updateExpense,
    deleteExpense,
    exportToCSV,
  } = useExpenses();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpense, setNewExpense] = useState<NewExpenseForm>({
    name: '',
    amount: 0,
    category: 'personal',
  });

  const handleAddExpense = () => {
    if (newExpense.name.trim() && newExpense.amount >= 0) {
      addExpense(newExpense);
      setNewExpense({ name: '', amount: 0, category: 'personal' });
      setShowAddModal(false);
    }
  };

  const handleDeleteExpense = (category: ExpenseCategory, id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      deleteExpense(category, id);
    }
  };

  const renderExpenseTable = (
    title: string,
    items: ExpenseItem[],
    category: ExpenseCategory,
    total: number
  ) => (
    <div className="spreadsheet-section">
      <div className="section-header">{title}</div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Category</th>
            <th className="text-right">Amount</th>
            <th className="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td className="currency-cell">
                <input
                  type="number"
                  className="cell-input"
                  value={item.amount}
                  onChange={(e) =>
                    updateExpense(category, item.id, Number(e.target.value))
                  }
                />
              </td>
              <td className="text-center">
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteExpense(category, item.id)}
                  title="Delete expense"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
          <tr style={{ fontWeight: 600, backgroundColor: '#e6f3ff' }}>
            <td>Total</td>
            <td className="currency-cell">${total.toLocaleString()}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="expense-manager">
      {/* Controls Bar */}
      <div className="controls-bar">
        <Button onClick={() => setShowAddModal(true)}>
          <Plus size={12} />
          Add Expense
        </Button>
        <Button onClick={exportToCSV}>
          <Download size={12} />
          Export CSV
        </Button>
        <span className="text-gray text-xs">
          Monthly Expenses: ${totals.monthlyExpenses.toLocaleString()}
        </span>
      </div>

      {/* Expenses Grid */}
      <div className="spreadsheet-container">
        {renderExpenseTable(
          'Personal Expenses',
          expenses.personal,
          'personal',
          totals.personalTotal
        )}
        {renderExpenseTable(
          'Business Expenses',
          expenses.business,
          'business',
          totals.businessTotal
        )}
      </div>

      {/* Debt Payments */}
      <div className="spreadsheet-section mb-2">
        <div className="section-header">Monthly Debt Payments</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Creditor</th>
              <th className="text-right">Payment</th>
              <th className="text-center">Actions</th>
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
                    onChange={(e) =>
                      updateExpense('debt', item.id, Number(e.target.value))
                    }
                  />
                </td>
                <td className="text-center">
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteExpense('debt', item.id)}
                    title="Delete expense"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            <tr style={{ fontWeight: 600, backgroundColor: '#e6f3ff' }}>
              <td>Total</td>
              <td className="currency-cell">
                ${totals.debtTotal.toLocaleString()}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Expense"
      >
        <div className="space-y-4">
          <Input
            label="Expense Name"
            value={newExpense.name}
            onChange={(value) =>
              setNewExpense((prev) => ({ ...prev, name: String(value) }))
            }
            placeholder="Enter expense name"
            required
          />
          <Input
            label="Amount"
            type="number"
            value={newExpense.amount}
            onChange={(value) =>
              setNewExpense((prev) => ({ ...prev, amount: Number(value) }))
            }
            placeholder="0"
            required
          />
          <Select
            label="Category"
            value={newExpense.category}
            onChange={(value) =>
              setNewExpense((prev) => ({
                ...prev,
                category: value as ExpenseCategory,
              }))
            }
            options={[
              { value: 'personal', label: 'Personal' },
              { value: 'business', label: 'Business' },
              { value: 'debt', label: 'Debt' },
            ]}
            required
          />
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddExpense}
              disabled={!newExpense.name.trim() || newExpense.amount < 0}
            >
              Add Expense
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};