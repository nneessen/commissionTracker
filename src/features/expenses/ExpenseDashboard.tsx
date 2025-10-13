// src/features/expenses/ExpenseDashboard.tsx

import React, { useState, useMemo } from 'react';
import { PageLayout } from '../../components/layout';
import { useExpenses } from '../../hooks/expenses/useExpenses';
import { useCreateExpense } from '../../hooks/expenses/useCreateExpense';
import { useUpdateExpense } from '../../hooks/expenses/useUpdateExpense';
import { useDeleteExpense } from '../../hooks/expenses/useDeleteExpense';
import { expenseAnalyticsService } from '../../services/expenses/expenseAnalyticsService';
import { expenseService } from '../../services/expenses/expenseService';
import { expenseTemplateService } from '../../services/expenses/expenseTemplateService';
import type { Expense, AdvancedExpenseFilters, CreateExpenseData, ExpenseTemplate } from '../../types/expense.types';
import { DEFAULT_EXPENSE_CATEGORIES } from '../../types/expense.types';
import showToast from '../../utils/toast';
import { useDeleteExpenseTemplate } from '../../hooks/expenses/useExpenseTemplates';

// New components
import { ExpenseHeader } from './components/ExpenseHeader';
import { ExpenseStatsPanel } from './components/ExpenseStatsPanel';
import { ExpenseFiltersPanel } from './components/ExpenseFiltersPanel';
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

  // Calculate analytics using service layer
  const filteredExpenses = useMemo(
    () => expenseAnalyticsService.applyAdvancedFilters(expenses, filters),
    [expenses, filters]
  );

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

  const handleConfirmDelete = async () => {
    if (selectedExpense) {
      try {
        await deleteExpense.mutateAsync(selectedExpense.id);
        showToast.success('Expense deleted successfully!');
        setIsDeleteDialogOpen(false);
        setSelectedExpense(null);
      } catch (error) {
        console.error('Error deleting expense:', error);
        showToast.error('Failed to delete expense. Please try again.');
      }
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

  // Template handlers
  const handleUseTemplate = (template: ExpenseTemplate) => {
    const expenseData = expenseTemplateService.templateToExpenseData(template);
    setSelectedExpense({
      ...expenseData,
      date: new Date().toISOString().split('T')[0], // Today's date
    } as any);
    setIsAddDialogOpen(true);
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

      {/* Header */}
      <ExpenseHeader
        onExportCSV={handleExportCSV}
        expenseCount={filteredExpenses.length}
      />

      {/* Stats Panel - Full Width */}
      <ExpenseStatsPanel stats={statsConfig} isLoading={isLoadingExpenses} />

      {/* Main Layout: 2-column grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: EXPENSE_LAYOUT.MAIN_GRID,
          gap: EXPENSE_SPACING.SECTION_GAP,
          marginBottom: EXPENSE_SPACING.SECTION_GAP,
        }}
      >
        {/* Left Column - Main Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: EXPENSE_SPACING.SECTION_GAP,
          }}
        >
          {/* Breakdown and Trend Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: EXPENSE_SPACING.CARD_GAP,
            }}
          >
            <ExpenseBreakdownCard
              categoryData={categoryBreakdown}
              isLoading={isLoadingExpenses}
            />
            <ExpenseTrendCard trendData={trendData} isLoading={isLoadingExpenses} />
          </div>

          {/* Expense List */}
          <ExpenseListCard
            expenses={filteredExpenses}
            onEdit={handleEditExpense}
            onDelete={handleDeleteExpense}
            isLoading={isLoadingExpenses}
          />
        </div>

        {/* Right Column - Templates & Filters Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: EXPENSE_SPACING.SECTION_GAP }}>
          <ExpenseTemplatesPanel
            onUseTemplate={handleUseTemplate}
            onDeleteTemplate={handleDeleteTemplate}
          />

          <ExpenseFiltersPanel
            filters={filters}
            onFiltersChange={setFilters}
            categories={categories}
            resultCount={filteredExpenses.length}
          />
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
    </div>
  );
}
