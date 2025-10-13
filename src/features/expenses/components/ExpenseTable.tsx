// src/features/expenses/components/ExpenseTable.tsx

import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Expense } from '@/types/expense.types';

interface ExpenseTableProps {
  expenses: Expense[];
  isLoading: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpenseTable({ expenses, isLoading, onEdit, onDelete }: ExpenseTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">Loading expenses...</div>
      </div>
    );
  }

  if (!expenses || expenses.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">
          No expenses found. Add your first expense to get started!
        </div>
      </div>
    );
  }

  return (
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
                    onClick={() => onEdit(expense)}
                    aria-label="Edit expense"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(expense)}
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
  );
}