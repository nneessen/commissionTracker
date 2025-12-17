// src/features/expenses/ExpenseDashboardCompact.tsx - Redesigned with zinc palette

import { useState, useEffect } from "react";
import {
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  FileText,
  MoreVertical,
  Edit,
  Trash2,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExpenses } from "../../hooks/expenses/useExpenses";
import { useCreateExpense } from "../../hooks/expenses/useCreateExpense";
import { useUpdateExpense } from "../../hooks/expenses/useUpdateExpense";
import { useDeleteExpense } from "../../hooks/expenses/useDeleteExpense";
import {
  useExpenseTemplates,
  useDeleteExpenseTemplate,
} from "../../hooks/expenses/useExpenseTemplates";
import { expenseAnalyticsService } from "../../services/expenses/expenseAnalyticsService";
import { expenseTemplateService } from "../../services/expenses/expenseTemplateService";
import { supabase } from "../../services/base/supabase";
import { downloadCSV } from "../../utils/exportHelpers";
import type {
  Expense,
  AdvancedExpenseFilters,
  CreateExpenseData,
  ExpenseTemplate,
} from "../../types/expense.types";
import { isSameMonth } from "../../lib/date";
import { formatCurrency, formatPercent } from "../../lib/format";
import showToast from "../../utils/toast";
import { DEFAULT_EXPENSE_CATEGORIES } from "../../types/expense.types";
import { ExpenseDialogCompact } from "./components/ExpenseDialogCompact";
import { ExpenseDeleteDialog } from "./components/ExpenseDeleteDialog";
import { useMetricsWithDateRange } from "@/hooks/kpi/useMetricsWithDateRange";

export function ExpenseDashboardCompact() {
  // State
  const [filters, setFilters] = useState<AdvancedExpenseFilters>({
    expenseType: "all",
    category: "all",
    searchTerm: "",
    deductibleOnly: false,
    recurringOnly: false,
  });
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Data fetching
  const { data: expenses = [], isLoading = false } = useExpenses({ filters });
  const { data: _templates = [] } = useExpenseTemplates();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const deleteTemplate = useDeleteExpenseTemplate();

  // Get commission metrics for expense ratio calculation
  const metricsData = useMetricsWithDateRange({
    timePeriod: "monthly",
    periodOffset: 0,
  });

  // Filter expenses for selected month
  const filteredExpenses = expenseAnalyticsService.applyAdvancedFilters(
    expenses,
    filters,
  );
  const monthlyExpenses = filteredExpenses.filter((expense) =>
    isSameMonth(expense.date, selectedMonth),
  );

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, searchTerm }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Calculate all metrics
  const totalAmount = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const businessAmount = monthlyExpenses
    .filter((e) => e.expense_type === "business")
    .reduce((sum, e) => sum + e.amount, 0);
  const personalAmount = monthlyExpenses
    .filter((e) => e.expense_type === "personal")
    .reduce((sum, e) => sum + e.amount, 0);
  const deductibleAmount = monthlyExpenses
    .filter((e) => e.is_tax_deductible)
    .reduce((sum, e) => sum + e.amount, 0);
  const recurringAmount = monthlyExpenses
    .filter((e) => e.is_recurring)
    .reduce((sum, e) => sum + e.amount, 0);
  const oneTimeAmount = monthlyExpenses
    .filter((e) => !e.is_recurring)
    .reduce((sum, e) => sum + e.amount, 0);

  // Previous month for MoM
  const previousMonth = new Date(selectedMonth);
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  const previousMonthExpenses = expenses.filter((expense) =>
    isSameMonth(expense.date, previousMonth),
  );
  const previousTotal = previousMonthExpenses.reduce(
    (sum, e) => sum + e.amount,
    0,
  );
  const momGrowth =
    previousTotal > 0
      ? ((totalAmount - previousTotal) / previousTotal) * 100
      : 0;

  // YTD calculations
  const currentYear = selectedMonth.getFullYear();
  const ytdExpenses = expenses.filter(
    (e) => new Date(e.date).getFullYear() === currentYear,
  );
  const ytdTotal = ytdExpenses.reduce((sum, e) => sum + e.amount, 0);
  const avgMonthlyExpense = ytdTotal / (selectedMonth.getMonth() + 1);

  // Calculate expense ratio (expenses as % of gross commissions)
  const grossCommission = metricsData.periodCommissions?.earned || 0;
  const expenseRatio =
    grossCommission > 0 ? (totalAmount / grossCommission) * 100 : 0;

  // Category breakdown
  const categoryBreakdown = DEFAULT_EXPENSE_CATEGORIES.map((cat) => {
    const categoryExpenses = monthlyExpenses.filter(
      (e) => e.category === cat.name,
    );
    const amount = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
    const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
    return {
      name: cat.name,
      amount,
      percentage,
      count: categoryExpenses.length,
    };
  })
    .filter((cat) => cat.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6); // Top 6 categories

  const filterCount =
    (filters.expenseType !== "all" ? 1 : 0) +
    (filters.category !== "all" ? 1 : 0) +
    (filters.searchTerm ? 1 : 0) +
    (filters.deductibleOnly ? 1 : 0) +
    (filters.recurringOnly ? 1 : 0);

  const clearFilters = () => {
    setFilters({
      expenseType: "all",
      category: "all",
      searchTerm: "",
      deductibleOnly: false,
      recurringOnly: false,
    });
    setSearchTerm("");
  };

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
    } catch (_error) {
      showToast.error("Failed to save expense. Please try again.");
    }
  };

  const handleConfirmDelete = async (
    deleteOption: "single" | "future" | "all",
  ) => {
    if (!selectedExpense) return;
    try {
      if (deleteOption === "single" || !selectedExpense.recurring_group_id) {
        await deleteExpense.mutateAsync(selectedExpense.id);
        showToast.success("Expense deleted successfully!");
      } else if (deleteOption === "future") {
        const { recurringExpenseService } =
          await import("./../../services/expenses/recurringExpenseService");
        const count = await recurringExpenseService.deleteFutureExpenses(
          selectedExpense.recurring_group_id,
          selectedExpense.date,
        );
        await deleteExpense.mutateAsync(selectedExpense.id);
        showToast.success(
          `Deleted current expense and ${count} future occurrences!`,
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
    } catch (_error) {
      showToast.error("Failed to delete expense. Please try again.");
    }
  };

  const handleExportCSV = () => {
    try {
      const exportData = monthlyExpenses.map((expense) => ({
        Date: expense.date,
        Name: expense.name,
        Description: expense.description || "",
        Amount: expense.amount.toFixed(2),
        Category: expense.category,
        Type: expense.expense_type,
        "Tax Deductible": expense.is_tax_deductible ? "Yes" : "No",
        Recurring: expense.is_recurring ? "Yes" : "No",
        "Recurring Frequency": expense.recurring_frequency || "",
        Notes: expense.notes || "",
      }));

      downloadCSV(exportData, "expenses");
      showToast.success("Expenses exported to CSV!");
    } catch (_error) {
      showToast.error("Failed to export CSV. Please try again.");
    }
  };

  const _handleUseTemplate = async (template: ExpenseTemplate) => {
    const expenseData = expenseTemplateService.templateToExpenseData(template);
    const today = new Date().toISOString().split("T")[0];
    try {
      await createExpense.mutateAsync({ ...expenseData, date: today });
      showToast.success(`✓ Added: ${template.template_name}`);
    } catch (_error) {
      showToast.error("Failed to create expense. Please try again.");
    }
  };

  const _handleDeleteTemplate = async (template: ExpenseTemplate) => {
    if (confirm(`Delete template "${template.template_name}"?`)) {
      try {
        await deleteTemplate.mutateAsync(template.id);
        showToast.success("Template deleted successfully!");
      } catch (_error) {
        showToast.error("Failed to delete template. Please try again.");
      }
    }
  };

  return (
    <>
      <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
        {/* Compact Header */}
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  const newDate = new Date(selectedMonth);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setSelectedMonth(newDate);
                }}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 min-w-[100px] text-center">
                {selectedMonth.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <Button
                onClick={() => {
                  const newDate = new Date(selectedMonth);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setSelectedMonth(newDate);
                }}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => setSelectedMonth(new Date())}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
              >
                Today
              </Button>
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {monthlyExpenses.length} expenses
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              onClick={handleExportCSV}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
            >
              <Download className="h-3 w-3 mr-1" />
              CSV
            </Button>
            <Button
              onClick={() => {
                setSelectedExpense(null);
                setIsAddDialogOpen(true);
              }}
              size="sm"
              className="h-6 px-2 text-[10px]"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto space-y-2">
          {/* Expense Summary Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
            <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Expense Summary
            </div>
            <div className="grid grid-cols-4 gap-4">
              {/* Total Expenses */}
              <div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Monthly Total
                    </span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      YTD Total
                    </span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(ytdTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Avg Monthly
                    </span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(avgMonthlyExpense)}
                    </span>
                  </div>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      MoM Change
                    </span>
                    <span
                      className={cn(
                        "font-mono font-semibold",
                        momGrowth > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      {momGrowth > 0 ? "↑" : "↓"}{" "}
                      {Math.abs(momGrowth).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Business vs Personal */}
              <div className="border-l border-zinc-200 dark:border-zinc-700 pl-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Business
                    </span>
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(businessAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Personal
                    </span>
                    <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">
                      {formatCurrency(personalAmount)}
                    </span>
                  </div>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Business %
                    </span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {totalAmount > 0
                        ? formatPercent((businessAmount / totalAmount) * 100)
                        : "0%"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tax Deductible & Recurring */}
              <div className="border-l border-zinc-200 dark:border-zinc-700 pl-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Tax Deductible
                    </span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(deductibleAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Deductible %
                    </span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      {totalAmount > 0
                        ? formatPercent((deductibleAmount / totalAmount) * 100)
                        : "0%"}
                    </span>
                  </div>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Recurring
                    </span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(recurringAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      One-Time
                    </span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(oneTimeAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expense Ratio */}
              <div className="border-l border-zinc-200 dark:border-zinc-700 pl-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Gross Commission
                    </span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(grossCommission)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Total Expenses
                    </span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400 font-semibold">
                      Expense Ratio
                    </span>
                    <span
                      className={cn(
                        "font-mono font-bold",
                        expenseRatio > 30
                          ? "text-red-600 dark:text-red-400"
                          : expenseRatio > 20
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      {formatPercent(expenseRatio)}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {expenseRatio > 30
                      ? "⚠️ High ratio"
                      : expenseRatio > 20
                        ? "⚡ Watch ratio"
                        : "✓ Healthy ratio"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Categories & Recent Expenses */}
          <div className="grid grid-cols-2 gap-2">
            {/* Top Categories */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
              <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Top Categories
              </div>
              <div className="space-y-1">
                {categoryBreakdown.length === 0 ? (
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    No expenses this month
                  </div>
                ) : (
                  categoryBreakdown.map((cat) => (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {cat.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          ({cat.count})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(cat.amount)}
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {formatPercent(cat.percentage)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Large Expenses */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
              <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Recent Large Expenses
              </div>
              <div className="space-y-1">
                {monthlyExpenses
                  .sort((a, b) => b.amount - a.amount)
                  .slice(0, 6)
                  .map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 dark:text-zinc-400 truncate max-w-[150px]">
                          {expense.name}
                        </span>
                        <span
                          className={cn(
                            "text-[9px]",
                            expense.expense_type === "business"
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-purple-600 dark:text-purple-400",
                          )}
                        >
                          {expense.expense_type[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(expense.amount)}
                      </span>
                    </div>
                  ))}
                {monthlyExpenses.length === 0 && (
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    No expenses this month
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-2">
            <div className="flex-1 relative flex items-center">
              <Search
                size={14}
                className="absolute left-2 text-zinc-400 dark:text-zinc-500"
              />
              <Input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-7 pl-7 text-xs"
              />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
            >
              <Filter size={12} className="mr-1" />
              Filters {filterCount > 0 && `(${filterCount})`}
            </Button>
            {filterCount > 0 && (
              <Button
                onClick={clearFilters}
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Collapsible Filter Panel */}
          {showFilters && (
            <div className="flex gap-2">
              <Select
                value={filters.expenseType || "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    expenseType: value as "all" | "business" | "personal",
                  }))
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.category || "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {DEFAULT_EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.name} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Expenses Table - Compact */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="text-left p-2 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                      Date
                    </th>
                    <th className="text-left p-2 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                      Name
                    </th>
                    <th className="text-left p-2 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                      Category
                    </th>
                    <th className="text-center p-2 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                      Type
                    </th>
                    <th className="text-right p-2 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                      Amount
                    </th>
                    <th className="text-center p-2 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8">
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Loading expenses...
                        </div>
                      </td>
                    </tr>
                  ) : monthlyExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center gap-1">
                          <FileText className="h-6 w-6 text-zinc-300 dark:text-zinc-600" />
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {filterCount > 0
                              ? "No expenses match your filters"
                              : "No expenses found"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    monthlyExpenses
                      .sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime(),
                      )
                      .map((expense) => (
                        <tr
                          key={expense.id}
                          className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        >
                          <td className="p-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                            {new Date(expense.date).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )}
                          </td>
                          <td className="p-2 text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                            {expense.name}
                            {expense.is_recurring && (
                              <span className="ml-1 text-[9px] text-zinc-400 dark:text-zinc-500">
                                🔁
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                            {expense.category}
                          </td>
                          <td className="p-2 text-center">
                            <span
                              className={cn(
                                "inline-block px-1.5 py-0.5 rounded text-[9px] font-medium",
                                expense.expense_type === "business"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                              )}
                            >
                              {expense.expense_type}
                            </span>
                          </td>
                          <td className="p-2 text-right text-[11px] font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(expense.amount)}
                          </td>
                          <td className="p-2 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedExpense(expense);
                                    setIsEditDialogOpen(true);
                                  }}
                                  className="text-xs"
                                >
                                  <Edit className="mr-1.5 h-3 w-3" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedExpense(expense);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="text-red-600 dark:text-red-400 text-xs"
                                >
                                  <Trash2 className="mr-1.5 h-3 w-3" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expense Insights */}
          {expenseRatio > 30 && (
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
              <DollarSign className="h-3 w-3 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-[11px]">
                <strong className="text-amber-700 dark:text-amber-300">
                  High expense ratio detected ({formatPercent(expenseRatio)})
                </strong>
                <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                  Your expenses are {formatPercent(expenseRatio)} of gross
                  commissions. Consider reducing non-essential expenses to
                  improve profitability. Target ratio should be below 30%.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ExpenseDialogCompact
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleSaveExpense}
        isSubmitting={createExpense.isPending}
      />
      <ExpenseDialogCompact
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
    </>
  );
}
