// src/features/expenses/ExpenseDashboard.tsx

import React, { useState, useMemo } from 'react';
import { PageLayout } from '../../components/layout';
import { useExpenses } from '../../hooks/expenses/useExpenses';
import { useCreateExpense } from '../../hooks/expenses/useCreateExpense';
import { useUpdateExpense } from '../../hooks/expenses/useUpdateExpense';
import { useDeleteExpense } from '../../hooks/expenses/useDeleteExpense';
import { useGenerateRecurringExpenses } from '../../hooks/expenses/useGenerateRecurring';
import { useExpenseTemplates, useDeleteExpenseTemplate } from '../../hooks/expenses/useExpenseTemplates';
import { expenseAnalyticsService } from '../../services/expenses/expenseAnalyticsService';
import { expenseService } from '../../services/expenses/expenseService';
import { expenseTemplateService } from '../../services/expenses/expenseTemplateService';
import { supabase } from '../../services/base/supabase';
import type { Expense, AdvancedExpenseFilters, CreateExpenseData, ExpenseTemplate } from '../../types/expense.types';
import { DEFAULT_EXPENSE_CATEGORIES } from '../../types/expense.types';
import showToast from '../../utils/toast';

// Components
import { ExpenseDialog } from './components/ExpenseDialog';
import { ExpenseDeleteDialog } from './components/ExpenseDeleteDialog';

// Config
import {
  generateCategoryBreakdownConfig,
  generateTrendData,
} from './config/expenseStatsConfig';

/**
 * ExpenseDashboard - PROPERLY redesigned to match Analytics page
 *
 * Uses Analytics 2-column responsive grid pattern
 * Follows EXACT design system from /src/constants/dashboard.ts
 */
export function ExpenseDashboard() {
  // State
  const [filters, setFilters] = useState<AdvancedExpenseFilters>({
    expenseType: 'all',
    category: 'all',
    searchTerm: '',
    deductibleOnly: false,
    recurringOnly: false,
  });
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Data fetching
  const { data: expenses = [], isLoading: isLoadingExpenses } = useExpenses({ filters });
  const { data: templates = [] } = useExpenseTemplates();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const deleteTemplate = useDeleteExpenseTemplate();
  const generateRecurring = useGenerateRecurringExpenses();

  // Calculate filtered data
  const filteredExpenses = useMemo(() => {
    let filtered = expenseAnalyticsService.applyAdvancedFilters(expenses, filters);
    filtered = filtered.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getMonth() === selectedMonth.getMonth() &&
        expenseDate.getFullYear() === selectedMonth.getFullYear()
      );
    });
    return filtered;
  }, [expenses, filters, selectedMonth]);

  const expensesForMonth = useMemo(() => {
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getMonth() === selectedMonth.getMonth() &&
        expenseDate.getFullYear() === selectedMonth.getFullYear()
      );
    });
  }, [expenses, selectedMonth]);

  // Analytics calculations
  const momGrowthData = useMemo(
    () => expenseAnalyticsService.getMoMGrowth(filteredExpenses),
    [filteredExpenses]
  );

  const categoryBreakdown = useMemo(
    () => generateCategoryBreakdownConfig({
      expenses: filteredExpenses.map((e) => ({ category: e.category, amount: e.amount })),
      totalAmount: filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    }),
    [filteredExpenses]
  );

  const trendData = useMemo(
    () => generateTrendData({
      expenses: filteredExpenses.map((e) => ({ date: e.date, amount: e.amount })),
      months: 6,
    }),
    [filteredExpenses]
  );

  // Totals
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const businessAmount = filteredExpenses.filter((e) => e.expense_type === 'business').reduce((sum, e) => sum + e.amount, 0);
  const personalAmount = filteredExpenses.filter((e) => e.expense_type === 'personal').reduce((sum, e) => sum + e.amount, 0);

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const monthYear = selectedMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Event handlers
  const handleAddExpense = () => {
    setSelectedExpense(null);
    setIsAddDialogOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsEditDialogOpen(true);
  };

  const handleDeleteExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveExpense = async (data: CreateExpenseData) => {
    try {
      if (selectedExpense) {
        await updateExpense.mutateAsync({ id: selectedExpense.id, updates: data });
        showToast.success('Expense updated successfully!');
        setIsEditDialogOpen(false);
      } else {
        await createExpense.mutateAsync(data);
        showToast.success('Expense created successfully!');
        setIsAddDialogOpen(false);
      }
      setSelectedExpense(null);
    } catch (error) {
      console.error('Error saving expense:', error);
      showToast.error('Failed to save expense. Please try again.');
    }
  };

  const handleConfirmDelete = async (deleteOption: 'single' | 'future' | 'all') => {
    if (!selectedExpense) return;

    try {
      if (deleteOption === 'single' || !selectedExpense.recurring_group_id) {
        await deleteExpense.mutateAsync(selectedExpense.id);
        showToast.success('Expense deleted successfully!');
      } else if (deleteOption === 'future') {
        const { recurringExpenseService } = await import('./../../services/expenses/recurringExpenseService');
        const count = await recurringExpenseService.deleteFutureExpenses(
          selectedExpense.recurring_group_id,
          selectedExpense.date
        );
        await deleteExpense.mutateAsync(selectedExpense.id);
        showToast.success(`Deleted current expense and ${count} future occurrences!`);
      } else if (deleteOption === 'all') {
        const { data, error } = await supabase
          .from('expenses')
          .delete()
          .eq('recurring_group_id', selectedExpense.recurring_group_id);

        if (error) throw error;
        showToast.success('Deleted all recurring expenses!');
      }

      setIsDeleteDialogOpen(false);
      setSelectedExpense(null);
    } catch (error) {
      console.error('Error deleting expense:', error);
      showToast.error('Failed to delete expense. Please try again.');
    }
  };

  const handleExportCSV = () => {
    try {
      const csv = expenseService.exportToCSV(filteredExpenses);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast.success('Expenses exported to CSV!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showToast.error('Failed to export CSV. Please try again.');
    }
  };

  const handleUseTemplate = async (template: ExpenseTemplate) => {
    const expenseData = expenseTemplateService.templateToExpenseData(template);
    const today = new Date().toISOString().split('T')[0];

    try {
      await createExpense.mutateAsync({ ...expenseData, date: today });
      showToast.success(`✓ Added: ${template.template_name} - ${formatCurrency(template.amount)}`);
    } catch (error) {
      console.error('Error creating expense from template:', error);
      showToast.error('Failed to create expense. Please try again.');
    }
  };

  const handleDeleteTemplate = async (template: ExpenseTemplate) => {
    if (confirm(`Delete template "${template.template_name}"?`)) {
      try {
        await deleteTemplate.mutateAsync(template.id);
        showToast.success('Template deleted successfully!');
      } catch (error) {
        console.error('Error deleting template:', error);
        showToast.error('Failed to delete template. Please try again.');
      }
    }
  };

  const handleGenerateRecurring = async () => {
    try {
      await generateRecurring.mutateAsync(selectedMonth);
    } catch (error) {
      console.error('Error generating recurring expenses:', error);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      expenseType: 'all',
      category: 'all',
      searchTerm: '',
      deductibleOnly: false,
      recurringOnly: false,
    });
  };

  const handlePrevMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedMonth(newDate);
  };

  const handleToday = () => {
    setSelectedMonth(new Date());
  };

  // Check if recurring generation is needed
  const recurringTemplates = templates.filter((t) => t.recurring_frequency !== null);
  const hasRecurringExpensesThisMonth = expensesForMonth.some((e) => e.recurring_group_id);
  const needsRecurringGeneration = recurringTemplates.length > 0 && !hasRecurringExpensesThisMonth;

  const hasFiltersApplied = filters.expenseType !== 'all' ||
    filters.category !== 'all' ||
    filters.searchTerm !== '' ||
    filters.deductibleOnly ||
    filters.recurringOnly;

  return (
    <PageLayout>
      <div style={{
        minHeight: '100vh',
        background: '#f8f9fa',
        padding: window.innerWidth < 768 ? '12px' : '24px',
      }}>
        {/* Page Header - Analytics Pattern */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#1a1a1a',
            marginBottom: '8px'
          }}>
            Expenses
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#656d76',
            marginBottom: '20px'
          }}>
            Track and manage business and personal expenses
          </p>

          {/* Month Selector Card + Export */}
          <div style={{
            padding: '16px',
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#1a1a1a',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Selected Month
              </div>

              <button
                onClick={handleExportCSV}
                style={{
                  padding: '6px 12px',
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title="Export to CSV"
              >
                📊 Export CSV
              </button>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <button
                onClick={handlePrevMonth}
                style={{
                  padding: '8px 16px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                ◄
              </button>

              <div style={{
                flex: 1,
                fontSize: '16px',
                fontWeight: 600,
                color: '#1a1a1a',
                textAlign: 'center'
              }}>
                {monthYear}
              </div>

              <button
                onClick={handleToday}
                style={{
                  padding: '8px 16px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Today
              </button>

              <button
                onClick={handleNextMonth}
                style={{
                  padding: '8px 16px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                ►
              </button>
            </div>
          </div>
        </div>

        {/* Summary Card + Category Breakdown - 2-Column Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth >= 1200 ? '1fr 1fr' : '1fr',
          gap: '16px',
          marginBottom: '16px'
        }}>
          {/* Summary Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#1a1a1a',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                SUMMARY
              </div>
              {momGrowthData.growthPercentage !== 0 && (
                <div style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: momGrowthData.growthPercentage > 0 ? '#ef4444' : '#10b981',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: momGrowthData.growthPercentage > 0 ? '#fee2e2' : '#d1fae5'
                }}>
                  {momGrowthData.growthPercentage > 0 ? '▲' : '▼'} {Math.abs(momGrowthData.growthPercentage).toFixed(1)}% MoM
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Total Amount */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%)',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '11px', color: '#656d76', fontWeight: 600 }}>
                  TOTAL EXPENSES
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#1a1a1a',
                  fontFamily: 'Monaco, monospace'
                }}>
                  {formatCurrency(totalAmount)}
                </div>
              </div>

              {/* Business Amount */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#656d76' }}>
                  Business
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1a1a1a',
                  fontFamily: 'Monaco, monospace'
                }}>
                  {formatCurrency(businessAmount)}
                </div>
              </div>

              {/* Personal Amount */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#656d76' }}>
                  Personal
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1a1a1a',
                  fontFamily: 'Monaco, monospace'
                }}>
                  {formatCurrency(personalAmount)}
                </div>
              </div>

              {/* Count */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: '1px solid #e2e8f0'
              }}>
                <div style={{ fontSize: '11px', color: '#656d76' }}>
                  Total Transactions
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1a1a1a',
                  fontFamily: 'Monaco, monospace'
                }}>
                  {filteredExpenses.length}
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#1a1a1a',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              CATEGORY BREAKDOWN
            </div>
            <div style={{
              fontSize: '11px',
              color: '#656d76',
              marginBottom: '20px'
            }}>
              Spending distribution by category
            </div>

            {filteredExpenses.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {categoryBreakdown.map((cat, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#1a1a1a', fontWeight: 500 }}>
                        {cat.category}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#1a1a1a',
                        fontFamily: 'Monaco, monospace'
                      }}>
                        {formatCurrency(cat.amount)} ({cat.percentage}%)
                      </div>
                    </div>
                    <div style={{
                      height: '6px',
                      background: '#f1f5f9',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${cat.percentage}%`,
                        background: cat.color,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                No data to display
              </div>
            )}
          </div>
        </div>

        {/* Filters Card + Trend Chart - 2-Column Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth >= 1200 ? '1fr 1fr' : '1fr',
          gap: '16px',
          marginBottom: '16px'
        }}>
          {/* Filters Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#1a1a1a',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              FILTERS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Expense Type Filter */}
              <div>
                <div style={{ fontSize: '11px', color: '#656d76', marginBottom: '8px', fontWeight: 600 }}>
                  TYPE
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['all', 'business', 'personal'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilters({ ...filters, expenseType: type as any })}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: filters.expenseType === type ? '#3b82f6' : '#f1f5f9',
                        color: filters.expenseType === type ? '#ffffff' : '#475569',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <div style={{ fontSize: '11px', color: '#656d76', marginBottom: '8px', fontWeight: 600 }}>
                  CATEGORY
                </div>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#1a1a1a',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Categories</option>
                  {DEFAULT_EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div>
                <div style={{ fontSize: '11px', color: '#656d76', marginBottom: '8px', fontWeight: 600 }}>
                  SEARCH
                </div>
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  placeholder="Search expenses..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#1a1a1a'
                  }}
                />
              </div>

              {/* Checkboxes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filters.deductibleOnly}
                    onChange={(e) => setFilters({ ...filters, deductibleOnly: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '11px', color: '#1a1a1a' }}>Tax Deductible Only</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filters.recurringOnly}
                    onChange={(e) => setFilters({ ...filters, recurringOnly: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '11px', color: '#1a1a1a' }}>Recurring Only</span>
                </label>
              </div>

              {/* Results Count */}
              <div style={{
                padding: '8px 12px',
                background: '#f1f5f9',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#656d76',
                textAlign: 'center'
              }}>
                Showing {filteredExpenses.length} result{filteredExpenses.length !== 1 ? 's' : ''}
              </div>

              {/* Clear Filters */}
              {hasFiltersApplied && (
                <button
                  onClick={handleClearFilters}
                  style={{
                    padding: '8px 12px',
                    background: '#ffffff',
                    color: '#ef4444',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Trend Chart Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#1a1a1a',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              6-MONTH TREND
            </div>
            <div style={{
              fontSize: '11px',
              color: '#656d76',
              marginBottom: '20px'
            }}>
              Monthly spending over time
            </div>

            {trendData.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '200px' }}>
                {trendData.map((item, idx) => {
                  const maxAmount = Math.max(...trendData.map(d => d.amount));
                  const height = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
                  return (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div
                        style={{
                          width: '100%',
                          height: `${height}%`,
                          background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                          borderRadius: '4px 4px 0 0',
                          position: 'relative',
                          minHeight: item.amount > 0 ? '8px' : '0'
                        }}
                        title={`${item.month}: ${formatCurrency(item.amount)}`}
                      />
                      <div style={{
                        fontSize: '9px',
                        color: '#94a3b8',
                        textAlign: 'center',
                        fontWeight: 600
                      }}>
                        {item.month}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: '#1a1a1a',
                        fontWeight: 600,
                        fontFamily: 'Monaco, monospace'
                      }}>
                        {formatCurrency(item.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                No trend data available
              </div>
            )}
          </div>
        </div>

        {/* Templates Section (if templates exist) */}
        {templates.length > 0 && (
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            marginBottom: '16px'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#1a1a1a',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              QUICK ADD TEMPLATES
            </div>
            <div style={{
              fontSize: '11px',
              color: '#656d76',
              marginBottom: '16px'
            }}>
              One-click expense creation from saved templates
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {templates.map((template) => (
                <div
                  key={template.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => handleUseTemplate(template)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e2e8f0';
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8f9fa';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#1a1a1a', marginBottom: '4px' }}>
                    {template.template_name}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#3b82f6',
                    fontFamily: 'Monaco, monospace'
                  }}>
                    {formatCurrency(template.amount)}
                  </div>
                  <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px' }}>
                    {template.category} • {template.expense_type}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTemplate(template);
                    }}
                    style={{
                      marginTop: '8px',
                      padding: '4px 8px',
                      background: '#ffffff',
                      color: '#ef4444',
                      border: '1px solid #ef4444',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recurring Generation Banner (if needed) */}
        {needsRecurringGeneration && (
          <div style={{
            background: '#fef3c7',
            border: '2px solid #f59e0b',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#92400e',
                marginBottom: '4px'
              }}>
                ⚠️ Recurring Expenses Need Generation
              </div>
              <div style={{ fontSize: '11px', color: '#78350f' }}>
                You have {recurringTemplates.length} recurring template{recurringTemplates.length !== 1 ? 's' : ''} but no recurring expenses for {monthYear}. Click to generate them now.
              </div>
            </div>
            <button
              onClick={handleGenerateRecurring}
              disabled={generateRecurring.isPending}
              style={{
                padding: '8px 16px',
                background: '#f59e0b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: generateRecurring.isPending ? 'not-allowed' : 'pointer',
                opacity: generateRecurring.isPending ? 0.6 : 1,
                whiteSpace: 'nowrap'
              }}
            >
              {generateRecurring.isPending ? 'Generating...' : 'Generate Now'}
            </button>
          </div>
        )}

        {/* Expense List Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#1a1a1a',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              ALL EXPENSES
            </div>
            <button
              onClick={handleAddExpense}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              + Add Expense
            </button>
          </div>

          {isLoadingExpenses ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
              Loading expenses...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ fontSize: '48px' }}>📊</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>
                {hasFiltersApplied ? 'No expenses match your filters' : 'No expenses for this month'}
              </div>
              <div style={{ fontSize: '11px', color: '#656d76', marginBottom: '12px' }}>
                {hasFiltersApplied
                  ? 'Try adjusting your filters or clearing them to see more results'
                  : `Add your first expense for ${monthYear}`}
              </div>
              {hasFiltersApplied ? (
                <button
                  onClick={handleClearFilters}
                  style={{
                    padding: '8px 16px',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={handleAddExpense}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Add First Expense
                </button>
              )}
            </div>
          ) : (
            <table style={{
              width: '100%',
              fontSize: '11px',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{
                    textAlign: 'left',
                    padding: '8px 4px',
                    fontWeight: 600,
                    color: '#4a5568',
                    textTransform: 'uppercase',
                    fontSize: '9px',
                    letterSpacing: '0.5px'
                  }}>
                    DATE
                  </th>
                  <th style={{
                    textAlign: 'left',
                    padding: '8px 4px',
                    fontWeight: 600,
                    color: '#4a5568',
                    textTransform: 'uppercase',
                    fontSize: '9px',
                    letterSpacing: '0.5px'
                  }}>
                    NAME
                  </th>
                  <th style={{
                    textAlign: 'left',
                    padding: '8px 4px',
                    fontWeight: 600,
                    color: '#4a5568',
                    textTransform: 'uppercase',
                    fontSize: '9px',
                    letterSpacing: '0.5px'
                  }}>
                    CATEGORY
                  </th>
                  <th style={{
                    textAlign: 'left',
                    padding: '8px 4px',
                    fontWeight: 600,
                    color: '#4a5568',
                    textTransform: 'uppercase',
                    fontSize: '9px',
                    letterSpacing: '0.5px'
                  }}>
                    TYPE
                  </th>
                  <th style={{
                    textAlign: 'right',
                    padding: '8px 4px',
                    fontWeight: 600,
                    color: '#4a5568',
                    textTransform: 'uppercase',
                    fontSize: '9px',
                    letterSpacing: '0.5px'
                  }}>
                    AMOUNT
                  </th>
                  <th style={{
                    textAlign: 'center',
                    padding: '8px 4px',
                    fontWeight: 600,
                    color: '#4a5568',
                    textTransform: 'uppercase',
                    fontSize: '9px',
                    letterSpacing: '0.5px'
                  }}>
                    STATUS
                  </th>
                  <th style={{
                    textAlign: 'right',
                    padding: '8px 4px',
                    fontWeight: 600,
                    color: '#4a5568',
                    textTransform: 'uppercase',
                    fontSize: '9px',
                    letterSpacing: '0.5px'
                  }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 4px', color: '#1a1a1a' }}>
                      {new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '8px 4px', color: '#1a1a1a', fontWeight: 500 }}>
                      {expense.name}
                    </td>
                    <td style={{ padding: '8px 4px', color: '#656d76' }}>
                      {expense.category}
                    </td>
                    <td style={{ padding: '8px 4px' }}>
                      <span style={{
                        padding: '4px 8px',
                        background: expense.expense_type === 'business' ? '#dbeafe' : '#f3f4f6',
                        color: expense.expense_type === 'business' ? '#1e40af' : '#4a5568',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontWeight: 600,
                        textTransform: 'capitalize'
                      }}>
                        {expense.expense_type}
                      </span>
                    </td>
                    <td style={{
                      padding: '8px 4px',
                      textAlign: 'right',
                      color: '#1a1a1a',
                      fontWeight: 600,
                      fontFamily: 'Monaco, monospace'
                    }}>
                      {formatCurrency(expense.amount)}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {expense.is_recurring && (
                          <span style={{
                            padding: '2px 6px',
                            background: '#fef3c7',
                            color: '#92400e',
                            borderRadius: '3px',
                            fontSize: '8px',
                            fontWeight: 600
                          }} title="Recurring expense">
                            🔁
                          </span>
                        )}
                        {expense.is_tax_deductible && (
                          <span style={{
                            padding: '2px 6px',
                            background: '#d1fae5',
                            color: '#065f46',
                            borderRadius: '3px',
                            fontSize: '8px',
                            fontWeight: 600
                          }} title="Tax deductible">
                            💰
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleEditExpense(expense)}
                          style={{
                            padding: '4px 8px',
                            background: '#f1f5f9',
                            color: '#475569',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '9px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense)}
                          style={{
                            padding: '4px 8px',
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '9px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Dialogs */}
      <ExpenseDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleSaveExpense}
        isSubmitting={createExpense.isPending}
      />

      <ExpenseDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        expense={selectedExpense}
        onSave={handleSaveExpense}
        isSubmitting={updateExpense.isPending}
      />

      <ExpenseDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        expense={selectedExpense}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteExpense.isPending}
      />
    </PageLayout>
  );
}
