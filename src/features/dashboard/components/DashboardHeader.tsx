// src/features/dashboard/components/DashboardHeader.tsx

import React from 'react';
import { DashboardHeaderProps } from '../../../types/dashboard.types';
import { FONT_SIZES } from '../../../constants/dashboard';

/**
 * Dashboard Header Component
 *
 * Displays the page title, last updated time, and month progress.
 * Extracted from DashboardHome.tsx (lines 262-354).
 */
export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ monthProgress }) => {
  const { now, daysPassed, daysInMonth, monthProgress: progressPercent } = monthProgress;

  return (
    <div
      style={{
        marginBottom: '16px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Title Section */}
        <div>
          <h1
            style={{
              fontSize: FONT_SIZES.TITLE,
              fontWeight: 700,
              color: '#1a1a1a',
              margin: '0 0 4px 0',
            }}
          >
            Commission Tracker
          </h1>
          <div
            style={{
              fontSize: FONT_SIZES.METADATA,
              color: '#656d76',
              display: 'flex',
              gap: '16px',
            }}
          >
            <span>
              Last Updated:{' '}
              {now.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span>
              Month Progress: {progressPercent.toFixed(0)}% ({daysPassed}/{daysInMonth} days)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
