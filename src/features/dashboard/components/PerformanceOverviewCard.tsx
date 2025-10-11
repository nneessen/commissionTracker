// src/features/dashboard/components/PerformanceOverviewCard.tsx

import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { PerformanceOverviewCardProps } from '../../../types/dashboard.types';
import { formatCurrency, formatPercent } from '../../../utils/formatting';
import { getPerformanceStatus, calculateTargetPercentage } from '../../../utils/dashboardCalculations';
import { getPeriodLabel } from '../../../utils/dateRange';
import {
  BORDER_RADIUS,
  SHADOWS,
  FONT_SIZES,
  TYPOGRAPHY,
  STATUS_COLORS,
  ALERT_COLORS,
} from '../../../constants/dashboard';

/**
 * Performance Overview Card Component
 *
 * Center card displaying performance metrics table and breakeven status.
 * Extracted from DashboardHome.tsx (lines 634-929).
 */
export const PerformanceOverviewCard: React.FC<PerformanceOverviewCardProps> = ({
  metrics,
  isBreakeven,
  timePeriod,
  surplusDeficit,
  breakevenDisplay,
  policiesNeeded,
  periodSuffix,
}) => {
  const periodLabel = getPeriodLabel(timePeriod);

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: BORDER_RADIUS.LARGE,
        padding: '16px',
        boxShadow: SHADOWS.CARD,
      }}
    >
      <div
        style={{
          fontSize: FONT_SIZES.SECTION_HEADER,
          fontWeight: 600,
          marginBottom: '12px',
          color: '#1a1a1a',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Performance Overview
      </div>

      {/* Status Banner */}
      <div
        style={{
          padding: '12px',
          borderRadius: BORDER_RADIUS.MEDIUM,
          background: isBreakeven
            ? ALERT_COLORS.SUCCESS.background
            : ALERT_COLORS.WARNING_GRADIENT.background,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {isBreakeven ? (
          <CheckCircle size={20} color={ALERT_COLORS.SUCCESS.textPrimary} />
        ) : (
          <AlertCircle size={20} color={ALERT_COLORS.WARNING_GRADIENT.textPrimary} />
        )}
        <div>
          <div
            style={{
              fontSize: FONT_SIZES.SUBSECTION_HEADER,
              fontWeight: 600,
              color: isBreakeven
                ? ALERT_COLORS.SUCCESS.textPrimary
                : ALERT_COLORS.WARNING_GRADIENT.textPrimary,
            }}
          >
            {isBreakeven
              ? `✓ Above Breakeven (${periodLabel})`
              : `⚠ Below Breakeven (${periodLabel})`}
          </div>
          <div
            style={{
              fontSize: FONT_SIZES.STAT_LABEL,
              color: isBreakeven
                ? ALERT_COLORS.SUCCESS.textSecondary
                : ALERT_COLORS.WARNING_GRADIENT.textSecondary,
            }}
          >
            {isBreakeven
              ? `${periodLabel} surplus of ${formatCurrency(Math.abs(surplusDeficit))}`
              : `Need ${formatCurrency(breakevenDisplay)}${periodSuffix.toLowerCase()} (${Math.ceil(policiesNeeded)} policies)`}
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <table
        style={{
          width: '100%',
          fontSize: FONT_SIZES.TABLE_CELL,
          borderCollapse: 'collapse',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
            <th
              style={{
                textAlign: 'left',
                padding: '8px 4px',
                fontWeight: 600,
                color: '#4a5568',
                textTransform: 'uppercase',
                fontSize: FONT_SIZES.TABLE_HEADER,
                letterSpacing: '0.5px',
              }}
            >
              Metric
            </th>
            <th
              style={{
                textAlign: 'right',
                padding: '8px 4px',
                fontWeight: 600,
                color: '#4a5568',
                textTransform: 'uppercase',
                fontSize: FONT_SIZES.TABLE_HEADER,
                letterSpacing: '0.5px',
              }}
            >
              Current
            </th>
            <th
              style={{
                textAlign: 'right',
                padding: '8px 4px',
                fontWeight: 600,
                color: '#4a5568',
                textTransform: 'uppercase',
                fontSize: FONT_SIZES.TABLE_HEADER,
                letterSpacing: '0.5px',
              }}
            >
              Target
            </th>
            <th
              style={{
                textAlign: 'right',
                padding: '8px 4px',
                fontWeight: 600,
                color: '#4a5568',
                textTransform: 'uppercase',
                fontSize: FONT_SIZES.TABLE_HEADER,
                letterSpacing: '0.5px',
              }}
            >
              %
            </th>
            <th
              style={{
                textAlign: 'center',
                padding: '8px 4px',
                fontWeight: 600,
                color: '#4a5568',
                textTransform: 'uppercase',
                fontSize: FONT_SIZES.TABLE_HEADER,
                letterSpacing: '0.5px',
              }}
            >
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((row, index) => {
            const pct = calculateTargetPercentage(row.current, row.target);
            const status = getPerformanceStatus(row.current, row.target, row.showTarget);
            const statusColor = STATUS_COLORS[status.toUpperCase() as keyof typeof STATUS_COLORS];

            return (
              <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td
                  style={{
                    padding: '8px 4px',
                    color: '#1a1a1a',
                    fontWeight: TYPOGRAPHY.DEFAULT_FONT_WEIGHT,
                  }}
                >
                  {row.metric}
                </td>
                <td
                  style={{
                    padding: '8px 4px',
                    textAlign: 'right',
                    fontFamily: TYPOGRAPHY.MONO_FONT,
                    fontWeight: TYPOGRAPHY.BOLD_FONT_WEIGHT,
                  }}
                >
                  {row.unit === '$'
                    ? formatCurrency(row.current)
                    : row.unit === '%'
                      ? formatPercent(row.current)
                      : row.current.toFixed(1)}
                </td>
                <td
                  style={{
                    padding: '8px 4px',
                    textAlign: 'right',
                    color: '#656d76',
                    fontFamily: TYPOGRAPHY.MONO_FONT,
                  }}
                >
                  {row.showTarget && row.target
                    ? row.unit === '$'
                      ? formatCurrency(row.target)
                      : row.unit === '%'
                        ? formatPercent(row.target)
                        : row.target
                    : '—'}
                </td>
                <td
                  style={{
                    padding: '8px 4px',
                    textAlign: 'right',
                    fontWeight: TYPOGRAPHY.BOLD_FONT_WEIGHT,
                    color: statusColor,
                  }}
                >
                  {row.showTarget ? `${pct.toFixed(0)}%` : '—'}
                </td>
                <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                  {row.showTarget && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: statusColor,
                      }}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
