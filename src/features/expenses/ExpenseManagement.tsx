// src/features/expenses/ExpenseManagement.tsx

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Download, Settings } from 'lucide-react';
import { ExpenseSummaryCards } from './components/ExpenseSummaryCards';
import { ExpenseFilters } from './components/ExpenseFilters';
import { ExpenseTable } from './components/ExpenseTable';
import { ExpenseDialog } from './components/ExpenseDialog';
import { ExpenseDeleteDialog } from './components/ExpenseDeleteDialog';
import { ExpenseBulkImport } from './components/ExpenseBulkImport';
import { CategoryManagementDialog } from './components/CategoryManagementDialog';
import { useExpenses, useExpenseMetrics, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/expenses';
import type { Expense, ExpenseFilters as ExpenseFiltersType, CreateExpenseData, UpdateExpenseData } from '@/types/expense.types';

export function ExpenseManagement() {
  const [filters, setFilters] = useState<ExpenseFiltersType>({
    expenseType: 'all',
    category: 'all',
    searchTerm: '',
    deductibleOnly: false,
  });

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isCategoryManagementOpen, setIsCategoryManagementOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Hooks
  const { data: expenses = [], isLoading: isLoadingExpenses } = useExpenses({ filters });
  const { data: totals, isLoading: isLoadingMetrics } = useExpenseMetrics();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

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

  const handleSaveExpense = async (data: CreateExpenseData | { id: string; updates: UpdateExpenseData }) => {
    if ('id' in data) {
      // Update existing
      await updateExpense.mutateAsync(data);
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

  const handleBulkImport = async (csvText: string) => {
    const lines = csvText.trim().split('\n');

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [name, description, amountStr, type, category, date, deductibleStr] = line
        .split(',')
        .map((s) => s.trim());

      if (!name || !description || !amountStr || !type || !category || !date) {
        throw new Error(`Invalid data on line ${i + 1}: missing required fields`);
      }

      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount <= 0) {
        throw new Error(`Invalid amount on line ${i + 1}`);
      }

      if (type !== 'personal' && type !== 'business') {
        throw new Error(`Invalid type on line ${i + 1}: must be "personal" or "business"`);
      }

      const validCategories = ['marketing', 'office', 'travel', 'professional', 'technology', 'other'];
      if (!validCategories.includes(category)) {
        throw new Error(`Invalid category on line ${i + 1}`);
      }

      const expenseData: CreateExpenseData = {
        name,
        description,
        amount,
        expense_type: type as 'personal' | 'business',
        category: category,
        date: date,
        is_deductible: deductibleStr?.toLowerCase() === 'true',
        receipt_url: null,
        notes: null,
      };

      await createExpense.mutateAsync(expenseData);
    }
  };

  const handleExportCSV = () => {
    if (expenses.length === 0) {
      alert('No expenses to export');
      return;
    }

    const headers = ['Date', 'Name', 'Description', 'Type', 'Category', 'Amount', 'Deductible'];
    const csvContent = [
      headers.join(','),
      ...expenses.map((expense) =>
        [
          expense.date,
          `"${expense.name}"`,
          `"${expense.description}"`,
          expense.expense_type,
          expense.category,
          expense.amount,
          expense.is_deductible,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Summary Cards */}
        <ExpenseSummaryCards totals={totals} isLoading={isLoadingMetrics} />

        {/* Main Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>Expense Management</CardTitle>
                <CardDescription>
                  Track and manage your personal and business expenses
                </CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => setIsCategoryManagementOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Categories
                </Button>
                <Button variant="outline" onClick={handleExportCSV} disabled={expenses.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Import
                </Button>
                <Button onClick={handleAddExpense}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Filters */}
            <ExpenseFilters filters={filters} onFiltersChange={setFilters} />

            {/* Table */}
            <ExpenseTable
              expenses={expenses}
              isLoading={isLoadingExpenses}
              onEdit={handleEditExpense}
              onDelete={handleDeleteExpense}
            />
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <ExpenseDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        expense={null}
        onSave={handleSaveExpense}
        isSaving={createExpense.isPending}
      />

      <ExpenseDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        expense={selectedExpense}
        onSave={handleSaveExpense}
        isSaving={updateExpense.isPending}
      />

      <ExpenseDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        expense={selectedExpense}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteExpense.isPending}
      />

      <ExpenseBulkImport
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        onImport={handleBulkImport}
        isImporting={createExpense.isPending}
      />

      <CategoryManagementDialog
        open={isCategoryManagementOpen}
        onOpenChange={setIsCategoryManagementOpen}
      />
    </>
  );
}
