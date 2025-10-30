// src/features/expenses/ExpenseDashboard.tsx - PROPERLY REDESIGNED
import { useState, useEffect } from "react";
import {
  Search,
  Filter,
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
  AlertCircle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useExpenses } from "../../hooks/expenses/useExpenses";
import { useCreateExpense } from "../../hooks/expenses/useCreateExpense";
import { useUpdateExpense } from "../../hooks/expenses/useUpdateExpense";
import { useDeleteExpense } from "../../hooks/expenses/useDeleteExpense";
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
import { isSameMonth } from "../../lib/date";
import { formatCurrency, formatDate } from "../../lib/format";
import showToast from "../../utils/toast";
import { DEFAULT_EXPENSE_CATEGORIES } from "../../types/expense.types";

// KEEP OLD DIALOGS
import { ExpenseDialog } from "./components/ExpenseDialog";
import { ExpenseDeleteDialog } from "./components/ExpenseDeleteDialog";

/**
 * ExpenseDashboard - PROPERLY REDESIGNED TO MATCH POLICIES PAGE
 *
 * Layout: Full-height container with tabs
 * - Expenses Tab: Full-height table with pagination (like policies)
 * - Analytics Tab: Charts and metrics (minimal scrolling)
 * - Budget Tab: Budget tracking
 * - Templates Tab: Template management
 */
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

  // Filter expenses for selected month
  let filteredExpenses = expenseAnalyticsService.applyAdvancedFilters(expenses, filters);
  filteredExpenses = filteredExpenses.filter((expense) =>
    isSameMonth(expense.date, selectedMonth)
  );

  // Handle search with debounce
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
  const totalPages = Math.ceil(sortedExpenses.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedExpenses = sortedExpenses.slice(startIndex, endIndex);

  // Calculate metrics
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const businessAmount = filteredExpenses
    .filter((e) => e.expense_type === "business")
    .reduce((sum, e) => sum + e.amount, 0);
  const personalAmount = filteredExpenses
    .filter((e) => e.expense_type === "personal")
    .reduce((sum, e) => sum + e.amount, 0);
  const deductibleAmount = filteredExpenses
    .filter((e) => e.is_tax_deductible)
    .reduce((sum, e) => sum + e.amount, 0);

  // Previous month for MoM
  const previousMonth = new Date(selectedMonth);
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  const previousMonthExpenses = expenses.filter((expense) =>
    isSameMonth(expense.date, previousMonth)
  );
  const previousTotal = previousMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const momGrowth = previousTotal > 0 ? ((totalAmount - previousTotal) / previousTotal) * 100 : 0;

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
    } catch (error) {
      showToast.error("Failed to save expense. Please try again.");
    }
  };

  const handleConfirmDelete = async (deleteOption: "single" | "future" | "all") => {
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
        showToast.success(`Deleted current expense and ${count} future occurrences!`);
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
      showToast.success(`✓ Added: ${template.template_name}`);
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

  const monthYear = selectedMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="h-[calc(100vh-1rem)] flex flex-col overflow-hidden">
      {/* Header with Title and Metrics Bar - MATCHING POLICIES */}
      <div className="bg-background border-b border-border/50">
        {/* Title and New Expense Button */}
        <div className="flex items-center justify-between px-6 py-3">
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <div className="flex items-center gap-2">
            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>
            <Button onClick={() => { setSelectedExpense(null); setIsAddDialogOpen(true); }} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              New Expense
            </Button>
          </div>
        </div>

        {/* Compact Metrics Bar - MATCHING POLICIES PATTERN */}
        <div className="px-6 pb-3">
          <div className="flex items-center justify-between gap-8 text-sm">
            {/* Month Navigation */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  const newDate = new Date(selectedMonth);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setSelectedMonth(newDate);
                }}
                variant="ghost"
                size="sm"
                className="h-7 px-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold min-w-[140px] text-center">{monthYear}</span>
              <Button
                onClick={() => {
                  const newDate = new Date(selectedMonth);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setSelectedMonth(newDate);
                }}
                variant="ghost"
                size="sm"
                className="h-7 px-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setSelectedMonth(new Date())}
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-xs"
              >
                Today
              </Button>
            </div>

            {/* Count metrics */}
            <div className="flex items-center gap-6">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold">{filteredExpenses.length}</span>
                <span className="text-xs text-muted-foreground">expenses</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-medium">{filteredExpenses.filter(e => e.expense_type === 'business').length}</span>
                <span className="text-muted-foreground">business</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="font-medium">{filteredExpenses.filter(e => e.expense_type === 'personal').length}</span>
                <span className="text-muted-foreground">personal</span>
              </div>
            </div>

            {/* Amount metrics */}
            <div className="flex items-center gap-4">
              <div>
                <span className="font-semibold">${(totalAmount / 1000).toFixed(1)}k</span>
                <span className="text-muted-foreground ml-1">total</span>
              </div>
              <div className="text-muted-foreground">•</div>
              <div>
                <span className="font-semibold text-blue-600">${(businessAmount / 1000).toFixed(1)}k</span>
                <span className="text-muted-foreground ml-1">business</span>
              </div>
              <div className="text-muted-foreground">•</div>
              <div>
                <span className="font-semibold text-purple-600">${(personalAmount / 1000).toFixed(1)}k</span>
                <span className="text-muted-foreground ml-1">personal</span>
              </div>
            </div>

            {/* Deductible */}
            <div>
              <span className="font-semibold text-green-600">${(deductibleAmount / 1000).toFixed(1)}k</span>
              <span className="text-muted-foreground ml-1">deductible</span>
            </div>

            {/* MoM Growth */}
            <div>
              <span className={cn(
                "font-medium",
                momGrowth > 0 ? "text-red-600" : "text-green-600"
              )}>
                {momGrowth > 0 ? '↑' : '↓'} {Math.abs(momGrowth).toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">MoM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar - MATCHING POLICIES */}
      <div className="bg-background border-b border-border/50">
        <div className="flex gap-3 p-2 px-4">
          <div className="flex-1 relative flex items-center">
            <Search size={16} className="absolute left-2.5 text-muted-foreground/60" />
            <Input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-9 text-sm"
            />
          </div>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? "default" : "outline"}
            size="sm"
            className="h-8"
          >
            <Filter size={14} className="mr-1" />
            Filters {filterCount > 0 && `(${filterCount})`}
          </Button>
          {filterCount > 0 && (
            <Button
              onClick={clearFilters}
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="flex gap-3 p-2 px-4 bg-muted/50">
            <Select
              value={filters.expenseType || "all"}
              onValueChange={(value) =>
                setFilters(prev => ({
                  ...prev,
                  expenseType: value as 'all' | 'business' | 'personal'
                }))
              }
            >
              <SelectTrigger className="h-8 w-[140px]">
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
                setFilters(prev => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger className="h-8 w-[160px]">
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
      </div>

      {/* Tabs - MINIMAL VERTICAL SCROLLING */}
      <Tabs defaultValue="expenses" className="flex-1 flex flex-col">
        <TabsList className="px-6 bg-background border-b border-border/50 rounded-none w-full justify-start">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* EXPENSES TAB - FULL HEIGHT TABLE */}
        <TabsContent value="expenses" className="flex-1 flex flex-col m-0 min-h-0">
          {/* Table Container - Scrollable */}
          <div className="flex-1 overflow-auto min-h-0">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 border-b border-border/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead
                    className="h-10 px-3 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => toggleSort('date')}
                  >
                    <div className="flex items-center gap-1">
                      Date
                      {sortField === 'date' && (
                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="h-10 px-3 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      {sortField === 'name' && (
                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="h-10 px-3">Description</TableHead>
                  <TableHead
                    className="h-10 px-3 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => toggleSort('category')}
                  >
                    <div className="flex items-center gap-1">
                      Category
                      {sortField === 'category' && (
                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="h-10 px-3 text-center">Type</TableHead>
                  <TableHead
                    className="h-10 px-3 text-right cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => toggleSort('amount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Amount
                      {sortField === 'amount' && (
                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="h-10 px-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="text-sm text-muted-foreground">Loading expenses...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground/50" />
                        <span className="text-sm text-muted-foreground">
                          {filterCount > 0 ? 'No expenses match your filters' : 'No expenses found'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="py-2.5 px-3 text-[12px] text-muted-foreground">
                        {formatDate(expense.date)}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-foreground font-medium">
                        {expense.name}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-sm text-muted-foreground max-w-xs truncate">
                        {expense.description || '—'}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-sm">
                        {expense.category}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-center">
                        <span
                          className={cn(
                            "inline-block py-0.5 px-2 rounded-xl text-[11px] font-medium capitalize",
                            expense.expense_type === "business" && "bg-blue-500/20 text-blue-600",
                            expense.expense_type === "personal" && "bg-purple-500/20 text-purple-600"
                          )}
                        >
                          {expense.expense_type}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-right tabular-nums font-semibold">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="py-2.5 px-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => {
                              setSelectedExpense(expense);
                              setIsEditDialogOpen(true);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Expense
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedExpense(expense);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Expense
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls - MATCHING POLICIES */}
          <div className="flex items-center justify-between px-4 py-3 bg-background border-t border-border/50">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{startIndex + 1}</span> to{' '}
                <span className="font-medium text-foreground">
                  {Math.min(endIndex, sortedExpenses.length)}
                </span> of{' '}
                <span className="font-medium text-foreground">{sortedExpenses.length}</span> expenses
              </div>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-sm font-medium px-3">
                Page {currentPage} of {totalPages}
              </div>

              <Button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates" className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-4 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{template.template_name}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {template.description}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleUseTemplate(template)}>
                        Use Template
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteTemplate(template)}
                        className="text-destructive"
                      >
                        Delete Template
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <Badge variant="outline">{template.category}</Badge>
                  <span className="font-mono font-semibold">
                    {formatCurrency(template.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="flex-1 p-6">
          <div className="text-center text-muted-foreground py-20">
            Analytics coming soon
          </div>
        </TabsContent>
      </Tabs>

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
