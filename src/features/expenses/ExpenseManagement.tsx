// src/features/expenses/ExpenseManagement.tsx

import { useState } from 'react';
import { Plus, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExpenseSummaryCards } from './components/ExpenseSummaryCards';
import { ExpenseFilters } from './components/ExpenseFilters';
import { ExpenseTable } from './components/ExpenseTable';
import { ExpenseDialog } from './components/ExpenseDialog';
import { ExpenseDeleteDialog } from './components/ExpenseDeleteDialog';
import { useExpenses } from '@/hooks/expenses/useExpenses';
import { useExpenseMetrics } from '@/hooks/expenses/useExpenseMetrics';
import { useCreateExpense } from '@/hooks/expenses/useCreateExpense';
import { useUpdateExpense } from '@/hooks/expenses/useUpdateExpense';
import { useDeleteExpense } from '@/hooks/expenses/useDeleteExpense';
import type { Expense, ExpenseFilters as ExpenseFiltersType, CreateExpenseData } from '@/types/expense.types';
import { DEFAULT_EXPENSE_CATEGORIES } from '@/types/expense.types';
import { expenseService } from '@/services/expenses';

export function ExpenseManagement() {
  // State
  const [filters, setFilters] = useState<ExpenseFiltersType>({
    expenseType: 'all',
    category: 'all',
    searchTerm: '',
    deductibleOnly: false,
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Hooks
  const { data: expenses = [], isLoading: isLoadingExpenses } = useExpenses({ filters });
  const { data: totals, isLoading: isLoadingMetrics } = useExpenseMetrics({ filters });
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

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
      // Update existing
      await updateExpense.mutateAsync({ id: selectedExpense.id, updates: data });
      setIsEditDialogOpen(false);
    } else {
      // Create new
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
    const csv = expenseService.exportToCSV(expenses);
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

  // Get unique categories from expenses
  const categories = DEFAULT_EXPENSE_CATEGORIES.map(cat => cat.name);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Track and manage your personal and business expenses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={expenses.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={handleAddExpense}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <ExpenseSummaryCards totals={totals} isLoading={isLoadingMetrics} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Expenses</CardTitle>
          <CardDescription>Search and filter your expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseFilters
            filters={filters}
            onFiltersChange={setFilters}
            categories={categories}
          />
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
          <CardDescription>
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseTable
            expenses={expenses}
            isLoading={isLoadingExpenses}
            onEdit={handleEditExpense}
            onDelete={handleDeleteExpense}
          />
        </CardContent>
      </Card>

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