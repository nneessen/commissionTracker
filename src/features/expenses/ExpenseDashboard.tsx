// src/features/expenses/ExpenseDashboard.tsx - STYLED LIKE TARGETS PAGE
import { useState, useEffect } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit,
  Trash2,
  Plus,
  Download,
  MoreVertical,
  FileText,
  Search,
  Filter,
} from "lucide-react";
import { TimePeriodSelector, formatAdvancedDateRange, getAdvancedDateRange } from "@/features/analytics/components/TimePeriodSelector";
import { ExpenseDateProvider, useExpenseDateRange } from "./context/ExpenseDateContext";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { isWithinInterval } from "date-fns";
import { formatCurrency, formatDate } from "../../lib/format";
import showToast from "../../utils/toast";
import { DEFAULT_EXPENSE_CATEGORIES } from "../../types/expense.types";

import { ExpenseDialog } from "./components/ExpenseDialog";
import { ExpenseDeleteDialog } from "./components/ExpenseDeleteDialog";

/**
 * ExpenseDashboard - Styled to match Targets page
 */
function ExpenseDashboardInner() {
  const { timePeriod, setTimePeriod, customRange, setCustomRange, dateRange } = useExpenseDateRange();

  // State
  const [filters, setFilters] = useState<AdvancedExpenseFilters>({
    expenseType: "all",
    category: "all",
    searchTerm: "",
    deductibleOnly: false,
    recurringOnly: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'name' | 'category'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Data fetching
  const { data: expenses = [], isLoading = false } = useExpenses({ filters });
  const { data: templates = [] } = useExpenseTemplates();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const deleteTemplate = useDeleteExpenseTemplate();

  // Filter expenses for selected date range
  let filteredExpenses = expenseAnalyticsService.applyAdvancedFilters(expenses, filters);
  filteredExpenses = filteredExpenses.filter((expense) => {
    const expenseDate = new Date(expense.date);
    return isWithinInterval(expenseDate, { start: dateRange.startDate, end: dateRange.endDate });
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, searchTerm }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sort expenses
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'amount':
        comparison = a.amount - b.amount;
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'category':
        comparison = a.category.localeCompare(b.category);
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Pagination
  const totalPages = Math.ceil(sortedExpenses.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedExpenses = sortedExpenses.slice(startIndex, endIndex);

  // Metrics
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const businessAmount = filteredExpenses.filter((e) => e.expense_type === "business").reduce((sum, e) => sum + e.amount, 0);
  const personalAmount = filteredExpenses.filter((e) => e.expense_type === "personal").reduce((sum, e) => sum + e.amount, 0);
  const deductibleAmount = filteredExpenses.filter((e) => e.is_tax_deductible).reduce((sum, e) => sum + e.amount, 0);

  const filterCount =
    (filters.expenseType !== 'all' ? 1 : 0) +
    (filters.category !== 'all' ? 1 : 0) +
    (filters.searchTerm ? 1 : 0) +
    (filters.deductibleOnly ? 1 : 0) +
    (filters.recurringOnly ? 1 : 0);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const clearFilters = () => {
    setFilters({ expenseType: "all", category: "all", searchTerm: "", deductibleOnly: false, recurringOnly: false });
    setSearchTerm("");
  };

  // Event handlers
  const handleSaveExpense = async (data: CreateExpenseData) => {
    try {
      if (selectedExpense) {
        await updateExpense.mutateAsync({ id: selectedExpense.id, updates: data });
        showToast.success("Expense updated!");
        setIsEditDialogOpen(false);
      } else {
        await createExpense.mutateAsync(data);
        showToast.success("Expense created!");
        setIsAddDialogOpen(false);
      }
      setSelectedExpense(null);
    } catch {
      showToast.error("Failed to save expense");
    }
  };

  const handleConfirmDelete = async (deleteOption: "single" | "future" | "all") => {
    if (!selectedExpense) return;
    try {
      if (deleteOption === "single" || !selectedExpense.recurring_group_id) {
        await deleteExpense.mutateAsync(selectedExpense.id);
        showToast.success("Expense deleted!");
      } else if (deleteOption === "future") {
        const { recurringExpenseService } = await import("./../../services/expenses/recurringExpenseService");
        const count = await recurringExpenseService.deleteFutureExpenses(selectedExpense.recurring_group_id, selectedExpense.date);
        await deleteExpense.mutateAsync(selectedExpense.id);
        showToast.success(`Deleted ${count + 1} expenses!`);
      } else if (deleteOption === "all") {
        await supabase.from("expenses").delete().eq("recurring_group_id", selectedExpense.recurring_group_id);
        showToast.success("Deleted all recurring!");
      }
      setIsDeleteDialogOpen(false);
      setSelectedExpense(null);
    } catch {
      showToast.error("Failed to delete");
    }
  };

  const handleExportCSV = () => {
    try {
      const exportData = filteredExpenses.map(expense => ({
        Date: expense.date, Name: expense.name, Description: expense.description || '',
        Amount: expense.amount.toFixed(2), Category: expense.category, Type: expense.expense_type,
        'Tax Deductible': expense.is_tax_deductible ? 'Yes' : 'No',
      }));
      downloadCSV(exportData, 'expenses');
      showToast.success("Exported to CSV!");
    } catch {
      showToast.error("Export failed");
    }
  };

  const handleUseTemplate = async (template: ExpenseTemplate) => {
    const expenseData = expenseTemplateService.templateToExpenseData(template);
    const today = new Date().toISOString().split("T")[0];
    try {
      await createExpense.mutateAsync({ ...expenseData, date: today });
      showToast.success(`Added: ${template.template_name}`);
    } catch {
      showToast.error("Failed to create expense");
    }
  };

  const handleDeleteTemplate = async (template: ExpenseTemplate) => {
    if (confirm(`Delete template "${template.template_name}"?`)) {
      try {
        await deleteTemplate.mutateAsync(template.id);
        showToast.success("Template deleted!");
      } catch {
        showToast.error("Failed to delete");
      }
    }
  };

  const dateRangeDisplay = formatAdvancedDateRange(getAdvancedDateRange(timePeriod, customRange));

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      {/* Header - matching Targets page-header pattern */}
      <div className="page-header py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">Expenses</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">{dateRangeDisplay}</p>
          </div>
          <div className="flex items-center gap-3">
            <TimePeriodSelector
              selectedPeriod={timePeriod}
              onPeriodChange={setTimePeriod}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
            />
            <Button onClick={handleExportCSV} variant="ghost" size="sm" className="h-6 px-2 text-[10px]">
              <Download className="h-3 w-3 mr-1" />CSV
            </Button>
            <Button onClick={() => { setSelectedExpense(null); setIsAddDialogOpen(true); }} size="sm" className="h-6 px-2 text-[10px]">
              <Plus className="h-3 w-3 mr-1" />New
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 p-3 pt-0">
        {/* Metrics Card - matching Targets style */}
        <Card className="flex-shrink-0 mb-2">
          <CardContent className="p-3">
            <div className="text-[11px] font-medium text-muted-foreground uppercase mb-2">Expense Summary</div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Total Expenses</span>
                  <span className="font-mono font-bold">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Count</span>
                  <span className="font-mono">{filteredExpenses.length}</span>
                </div>
              </div>
              <div className="border-l pl-4 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Business</span>
                  <span className="font-mono font-semibold text-blue-600">{formatCurrency(businessAmount)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Count</span>
                  <span className="font-mono">{filteredExpenses.filter(e => e.expense_type === 'business').length}</span>
                </div>
              </div>
              <div className="border-l pl-4 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Personal</span>
                  <span className="font-mono font-semibold text-purple-600">{formatCurrency(personalAmount)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Count</span>
                  <span className="font-mono">{filteredExpenses.filter(e => e.expense_type === 'personal').length}</span>
                </div>
              </div>
              <div className="border-l pl-4 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Tax Deductible</span>
                  <span className="font-mono font-semibold text-green-600">{formatCurrency(deductibleAmount)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">% of Total</span>
                  <span className="font-mono">{totalAmount > 0 ? ((deductibleAmount / totalAmount) * 100).toFixed(0) : 0}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Container */}
        <Tabs defaultValue="expenses" className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between flex-shrink-0 mb-2">
            <TabsList className="h-7">
              <TabsTrigger value="expenses" className="text-[11px] h-6 px-3">Expenses</TabsTrigger>
              <TabsTrigger value="templates" className="text-[11px] h-6 px-3">Templates</TabsTrigger>
            </TabsList>

            {/* Search and Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-7 w-48 pl-7 text-[11px]"
                />
              </div>
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant={showFilters ? "default" : "outline"}
                size="sm"
                className="h-7 text-[11px] px-2"
              >
                <Filter size={12} className="mr-1" />
                {filterCount > 0 ? `(${filterCount})` : 'Filter'}
              </Button>
              {filterCount > 0 && (
                <Button onClick={clearFilters} variant="ghost" size="sm" className="h-7 text-[11px] px-2">Clear</Button>
              )}
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="flex gap-2 mb-2 flex-shrink-0">
              <Select value={filters.expenseType || "all"} onValueChange={(v) => setFilters(prev => ({ ...prev, expenseType: v as any }))}>
                <SelectTrigger className="h-7 w-32 text-[11px]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.category || "all"} onValueChange={(v) => setFilters(prev => ({ ...prev, category: v }))}>
                <SelectTrigger className="h-7 w-40 text-[11px]"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {DEFAULT_EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Expenses Tab Content */}
          <TabsContent value="expenses" className="flex-1 flex flex-col min-h-0 m-0 mt-0">
            {/* Table Card */}
            <Card className="flex-1 flex flex-col min-h-0">
              <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                {/* Table Header */}
                <div className="grid grid-cols-[100px_1fr_1.5fr_120px_80px_100px_50px] gap-2 px-3 py-2 bg-muted/30 border-b text-[11px] font-medium text-muted-foreground uppercase flex-shrink-0">
                  <div className="cursor-pointer flex items-center gap-1" onClick={() => toggleSort('date')}>
                    Date {sortField === 'date' && (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                  <div className="cursor-pointer flex items-center gap-1" onClick={() => toggleSort('name')}>
                    Name {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                  <div>Description</div>
                  <div className="cursor-pointer flex items-center gap-1" onClick={() => toggleSort('category')}>
                    Category {sortField === 'category' && (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                  <div className="text-center">Type</div>
                  <div className="cursor-pointer flex items-center justify-end gap-1" onClick={() => toggleSort('amount')}>
                    Amount {sortField === 'amount' && (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                  <div></div>
                </div>

                {/* Table Body - scrollable if needed */}
                <div className="flex-1 overflow-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-[11px] text-muted-foreground">Loading...</div>
                    </div>
                  ) : paginatedExpenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-6 w-6 text-muted-foreground/30 mb-2" />
                      <div className="text-[11px] text-muted-foreground">No expenses found</div>
                    </div>
                  ) : (
                    paginatedExpenses.map((expense, idx) => (
                      <div
                        key={expense.id}
                        className={cn(
                          "grid grid-cols-[100px_1fr_1.5fr_120px_80px_100px_50px] gap-2 px-3 py-1.5 text-[11px] border-b border-border/50 hover:bg-muted/20",
                          idx % 2 === 0 && "bg-muted/10"
                        )}
                      >
                        <div className="text-muted-foreground">{formatDate(expense.date)}</div>
                        <div className="font-medium truncate">{expense.name}</div>
                        <div className="text-muted-foreground truncate">{expense.description || '—'}</div>
                        <div>{expense.category}</div>
                        <div className="text-center">
                          <span className={cn(
                            "inline-block py-0.5 px-1.5 rounded text-[9px] font-medium uppercase",
                            expense.expense_type === "business" ? "bg-blue-500/20 text-blue-600" : "bg-purple-500/20 text-purple-600"
                          )}>
                            {expense.expense_type === "business" ? "BUS" : "PER"}
                          </span>
                        </div>
                        <div className="text-right font-mono font-semibold">{formatCurrency(expense.amount)}</div>
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                              <DropdownMenuItem onClick={() => { setSelectedExpense(expense); setIsEditDialogOpen(true); }} className="text-[11px]">
                                <Edit className="mr-2 h-3 w-3" />Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setSelectedExpense(expense); setIsDeleteDialogOpen(true); }} className="text-destructive text-[11px]">
                                <Trash2 className="mr-2 h-3 w-3" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination - Fixed at bottom */}
                <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/20 flex-shrink-0">
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>
                      {sortedExpenses.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, sortedExpenses.length)} of {sortedExpenses.length}
                    </span>
                    <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                      <SelectTrigger className="h-6 w-20 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <ChevronsLeft className="h-3 w-3" />
                    </Button>
                    <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="text-[11px] px-2">{currentPage}/{totalPages}</span>
                    <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                    <Button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <ChevronsRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab Content */}
          <TabsContent value="templates" className="flex-1 overflow-auto m-0">
            <div className="grid grid-cols-3 gap-2">
              {templates.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <FileText className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-[11px] text-muted-foreground">No templates</p>
                </div>
              ) : (
                templates.map((template) => (
                  <Card key={template.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-medium truncate">{template.template_name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{template.description}</div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 -mr-1">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleUseTemplate(template)} className="text-[11px]">Use</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteTemplate(template)} className="text-destructive text-[11px]">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{template.category}</span>
                        <span className="text-[11px] font-mono font-semibold">{formatCurrency(template.amount)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <ExpenseDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onSave={handleSaveExpense} isSubmitting={createExpense.isPending} />
      <ExpenseDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} expense={selectedExpense} onSave={handleSaveExpense} isSubmitting={updateExpense.isPending} />
      <ExpenseDeleteDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} expense={selectedExpense} onConfirm={handleConfirmDelete} isDeleting={deleteExpense.isPending} />
    </div>
  );
}

export function ExpenseDashboard() {
  return (
    <ExpenseDateProvider>
      <ExpenseDashboardInner />
    </ExpenseDateProvider>
  );
}
