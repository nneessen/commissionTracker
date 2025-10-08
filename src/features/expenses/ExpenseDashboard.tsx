// src/features/expenses/ExpenseDashboard.tsx

import { useState } from 'react';
import { Plus, Download, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExpenseHero } from './components/ExpenseHero';
import { ExpenseDualPanel } from './components/ExpenseDualPanel';
import { ExpenseHeatmap } from './components/ExpenseHeatmap';
import { ExpenseTimeline } from './components/ExpenseTimeline';
import { ExpenseSmartFilters } from './components/ExpenseSmartFilters';
import { ExpenseDialog } from './components/ExpenseDialog';
import { ExpenseDeleteDialog } from './components/ExpenseDeleteDialog';
import { useExpenses } from '@/hooks/expenses/useExpenses';
import { useCreateExpense } from '@/hooks/expenses/useCreateExpense';
import { useUpdateExpense } from '@/hooks/expenses/useUpdateExpense';
import { useDeleteExpense } from '@/hooks/expenses/useDeleteExpense';
import { expenseAnalyticsService } from '@/services/expenses/expenseAnalyticsService';
import { expenseService } from '@/services/expenses/expenseService';
import type { Expense, AdvancedExpenseFilters, CreateExpenseData } from '@/types/expense.types';
import { DEFAULT_EXPENSE_CATEGORIES } from '@/types/expense.types';

export function ExpenseDashboard() {
  // Filters state
  const [filters, setFilters] = useState<AdvancedExpenseFilters>({
    expenseType: 'all',
    category: 'all',
    searchTerm: '',
    deductibleOnly: false,
    recurringOnly: false,
  });

  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Data fetching
  const { data: expenses = [], isLoading: isLoadingExpenses } = useExpenses({ filters });
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  // Analytics calculations
  const filteredExpenses = expenseAnalyticsService.applyAdvancedFilters(expenses, filters);
  const trendData = expenseAnalyticsService.getTrendData(filteredExpenses, 12);
  const categoryBreakdown = expenseAnalyticsService.getCategoryBreakdown(filteredExpenses);
  const comparisonData = expenseAnalyticsService.getComparisonData(filteredExpenses);
  const momGrowth = expenseAnalyticsService.getMoMGrowth(filteredExpenses);

  // Totals
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const previousMonthTotal = momGrowth.previousMonth;
  const deductibleAmount = filteredExpenses
    .filter((e) => e.is_deductible)
    .reduce((sum, e) => sum + e.amount, 0);

  // Handlers
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
    if (selectedExpense) {
      await updateExpense.mutateAsync({ id: selectedExpense.id, updates: data });
      setIsEditDialogOpen(false);
    } else {
      await createExpense.mutateAsync(data);
      setIsAddDialogOpen(false);
    }
    setSelectedExpense(null);
  };

  const handleConfirmDelete = async () => {
    if (selectedExpense) {
      await deleteExpense.mutateAsync(selectedExpense.id);
      setIsDeleteDialogOpen(false);
      setSelectedExpense(null);
    }
  };

  const handleExportCSV = () => {
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
  };

  const categories = DEFAULT_EXPENSE_CATEGORIES.map((cat) => cat.name);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Expense Tracker</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your personal and business expenses
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={filteredExpenses.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button onClick={handleAddExpense} className="shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <ExpenseHero
          totalAmount={totalAmount}
          previousMonthAmount={previousMonthTotal}
          trendData={trendData}
          isLoading={isLoadingExpenses}
        />

        {/* Dual Panel - Donut + Categories */}
        <ExpenseDualPanel
          categoryData={categoryBreakdown}
          comparisonData={comparisonData}
          deductibleAmount={deductibleAmount}
          isLoading={isLoadingExpenses}
        />

        {/* Smart Filters */}
        <ExpenseSmartFilters
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
          resultCount={filteredExpenses.length}
        />

        {/* Heatmap - Full Width */}
        <ExpenseHeatmap
          expenses={filteredExpenses}
          isLoading={isLoadingExpenses}
          months={6}
        />

        {/* Timeline */}
        <ExpenseTimeline
          expenses={filteredExpenses}
          onEdit={handleEditExpense}
          onDelete={handleDeleteExpense}
          limit={8}
          isLoading={isLoadingExpenses}
        />
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
