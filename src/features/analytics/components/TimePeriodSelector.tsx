// src/components/custom_ui/TimePeriodSelector.tsx

import React from 'react';
import { format } from 'date-fns';

export type AdvancedTimePeriod =
  | 'MTD'  // Month to Date
  | 'YTD'  // Year to Date
  | 'L30'  // Last 30 days
  | 'L60'  // Last 60 days
  | 'L90'  // Last 90 days
  | 'L12M' // Last 12 months
  | 'CUSTOM'; // Custom range

export interface AdvancedDateRange {
  startDate: Date;
  endDate: Date;
  period: AdvancedTimePeriod;
}

interface TimePeriodSelectorProps {
  selectedPeriod: AdvancedTimePeriod;
  onPeriodChange: (period: AdvancedTimePeriod) => void;
  customRange?: { startDate: Date; endDate: Date };
  onCustomRangeChange?: (range: { startDate: Date; endDate: Date }) => void;
}

/**
 * Get date range for advanced time period
 */
export function getAdvancedDateRange(period: AdvancedTimePeriod, customRange?: { startDate: Date; endDate: Date }): AdvancedDateRange {
  const now = new Date();
  const endDate = new Date();
  let startDate: Date;

  switch (period) {
    case 'MTD':
      // Month to date
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;

    case 'YTD':
      // Year to date
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;

    case 'L30':
      // Last 30 days
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      break;

    case 'L60':
      // Last 60 days
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 60);
      break;

    case 'L90':
      // Last 90 days
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 90);
      break;

    case 'L12M':
      // Last 12 months
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;

    case 'CUSTOM':
      // Custom range
      if (customRange) {
        return { startDate: customRange.startDate, endDate: customRange.endDate, period };
      }
      // Default to MTD if no custom range provided
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;

    default:
      // Default to MTD
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  return { startDate, endDate, period };
}

/**
 * Format date range for display
 */
export function formatAdvancedDateRange(range: AdvancedDateRange): string {
  const start = format(range.startDate, 'MMM d, yyyy');
  const end = format(range.endDate, 'MMM d, yyyy');

  // If same day, just show one date
  if (start === end) {
    return start;
  }

  // If same year, optimize display
  if (range.startDate.getFullYear() === range.endDate.getFullYear()) {
    const startNoYear = format(range.startDate, 'MMM d');
    return `${startNoYear} - ${end}`;
  }

  return `${start} - ${end}`;
}

/**
 * Time Period Selector Component
 */
export function TimePeriodSelector({
  selectedPeriod,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
}: TimePeriodSelectorProps) {
  const [showCustomPicker, setShowCustomPicker] = React.useState(false);

  const periods: { value: AdvancedTimePeriod; label: string }[] = [
    { value: 'MTD', label: 'Month to Date' },
    { value: 'YTD', label: 'Year to Date' },
    { value: 'L30', label: 'Last 30 Days' },
    { value: 'L60', label: 'Last 60 Days' },
    { value: 'L90', label: 'Last 90 Days' },
    { value: 'L12M', label: 'Last 12 Months' },
    { value: 'CUSTOM', label: 'Custom Range' },
  ];

  const currentRange = getAdvancedDateRange(selectedPeriod, customRange);
  const displayRange = formatAdvancedDateRange(currentRange);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '8px',
        alignItems: 'center'
      }}>
        {periods.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => {
              onPeriodChange(value);
              if (value === 'CUSTOM') {
                setShowCustomPicker(true);
              } else {
                setShowCustomPicker(false);
              }
            }}
            style={{
              padding: '6px 12px',
              background: selectedPeriod === value ? '#3b82f6' : '#ffffff',
              color: selectedPeriod === value ? '#ffffff' : '#656d76',
              border: selectedPeriod === value ? 'none' : '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Display current range */}
      <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#656d76',
        fontWeight: 500
      }}>
        {displayRange}
      </div>

      {/* Custom date picker */}
      {showCustomPicker && selectedPeriod === 'CUSTOM' && onCustomRangeChange && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                color: '#1a1a1a',
                marginBottom: '4px'
              }}>
                Start Date
              </label>
              <input
                type="date"
                value={customRange ? format(customRange.startDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => {
                  // Parse date string to create local date at start of day
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  const newStart = new Date(year, month - 1, day, 0, 0, 0, 0);
                  onCustomRangeChange({
                    startDate: newStart,
                    endDate: customRange?.endDate || new Date()
                  });
                }}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '11px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                color: '#1a1a1a',
                marginBottom: '4px'
              }}>
                End Date
              </label>
              <input
                type="date"
                value={customRange ? format(customRange.endDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => {
                  // Parse date string to create local date at end of day
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  const newEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
                  onCustomRangeChange({
                    startDate: customRange?.startDate || new Date(),
                    endDate: newEnd
                  });
                }}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '11px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
