// src/features/expenses/ExpenseDashboard.tsx

import React, { useState, useMemo } from 'react';
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

// New components
import { ExpensePageHeader } from './components/ExpensePageHeader';
import { ExpenseSummaryCard } from './components/ExpenseSummaryCard';
import { InlineFiltersToolbar } from './components/InlineFiltersToolbar';
import { ExpenseBreakdownCard } from './components/ExpenseBreakdownCard';
import { ExpenseTrendCard } from './components/ExpenseTrendCard';
import { ExpenseTemplatesPanel } from './components/ExpenseTemplatesPanel';
import { RecurringGenerationBanner } from './components/RecurringGenerationBanner';
import { ExpenseListCard } from './components/ExpenseListCard';
import { ExpenseDialog } from './components/ExpenseDialog';
import { ExpenseDeleteDialog } from './components/ExpenseDeleteDialog';
import { ExpenseEmptyState } from './components/ExpenseEmptyState';

// Config
import {
  generateCategoryBreakdownConfig,
  generateTrendData,
} from './config/expenseStatsConfig';

/**
 * ExpenseDashboard - Main expense management page (REDESIGNED)
 *
 * NEW LAYOUT:
 * - Clean vertical flow matching Analytics page
 * - Clear sections with proper hierarchy
 * - Smart contextual recurring generation
 * - Comprehensive empty states
 * - Better filter UX
 */
export function ExpenseDashboard() {
  // State for filters and dialogs
  const [filters, setFilters] = useState<AdvancedExpenseFilters>({
    expenseType: 'all',
    category: 'all',
    searchTerm: '',
    deductibleOnly: false,
    recurringOnly: false,
  });

  // Month navigation state
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Data fetching with TanStack Query
  const { data: expenses = [], isLoading: isLoadingExpenses } = useExpenses({ filters });
  const { data: templates = [] } = useExpenseTemplates();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const deleteTemplate = useDeleteExpenseTemplate();
  const generateRecurring = useGenerateRecurringExpenses();

  // Calculate analytics using service layer
  const filteredExpenses = useMemo(() => {
    // First apply advanced filters
    let filtered = expenseAnalyticsService.applyAdvancedFilters(expenses, filters);

    // Then filter by selected month
    filtered = filtered.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getMonth() === selectedMonth.getMonth() &&
        expenseDate.getFullYear() === selectedMonth.getFullYear()
      );
    });

    return filtered;
  }, [expenses, filters, selectedMonth]);

  const momGrowthData = useMemo(
    () => expenseAnalyticsService.getMoMGrowth(filteredExpenses),
    [filteredExpenses]
  );

  const momGrowth = momGrowthData.growthPercentage;

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

  // Calculate totals
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const businessAmount = filteredExpenses
    .filter((e) => e.expense_type === 'business')
    .reduce((sum, e) => sum + e.amount, 0);
  const personalAmount = filteredExpenses
    .filter((e) => e.expense_type === 'personal')
    .reduce((sum, e) => sum + e.amount, 0);
  const expenseCount = filteredExpenses.length;

  // Check if we have any expenses at all for the month (before filters)
  const expensesForMonth = useMemo(() => {
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getMonth() === selectedMonth.getMonth() &&
        expenseDate.getFullYear() === selectedMonth.getFullYear()
      );
    });
  }, [expenses, selectedMonth]);

  const hasNoExpensesThisMonth = expensesForMonth.length === 0;
  const hasFiltersApplied = filters.expenseType !== 'all' ||
    filters.category !== 'all' ||
    filters.searchTerm !== '' ||
    filters.deductibleOnly ||
    filters.recurringOnly;

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

  // Template handlers - ONE-CLICK experience
  const handleUseTemplate = async (template: ExpenseTemplate) => {
    const expenseData = expenseTemplateService.templateToExpenseData(template);
    const today = new Date().toISOString().split('T')[0];
    const monthYear = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    const newExpenseData: CreateExpenseData = {
      ...expenseData,
      date: today,
    };

    try {
      await createExpense.mutateAsync(newExpenseData);
      showToast.success(`✓ Expense added: $${template.amount.toFixed(2)} ${template.template_name} (${monthYear})`);
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

  // Recurring expense generation handler
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

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8f9fa',
        padding: window.innerWidth < 768 ? '12px' : '24px',
        overflowX: 'hidden',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Page Header */}
      <ExpensePageHeader
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      {/* Summary Metrics Card */}
      <ExpenseSummaryCard
        totalAmount={totalAmount}
        businessAmount={businessAmount}
        personalAmount={personalAmount}
        itemCount={expenseCount}
        momGrowth={momGrowth}
        onExportCSV={handleExportCSV}
        isLoading={isLoadingExpenses}
      />

      {/* Filters Toolbar */}
      <InlineFiltersToolbar
        filters={filters}
        onFiltersChange={setFilters}
        categories={DEFAULT_EXPENSE_CATEGORIES}
        resultCount={filteredExpenses.length}
      />

      {/* Analytics Cards - Only show if we have data */}
      {!hasNoExpensesThisMonth && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth >= 1200 ? '1fr 1fr' : '1fr',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          <ExpenseBreakdownCard
            categoryData={categoryBreakdown}
            isLoading={isLoadingExpenses}
          />
          <ExpenseTrendCard trendData={trendData} isLoading={isLoadingExpenses} />
        </div>
      )}

      {/* Templates Section - Only show if templates exist */}
      {templates.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <ExpenseTemplatesPanel
            onUseTemplate={handleUseTemplate}
            onDeleteTemplate={handleDeleteTemplate}
          />
        </div>
      )}

      {/* Recurring Generation Banner - Smart contextual display */}
      <RecurringGenerationBanner
        templates={templates}
        selectedMonth={selectedMonth}
        expenses={expensesForMonth}
        onGenerate={handleGenerateRecurring}
        isGenerating={generateRecurring.isPending}
      />

      {/* Expense List or Empty State */}
      {hasNoExpensesThisMonth ? (
        <ExpenseEmptyState
          type="no-expenses"
          onAddExpense={handleAddExpense}
          selectedMonth={selectedMonth}
        />
      ) : filteredExpenses.length === 0 && hasFiltersApplied ? (
        <ExpenseEmptyState
          type="no-results"
          onClearFilters={handleClearFilters}
        />
      ) : (
        <ExpenseListCard
          expenses={filteredExpenses}
          onEdit={handleEditExpense}
          onDelete={handleDeleteExpense}
          isLoading={isLoadingExpenses}
        />
      )}

      {/* Floating Action Button */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 100,
        }}
      >
        <button
          onClick={handleAddExpense}
          style={{
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
          }}
        >
          <span style={{ fontSize: '18px' }}>+</span>
          Add Expense
        </button>
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
    </div>
  );
}
