// src/features/expenses/components/ExpenseFilters.tsx

import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useExpenseCategories } from '@/hooks/expenses/useExpenseCategories';
import type { ExpenseFilters as ExpenseFiltersType, ExpenseType } from '@/types/expense.types';

interface ExpenseFiltersProps {
  filters: ExpenseFiltersType;
  onFiltersChange: (filters: ExpenseFiltersType) => void;
}

export function ExpenseFilters({ filters, onFiltersChange }: ExpenseFiltersProps) {
  const { data: categories = [] } = useExpenseCategories();
  const handleSearchChange = (value: string | number) => {
    onFiltersChange({ ...filters, searchTerm: String(value) });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as ExpenseType | 'all';
    onFiltersChange({ ...filters, expenseType: value });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFiltersChange({ ...filters, category: value });
  };

  const handleDeductibleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, deductibleOnly: e.target.checked });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, startDate: e.target.value || undefined });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, endDate: e.target.value || undefined });
  };

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-wrap gap-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search expenses..."
            value={filters.searchTerm || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Expense Type Filter */}
        <select
          value={filters.expenseType || 'all'}
          onChange={handleTypeChange}
          className="h-10 px-3 border rounded-md min-w-[150px] bg-background"
        >
          <option value="all">All Types</option>
          <option value="personal">Personal</option>
          <option value="business">Business</option>
        </select>

        {/* Category Filter */}
        <select
          value={filters.category || 'all'}
          onChange={handleCategoryChange}
          className="h-10 px-3 border rounded-md min-w-[150px] bg-background"
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>

        {/* Deductible Only Checkbox */}
        <label className="flex items-center gap-2 px-3 h-10 border rounded-md bg-background cursor-pointer hover:bg-accent/50 transition-colors">
          <input
            type="checkbox"
            checked={filters.deductibleOnly || false}
            onChange={handleDeductibleChange}
            className="h-4 w-4 cursor-pointer"
          />
          <span className="text-sm">Deductible Only</span>
        </label>
      </div>

      {/* Date Range Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="start-date" className="text-sm font-medium">
            From:
          </label>
          <input
            id="start-date"
            type="date"
            value={filters.startDate || ''}
            onChange={handleStartDateChange}
            className="h-10 px-3 border rounded-md bg-background"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="end-date" className="text-sm font-medium">
            To:
          </label>
          <input
            id="end-date"
            type="date"
            value={filters.endDate || ''}
            onChange={handleEndDateChange}
            className="h-10 px-3 border rounded-md bg-background"
          />
        </div>

        {/* Clear Filters Button */}
        {(filters.searchTerm ||
          filters.expenseType !== 'all' ||
          filters.category !== 'all' ||
          filters.deductibleOnly ||
          filters.startDate ||
          filters.endDate) && (
          <button
            onClick={() =>
              onFiltersChange({
                expenseType: 'all',
                category: 'all',
                searchTerm: '',
                deductibleOnly: false,
                startDate: undefined,
                endDate: undefined,
              })
            }
            className="h-10 px-4 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
