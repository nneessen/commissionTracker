// src/features/expenses/ExpenseManager.tsx

import React, { useState } from 'react';
import { Plus, Download, Trash2 } from 'lucide-react';
import { Button, Modal, Input, Select } from '../../components/ui';
import { ExpenseItem, NewExpenseForm, ExpenseCategory } from '../../types';
import { useExpenses, useExpenseMetrics, useCreateExpense, useUpdateExpense, useDeleteExpense } from '../../hooks';

export const ExpenseManager: React.FC = () => {
  // Use new modular hooks
  const { expensesByCategory: expenses, refresh } = useExpenses();
  const { metrics } = useExpenseMetrics();
  const { createExpense } = useCreateExpense();
  const { updateExpense } = useUpdateExpense();
  const { deleteExpense } = useDeleteExpense();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpense, setNewExpense] = useState<NewExpenseForm>({
    name: '',
    amount: 0,
    category: 'personal',
  });

  // Create totals from metrics
  const totals = {
    personalTotal: metrics?.personalTotal || 0,
    businessTotal: metrics?.businessTotal || 0,
    monthlyExpenses: metrics?.monthlyTotal || 0,
  };

  const handleAddExpense = async () => {
    if (newExpense.name.trim() && newExpense.amount >= 0) {
      const result = await createExpense(newExpense);
      if (result) {
        setNewExpense({ name: '', amount: 0, category: 'personal' });
        setShowAddModal(false);
        refresh(); // Refresh the expenses list
      }
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      const success = await deleteExpense(id);
      if (success) {
        refresh(); // Refresh the expenses list
      }
    }
  };

  const handleUpdateExpense = async (id: string, amount: number) => {
    const success = await updateExpense(id, { amount });
    if (success) {
      refresh(); // Refresh the expenses list
    }
  };

  // Simple CSV export function
  const exportToCSV = () => {
    const allExpenses = [...expenses.personal, ...expenses.business];

    if (allExpenses.length === 0) {
      alert('No expenses to export');
      return;
    }

    const headers = ['Category', 'Name', 'Amount', 'Date'];
    const csvContent = [
      headers.join(','),
      ...allExpenses.map(expense => [
        expense.category,
        `"${expense.name}"`,
        expense.amount,
        expense.createdAt ? new Date(expense.createdAt).toLocaleDateString() : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
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
                    handleUpdateExpense(item.id, Number(e.target.value))
                  }
                />
              </td>
              <td className="text-center">
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteExpense(item.id)}
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