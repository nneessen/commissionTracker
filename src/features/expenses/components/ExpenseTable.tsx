// src/features/expenses/components/ExpenseTable.tsx

import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Expense } from '@/types/expense.types';

interface ExpenseTableProps {
  expenses: Expense[];
  isLoading: boolean;
  hasFiltersApplied: boolean;
  monthYear: string;
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
  onClearFilters: () => void;
}

export function ExpenseTable({
  expenses,
  isLoading,
  hasFiltersApplied,
  monthYear,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onClearFilters,
}: ExpenseTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          All Expenses
        </div>
        <Button size="sm" onClick={onAddExpense}>
          + Add Expense
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <EmptyState title="Loading expenses..." />
        ) : expenses.length === 0 ? (
          <EmptyState
            title={
              hasFiltersApplied
                ? "No expenses match your filters"
                : "No expenses for this month"
            }
            description={
              hasFiltersApplied
                ? "Try adjusting your filters or clearing them to see more results"
                : `Add your first expense for ${monthYear}`
            }
            action={
              hasFiltersApplied ? (
                <Button variant="outline" size="sm" onClick={onClearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button size="sm" onClick={onAddExpense}>
                  Add First Expense
                </Button>
              )
            }
          />
        ) : (
          <div className="rounded-md border">
            <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell className="font-medium">{formatDate(expense.date)}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{expense.name}</div>
                  {expense.description && (
                    <div className="text-sm text-muted-foreground">{expense.description}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>{expense.category}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    expense.expense_type === 'business'
                      ? 'border-green-500 text-green-700'
                      : 'border-blue-500 text-blue-700'
                  }
                >
                  {expense.expense_type === 'business' ? 'Business' : 'Personal'}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(expense.amount)}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {expense.is_tax_deductible && (
                    <Badge variant="secondary" className="text-purple-700">
                      Tax Deductible
                    </Badge>
                  )}
                  {expense.is_recurring && (
                    <Badge variant="secondary" className="text-orange-700">
                      Recurring
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditExpense(expense)}
                    aria-label="Edit expense"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteExpense(expense)}
                    aria-label="Delete expense"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}