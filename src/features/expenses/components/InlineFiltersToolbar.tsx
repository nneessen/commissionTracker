// src/features/expenses/components/InlineFiltersToolbar.tsx

import React from 'react';
import { Search, X } from 'lucide-react';
import type { AdvancedExpenseFilters } from '../../../types/expense.types';

export interface InlineFiltersToolbarProps {
  filters: AdvancedExpenseFilters;
  onFiltersChange: (filters: AdvancedExpenseFilters) => void;
  categories: { name: string; description: string; type: string }[];
  resultCount: number;
}

/**
 * InlineFiltersToolbar - Compact horizontal filter toolbar
 *
 * Replaces the large sidebar filter panel with an inline toolbar.
 * Shows Type buttons, Category dropdown, and Search input in a single row.
 */
export function InlineFiltersToolbar({
  filters,
  onFiltersChange,
  categories,
  resultCount,
}: InlineFiltersToolbarProps) {
  const handleFilterChange = (key: keyof AdvancedExpenseFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      expenseType: 'all',
      category: 'all',
      searchTerm: '',
      deductibleOnly: false,
      recurringOnly: false,
    });
  };

  const hasActiveFilters =
    filters.expenseType !== 'all' ||
    filters.category !== 'all' ||
    filters.searchTerm !== '' ||
    filters.deductibleOnly ||
    filters.recurringOnly;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '12px',
        }}
      >
        Filters
      </div>

      {/* Filters Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
      {/* Type Filter Buttons */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={() => handleFilterChange('expenseType', 'all')}
          style={{
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            cursor: 'pointer',
            background: filters.expenseType === 'all' ? '#3b82f6' : '#ffffff',
            color: filters.expenseType === 'all' ? '#ffffff' : '#64748b',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (filters.expenseType !== 'all') {
              e.currentTarget.style.background = '#f1f5f9';
            }
          }}
          onMouseLeave={(e) => {
            if (filters.expenseType !== 'all') {
              e.currentTarget.style.background = '#ffffff';
            }
          }}
        >
          All
        </button>

        <button
          onClick={() => handleFilterChange('expenseType', 'business')}
          style={{
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            cursor: 'pointer',
            background: filters.expenseType === 'business' ? '#10b981' : '#ffffff',
            color: filters.expenseType === 'business' ? '#ffffff' : '#64748b',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (filters.expenseType !== 'business') {
              e.currentTarget.style.background = '#f1f5f9';
            }
          }}
          onMouseLeave={(e) => {
            if (filters.expenseType !== 'business') {
              e.currentTarget.style.background = '#ffffff';
            }
          }}
        >
          🏢 Business
        </button>

        <button
          onClick={() => handleFilterChange('expenseType', 'personal')}
          style={{
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            cursor: 'pointer',
            background: filters.expenseType === 'personal' ? '#6366f1' : '#ffffff',
            color: filters.expenseType === 'personal' ? '#ffffff' : '#64748b',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (filters.expenseType !== 'personal') {
              e.currentTarget.style.background = '#f1f5f9';
            }
          }}
          onMouseLeave={(e) => {
            if (filters.expenseType !== 'personal') {
              e.currentTarget.style.background = '#ffffff';
            }
          }}
        >
          🏠 Personal
        </button>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />

      {/* Category Dropdown */}
      <div style={{ position: 'relative' }}>
        <select
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          style={{
            padding: '6px 32px 6px 12px',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            cursor: 'pointer',
            background: '#ffffff',
            color: '#64748b',
            appearance: 'none',
          }}
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.name} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
        <span
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: '#64748b',
            fontSize: '12px',
          }}
        >
          ▼
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />

      {/* Search Input */}
      <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '300px' }}>
        <Search
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '14px',
            height: '14px',
            color: '#94a3b8',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder="Search expenses..."
          value={filters.searchTerm}
          onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
          style={{
            width: '100%',
            padding: '6px 12px 6px 32px',
            fontSize: '13px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            background: '#ffffff',
            color: '#1a1a1a',
          }}
        />
      </div>

      {/* Quick Toggle Filters */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: '#64748b',
            cursor: 'pointer',
            padding: '6px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            background: filters.deductibleOnly ? '#fef3c7' : '#ffffff',
            borderColor: filters.deductibleOnly ? '#fbbf24' : '#e2e8f0',
            transition: 'all 0.2s',
          }}
        >
          <input
            type="checkbox"
            checked={filters.deductibleOnly}
            onChange={(e) => handleFilterChange('deductibleOnly', e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ fontWeight: 500 }}>Tax Deductible</span>
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: '#64748b',
            cursor: 'pointer',
            padding: '6px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            background: filters.recurringOnly ? '#dbeafe' : '#ffffff',
            borderColor: filters.recurringOnly ? '#3b82f6' : '#e2e8f0',
            transition: 'all 0.2s',
          }}
        >
          <input
            type="checkbox"
            checked={filters.recurringOnly}
            onChange={(e) => handleFilterChange('recurringOnly', e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ fontWeight: 500 }}>Recurring Only</span>
        </label>
      </div>

      {/* Result Count & Clear */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
        <span
          style={{
            fontSize: '13px',
            color: '#64748b',
            fontWeight: 500,
          }}
        >
          {resultCount} {resultCount === 1 ? 'result' : 'results'}
        </span>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 500,
              border: '1px solid #fecaca',
              borderRadius: '6px',
              cursor: 'pointer',
              background: '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fee2e2';
              e.currentTarget.style.borderColor = '#fca5a5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fef2f2';
              e.currentTarget.style.borderColor = '#fecaca';
            }}
          >
            <X style={{ width: '12px', height: '12px' }} />
            Clear
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
