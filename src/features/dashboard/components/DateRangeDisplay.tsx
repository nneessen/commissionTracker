// src/features/dashboard/components/DateRangeDisplay.tsx

import React from 'react';
import { TimePeriod, formatDateRange, type DateRange } from '../../../utils/dateRange';

interface DateRangeDisplayProps {
  timePeriod: TimePeriod;
  dateRange: DateRange;
}

/**
 * Displays the exact date range being viewed on the dashboard
 * Makes it clear what data is included in the current view
 */
export const DateRangeDisplay: React.FC<DateRangeDisplayProps> = ({
  timePeriod,
  dateRange,
}) => {
  const getPeriodDescription = (period: TimePeriod): string => {
    switch (period) {
      case 'daily':
        return 'Today';
      case 'weekly':
        return 'Last 7 Days';
      case 'monthly':
        return 'Month-to-Date';
      case 'yearly':
        return 'Year-to-Date';
      default:
        return 'Current Period';
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      backgroundColor: 'var(--bg-muted, #f5f5f5)',
      borderRadius: '6px',
      fontSize: '13px',
      color: 'var(--text-secondary, #666)',
      fontWeight: 500,
    }}>
      <span style={{ color: 'var(--text-primary, #333)' }}>
        {getPeriodDescription(timePeriod)}
      </span>
      <span style={{ color: 'var(--text-tertiary, #999)' }}>•</span>
      <span>{formatDateRange(dateRange)}</span>
    </div>
  );
};
