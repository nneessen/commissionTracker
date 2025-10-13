// src/features/expenses/ExpenseDashboard.tsx

import React, { useState, useMemo } from 'react';
import { PageLayout } from '../../components/layout';
import { useExpenses } from '../../hooks/expenses/useExpenses';
import { useCreateExpense } from '../../hooks/expenses/useCreateExpense';
import { useUpdateExpense } from '../../hooks/expenses/useUpdateExpense';
import { useDeleteExpense } from '../../hooks/expenses/useDeleteExpense';
import { useGenerateRecurringExpenses } from '../../hooks/expenses/useGenerateRecurring';
import { expenseAnalyticsService } from '../../services/expenses/expenseAnalyticsService';
import { expenseService } from '../../services/expenses/expenseService';
import { expenseTemplateService } from '../../services/expenses/expenseTemplateService';
import { supabase } from '../../services/base/supabase';
import type { Expense, AdvancedExpenseFilters, CreateExpenseData, ExpenseTemplate } from '../../types/expense.types';
import { DEFAULT_EXPENSE_CATEGORIES } from '../../types/expense.types';
import showToast from '../../utils/toast';
import { useDeleteExpenseTemplate } from '../../hooks/expenses/useExpenseTemplates';

// New components
import { ExpenseCompactHeader } from './components/ExpenseCompactHeader';
import { InlineFiltersToolbar } from './components/InlineFiltersToolbar';
import { ExpenseBreakdownCard } from './components/ExpenseBreakdownCard';
import { ExpenseTrendCard } from './components/ExpenseTrendCard';
import { ExpenseListCard } from './components/ExpenseListCard';
import { ExpenseDialog } from './components/ExpenseDialog';
import { ExpenseDeleteDialog } from './components/ExpenseDeleteDialog';
import { ExpenseTemplatesPanel } from './components/ExpenseTemplatesPanel';

// Config
import {
  generateExpenseStatsConfig,
  generateCategoryBreakdownConfig,
  generateTrendData,
} from './config/expenseStatsConfig';

// Constants
import { EXPENSE_BACKGROUNDS, EXPENSE_SPACING, EXPENSE_LAYOUT } from '../../constants/expenses';

/**
 * ExpenseDashboard - Main expense management page
 *
 * Container component that:
 * - Fetches all data using TanStack Query hooks
 * - Calculates analytics using service layer
 * - Passes everything as props to child components
 * - Handles all user actions (add, edit, delete, export)
 * - NO component does its own data fetching
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

  const momGrowth = useMemo(
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

  // Calculate totals
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const businessAmount = filteredExpenses
    .filter((e) => e.expense_type === 'business')
    .reduce((sum, e) => sum + e.amount, 0);
  const personalAmount = filteredExpenses
    .filter((e) => e.expense_type === 'personal')
    .reduce((sum, e) => sum + e.amount, 0);
  const expenseCount = filteredExpenses.length;

  // Generate stats configuration
  const statsConfig = useMemo(
    () => generateExpenseStatsConfig({
      totalAmount,
      expenseCount,
      momGrowth,
      personalAmount,
      businessAmount,
      timePeriod: 'MTD', // Could be dynamic in the future
    }),
    [totalAmount, expenseCount, momGrowth, personalAmount, businessAmount]
  );

  // Categories for filter dropdown
  const categories = DEFAULT_EXPENSE_CATEGORIES.map((cat) => cat.name);

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
        // Delete just this one expense
        await deleteExpense.mutateAsync(selectedExpense.id);
        showToast.success('Expense deleted successfully!');
      } else if (deleteOption === 'future') {
        // Delete this and all future occurrences
        const { recurringExpenseService } = await import('./../../services/expenses/recurringExpenseService');
        const count = await recurringExpenseService.deleteFutureExpenses(
          selectedExpense.recurring_group_id,
          selectedExpense.date
        );
        // Also delete the current one
        await deleteExpense.mutateAsync(selectedExpense.id);
        showToast.success(`Deleted current expense and ${count} future occurrences!`);
      } else if (deleteOption === 'all') {
        // Delete all expenses in the recurring group
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

    // Create expense data with today's date
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

  return (
    <div
      style={{
        minHeight: '100vh',
        background: EXPENSE_BACKGROUNDS.PAGE_BG,
        padding: EXPENSE_SPACING.PAGE_PADDING,
      }}
    >
      {/* Quick Action Button - Add Expense */}
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

      {/* Compact Header with Month Navigation and Inline Metrics */}
      <ExpenseCompactHeader
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        totalAmount={totalAmount}
        businessAmount={businessAmount}
        personalAmount={personalAmount}
        itemCount={expenseCount}
        onExportCSV={handleExportCSV}
        isLoading={isLoadingExpenses}
      />

      {/* Inline Filters Toolbar */}
      <InlineFiltersToolbar
        filters={filters}
        onFiltersChange={setFilters}
        categories={DEFAULT_EXPENSE_CATEGORIES}
        resultCount={filteredExpenses.length}
      />

      {/* Quick Add Templates Section with Recurring Generator */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <ExpenseTemplatesPanel
            onUseTemplate={handleUseTemplate}
            onDeleteTemplate={handleDeleteTemplate}
          />
        </div>

        {/* Generate Recurring Button */}
        <button
          onClick={handleGenerateRecurring}
          disabled={generateRecurring.isPending}
          style={{
            padding: '12px 20px',
            background: generateRecurring.isPending
              ? '#94a3b8'
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: generateRecurring.isPending ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            if (!generateRecurring.isPending) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!generateRecurring.isPending) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
            }
          }}
        >
          <span style={{ fontSize: '16px' }}>🔄</span>
          {generateRecurring.isPending ? 'Generating...' : 'Generate Recurring'}
        </button>
      </div>

      {/* Analytics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: EXPENSE_SPACING.CARD_GAP,
          marginBottom: EXPENSE_SPACING.SECTION_GAP,
        }}
      >
        <ExpenseBreakdownCard
          categoryData={categoryBreakdown}
          isLoading={isLoadingExpenses}
        />
        <ExpenseTrendCard trendData={trendData} isLoading={isLoadingExpenses} />
      </div>

      {/* Expense List - Full Width */}
      <ExpenseListCard
        expenses={filteredExpenses}
        onEdit={handleEditExpense}
        onDelete={handleDeleteExpense}
        isLoading={isLoadingExpenses}
      />

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
