// src/features/expenses/ExpenseDashboard.tsx
import { useState } from "react";
import { PageLayout } from "../../components/layout";
import { useExpenses } from "../../hooks/expenses/useExpenses";
import { useCreateExpense } from "../../hooks/expenses/useCreateExpense";
import { useUpdateExpense } from "../../hooks/expenses/useUpdateExpense";
import { useDeleteExpense } from "../../hooks/expenses/useDeleteExpense";
import { useGenerateRecurringExpenses } from "../../hooks/expenses/useGenerateRecurring";
import {
  useExpenseTemplates,
  useDeleteExpenseTemplate,
} from "../../hooks/expenses/useExpenseTemplates";
import { expenseAnalyticsService } from "../../services/expenses/expenseAnalyticsService";
import { expenseService } from "../../services/expenses/expenseService";
import { expenseTemplateService } from "../../services/expenses/expenseTemplateService";
import { supabase } from "../../services/base/supabase";
import type {
  Expense,
  AdvancedExpenseFilters,
  CreateExpenseData,
  ExpenseTemplate,
} from "../../types/expense.types";
import { formatCurrency, formatMonthYear } from "../../lib/format";
import showToast from "../../utils/toast";
import { Heading } from "../../components/ui/heading";

import { ExpenseDialog } from "./components/ExpenseDialog";
import { ExpenseDeleteDialog } from "./components/ExpenseDeleteDialog";
import { ExpenseMonthSelector } from "./components/ExpenseMonthSelector";
import { ExpenseSummaryStats } from "./components/ExpenseSummaryStats";
import { ExpenseCategoryBreakdown } from "./components/ExpenseCategoryBreakdown";
import { ExpenseFilters } from "./components/ExpenseFilters";
import { ExpenseTrendChart } from "./components/ExpenseTrendChart";
import { ExpenseTemplatesPanel } from "./components/ExpenseTemplatesPanel";
import { ExpenseRecurringBanner } from "./components/ExpenseRecurringBanner";
import { ExpenseTable } from "./components/ExpenseTable";

import {
  generateCategoryBreakdownConfig,
  generateTrendData,
} from "./config/expenseStatsConfig";
import { DEFAULT_EXPENSE_CATEGORIES } from "../../types/expense.types";

export function ExpenseDashboard() {
  // State
  const [filters, setFilters] = useState<AdvancedExpenseFilters>({
    expenseType: "all",
    category: "all",
    searchTerm: "",
    deductibleOnly: false,
    recurringOnly: false,
  });
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Data fetching
  const { data: expenses = [], isLoading = false } = useExpenses({ filters });
  const { data: templates = [] } = useExpenseTemplates();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const deleteTemplate = useDeleteExpenseTemplate();
  const generateRecurring = useGenerateRecurringExpenses();

  // Calculate filtered data (NO useMemo - React 19.1 optimizes automatically)
  let filteredExpenses = expenseAnalyticsService.applyAdvancedFilters(
    expenses,
    filters
  );
  filteredExpenses = filteredExpenses.filter((expense) => {
    const expenseDate = new Date(expense.date);
    return (
      expenseDate.getMonth() === selectedMonth.getMonth() &&
      expenseDate.getFullYear() === selectedMonth.getFullYear()
    );
  });

  const expensesForMonth = expenses.filter((expense) => {
    const expenseDate = new Date(expense.date);
    return (
      expenseDate.getMonth() === selectedMonth.getMonth() &&
      expenseDate.getFullYear() === selectedMonth.getFullYear()
    );
  });

  // Analytics calculations (NO useMemo)
  const momGrowthData = expenseAnalyticsService.getMoMGrowth(filteredExpenses);
  const categoryBreakdown = generateCategoryBreakdownConfig({
    expenses: filteredExpenses.map((e) => ({
      category: e.category,
      amount: e.amount,
    })),
    totalAmount: filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
  });
  const trendData = generateTrendData({
    expenses: filteredExpenses.map((e) => ({
      date: e.date,
      amount: e.amount,
    })),
    months: 6,
  });

  // Totals
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const businessAmount = filteredExpenses
    .filter((e) => e.expense_type === "business")
    .reduce((sum, e) => sum + e.amount, 0);
  const personalAmount = filteredExpenses
    .filter((e) => e.expense_type === "personal")
    .reduce((sum, e) => sum + e.amount, 0);

  const monthYear = formatMonthYear(selectedMonth);

  // Derived state
  const recurringTemplates = templates.filter(
    (t) => t.recurring_frequency !== null
  );
  const hasRecurringExpensesThisMonth = expensesForMonth.some(
    (e) => e.recurring_group_id
  );
  const needsRecurringGeneration =
    recurringTemplates.length > 0 && !hasRecurringExpensesThisMonth;

  const hasFiltersApplied =
    filters.expenseType !== "all" ||
    filters.category !== "all" ||
    filters.searchTerm !== "" ||
    !!filters.deductibleOnly ||
    !!filters.recurringOnly;

  // Event handlers
  const handleSaveExpense = async (data: CreateExpenseData) => {
    try {
      if (selectedExpense) {
        await updateExpense.mutateAsync({
          id: selectedExpense.id,
          updates: data,
        });
        showToast.success("Expense updated successfully!");
        setIsEditDialogOpen(false);
      } else {
        await createExpense.mutateAsync(data);
        showToast.success("Expense created successfully!");
        setIsAddDialogOpen(false);
      }
      setSelectedExpense(null);
    } catch (error) {
      showToast.error("Failed to save expense. Please try again.");
    }
  };

  const handleConfirmDelete = async (
    deleteOption: "single" | "future" | "all"
  ) => {
    if (!selectedExpense) return;
    try {
      if (deleteOption === "single" || !selectedExpense.recurring_group_id) {
        await deleteExpense.mutateAsync(selectedExpense.id);
        showToast.success("Expense deleted successfully!");
      } else if (deleteOption === "future") {
        const { recurringExpenseService } = await import(
          "./../../services/expenses/recurringExpenseService"
        );
        const count = await recurringExpenseService.deleteFutureExpenses(
          selectedExpense.recurring_group_id,
          selectedExpense.date
        );
        await deleteExpense.mutateAsync(selectedExpense.id);
        showToast.success(
          `Deleted current expense and ${count} future occurrences!`
        );
      } else if (deleteOption === "all") {
        await supabase
          .from("expenses")
          .delete()
          .eq("recurring_group_id", selectedExpense.recurring_group_id);
        showToast.success("Deleted all recurring expenses!");
      }
      setIsDeleteDialogOpen(false);
      setSelectedExpense(null);
    } catch (error) {
      showToast.error("Failed to delete expense. Please try again.");
    }
  };

  const handleExportCSV = () => {
    try {
      const csv = expenseService.exportToCSV(filteredExpenses);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast.success("Expenses exported to CSV!");
    } catch (error) {
      showToast.error("Failed to export CSV. Please try again.");
    }
  };

  const handleUseTemplate = async (template: ExpenseTemplate) => {
    const expenseData = expenseTemplateService.templateToExpenseData(template);
    const today = new Date().toISOString().split("T")[0];
    try {
      await createExpense.mutateAsync({ ...expenseData, date: today });
      showToast.success(
        `✓ Added: ${template.template_name} - ${formatCurrency(template.amount)}`
      );
    } catch (error) {
      showToast.error("Failed to create expense. Please try again.");
    }
  };

  const handleDeleteTemplate = async (template: ExpenseTemplate) => {
    if (confirm(`Delete template "${template.template_name}"?`)) {
      try {
        await deleteTemplate.mutateAsync(template.id);
        showToast.success("Template deleted successfully!");
      } catch (error) {
        showToast.error("Failed to delete template. Please try again.");
      }
    }
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-background p-3 md:p-6 space-y-4">
        {/* Page Header */}
        <div className="space-y-2">
          <Heading size="lg" as="h1">
            Expenses
          </Heading>
          <p className="text-sm text-muted-foreground">
            Track and manage business and personal expenses
          </p>
        </div>

        {/* Month Selector */}
        <ExpenseMonthSelector
          selectedMonth={selectedMonth}
          onPrevMonth={() => {
            const newDate = new Date(selectedMonth);
            newDate.setMonth(newDate.getMonth() - 1);
            setSelectedMonth(newDate);
          }}
          onNextMonth={() => {
            const newDate = new Date(selectedMonth);
            newDate.setMonth(newDate.getMonth() + 1);
            setSelectedMonth(newDate);
          }}
          onToday={() => setSelectedMonth(new Date())}
          onExport={handleExportCSV}
        />

        {/* Summary + Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ExpenseSummaryStats
            totalAmount={totalAmount}
            businessAmount={businessAmount}
            personalAmount={personalAmount}
            transactionCount={filteredExpenses.length}
            momGrowthPercentage={momGrowthData.growthPercentage}
          />
          <ExpenseCategoryBreakdown categories={categoryBreakdown} />
        </div>

        {/* Filters + Trend Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ExpenseFilters
            filters={filters}
            onFiltersChange={setFilters}
            categories={DEFAULT_EXPENSE_CATEGORIES.map((c) => c.name)}
          />
          <ExpenseTrendChart data={trendData} />
        </div>

        {/* Templates */}
        <ExpenseTemplatesPanel
          templates={templates}
          onUseTemplate={handleUseTemplate}
          onDeleteTemplate={handleDeleteTemplate}
        />

        {/* Recurring Banner */}
        {needsRecurringGeneration && (
          <ExpenseRecurringBanner
            templateCount={recurringTemplates.length}
            monthYear={monthYear}
            onGenerate={() => generateRecurring.mutateAsync(selectedMonth)}
            isGenerating={generateRecurring.isPending}
          />
        )}

        {/* Expense Table */}
        <ExpenseTable
          expenses={filteredExpenses}
          isLoading={isLoading}
          hasFiltersApplied={hasFiltersApplied}
          monthYear={monthYear}
          onAddExpense={() => {
            setSelectedExpense(null);
            setIsAddDialogOpen(true);
          }}
          onEditExpense={(expense) => {
            setSelectedExpense(expense);
            setIsEditDialogOpen(true);
          }}
          onDeleteExpense={(expense) => {
            setSelectedExpense(expense);
            setIsDeleteDialogOpen(true);
          }}
          onClearFilters={() =>
            setFilters({
              expenseType: "all",
              category: "all",
              searchTerm: "",
              deductibleOnly: false,
              recurringOnly: false,
            })
          }
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
    </PageLayout>
  );
}
