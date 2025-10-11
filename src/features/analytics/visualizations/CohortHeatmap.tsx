// src/features/analytics/visualizations/CohortHeatmap.tsx

import React from 'react';
import { CohortRetentionData } from '../../../services/analytics/cohortService';

interface CohortHeatmapProps {
  data: CohortRetentionData[];
  maxMonths?: number;
}

/**
 * CohortHeatmap - Retention heatmap by cohort month
 *
 * Displays a color-coded table showing retention percentages
 * for each cohort over time (0-24 months).
 */
export function CohortHeatmap({ data, maxMonths = 12 }: CohortHeatmapProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: '12px'
      }}>
        No cohort data available
      </div>
    );
  }

  // Get color based on retention percentage
  const getColor = (retention: number): string => {
    if (retention >= 90) return '#10b981'; // green
    if (retention >= 80) return '#3b82f6'; // blue
    if (retention >= 70) return '#f59e0b'; // amber
    if (retention >= 60) return '#fb923c'; // orange
    return '#ef4444'; // red
  };

  // Get background opacity based on retention
  const getOpacity = (retention: number): number => {
    if (retention >= 90) return 0.2;
    if (retention >= 80) return 0.25;
    if (retention >= 70) return 0.3;
    if (retention >= 60) return 0.35;
    return 0.4;
  };

  return (
    <div style={{ overflowX: 'auto', fontSize: '11px' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '11px'
      }}>
        <thead>
          <tr>
            <th style={{
              position: 'sticky',
              left: 0,
              background: '#ffffff',
              zIndex: 2,
              padding: '8px',
              textAlign: 'left',
              fontSize: '11px',
              fontWeight: 600,
              color: '#656d76',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: '2px solid #e2e8f0'
            }}>
              Cohort
            </th>
            <th style={{
              padding: '8px',
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: 600,
              color: '#656d76',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: '2px solid #e2e8f0'
            }}>
              Size
            </th>
            {Array.from({ length: maxMonths + 1 }, (_, i) => (
              <th key={i} style={{
                padding: '8px',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 600,
                color: '#656d76',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '2px solid #e2e8f0',
                minWidth: '60px'
              }}>
                M{i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((cohort, idx) => (
            <tr key={cohort.cohortMonth} style={{
              borderBottom: idx < data.length - 1 ? '1px solid #f1f5f9' : 'none'
            }}>
              <td style={{
                position: 'sticky',
                left: 0,
                background: '#ffffff',
                zIndex: 1,
                padding: '10px 8px',
                fontWeight: 600,
                fontSize: '11px',
                color: '#1a1a1a',
                whiteSpace: 'nowrap'
              }}>
                {cohort.cohortLabel}
              </td>
              <td style={{
                padding: '10px 8px',
                textAlign: 'center',
                fontWeight: 500,
                fontSize: '11px',
                color: '#656d76'
              }}>
                {cohort.totalPolicies}
              </td>
              {Array.from({ length: maxMonths + 1 }, (_, monthsElapsed) => {
                const retention = cohort.retentionByMonth[monthsElapsed];
                const activeCount = cohort.activeCount[monthsElapsed];

                if (retention === undefined) {
                  return (
                    <td key={monthsElapsed} style={{
                      padding: '10px 8px',
                      textAlign: 'center',
                      background: '#f8f9fa',
                      color: '#94a3b8',
                      fontSize: '11px'
                    }}>
                      -
                    </td>
                  );
                }

                const color = getColor(retention);
                const opacity = getOpacity(retention);

                return (
                  <td
                    key={monthsElapsed}
                    title={`${retention.toFixed(1)}% retention (${activeCount} active)`}
                    style={{
                      padding: '10px 8px',
                      textAlign: 'center',
                      background: `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
                      color: retention >= 90 ? '#065f46' :
                             retention >= 80 ? '#1e40af' :
                             retention >= 70 ? '#92400e' :
                             retention >= 60 ? '#9a3412' : '#991b1b',
                      fontWeight: 600,
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'Monaco, monospace'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {retention.toFixed(0)}%
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div style={{
        marginTop: '16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        fontSize: '11px',
        color: '#656d76'
      }}>
        <span style={{ fontWeight: 600 }}>Legend:</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }} />
          <span>≥90%</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px' }} />
          <span>80-89%</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '2px' }} />
          <span>70-79%</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', background: '#fb923c', borderRadius: '2px' }} />
          <span>60-69%</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px' }} />
          <span>&lt;60%</span>
        </div>
      </div>
    </div>
  );
}
