// src/features/analytics/components/CohortAnalysis.tsx

import React from 'react';
import { CohortHeatmap } from '../visualizations';
import { useAnalyticsData } from '../../../hooks';

/**
 * CohortAnalysis - Retention and cohort performance tracking
 *
 * Analyzes policy performance by cohorts (groups that started in the same month)
 * Tracks retention, chargebacks, and earning progress over time
 */
export function CohortAnalysis() {
  const { cohort, isLoading } = useAnalyticsData();

  if (isLoading) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#1a1a1a',
          marginBottom: '16px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Cohort Analysis
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
          Loading cohort data...
        </div>
      </div>
    );
  }

  const { retention, summary } = cohort;

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '20px'
      }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#1a1a1a',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Cohort Analysis
        </div>
        <div style={{
          fontSize: '11px',
          color: '#656d76',
          marginTop: '4px'
        }}>
          Track retention by policy start month
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div style={{
          padding: '12px',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#656d76',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '6px'
          }}>
            Total Cohorts
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#1a1a1a',
            fontFamily: 'Monaco, monospace'
          }}>
            {summary.totalCohorts}
          </div>
        </div>

        <div style={{
          padding: '12px',
          background: '#f0fdf4',
          borderRadius: '8px'
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#656d76',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '6px'
          }}>
            Avg 9-Mo Retention
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#10b981',
            fontFamily: 'Monaco, monospace'
          }}>
            {summary.avgRetention9Month?.toFixed(1) || 0}%
          </div>
        </div>

        <div style={{
          padding: '12px',
          background: '#f0f9ff',
          borderRadius: '8px'
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#656d76',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '6px'
          }}>
            Best Cohort
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#3b82f6',
            fontFamily: 'Monaco, monospace'
          }}>
            {summary.bestCohort || 'N/A'}
          </div>
        </div>

        <div style={{
          padding: '12px',
          background: '#fef2f2',
          borderRadius: '8px'
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#656d76',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '6px'
          }}>
            Worst Cohort
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#ef4444',
            fontFamily: 'Monaco, monospace'
          }}>
            {summary.worstCohort || 'N/A'}
          </div>
        </div>
      </div>

      {/* Retention Heatmap */}
      <div style={{
        marginBottom: '20px'
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#1a1a1a',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Retention Heatmap
        </div>
        <CohortHeatmap data={retention} maxMonths={12} />
      </div>

      {/* Key Insights */}
      <div style={{
        marginTop: '20px',
        padding: '12px',
        background: '#f8f9fa',
        borderRadius: '6px',
        fontSize: '11px',
        color: '#656d76',
        lineHeight: '1.6'
      }}>
        <strong style={{ color: '#1a1a1a' }}>How to read this:</strong>
        <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
          <li>Each row represents a cohort (group of policies that started in the same month)</li>
          <li>Columns show retention percentage at each month after start (M0 = start month, M9 = 9 months later)</li>
          <li>Colors indicate retention health: Green (≥90%), Blue (80-89%), Amber (70-79%), Orange (60-69%), Red (&lt;60%)</li>
          <li>Hover over cells to see exact percentages and active policy counts</li>
        </ul>
      </div>
    </div>
  );
}
