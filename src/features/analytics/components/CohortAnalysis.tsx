// src/features/analytics/components/CohortAnalysis.tsx

import React, { useState } from 'react';
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
  const [showInfo, setShowInfo] = useState(false);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div>
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
          {/* Info Icon Button */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            style={{
              background: '#f0f9ff',
              border: '1px solid #e0f2fe',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              color: '#3b82f6',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#dbeafe';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f0f9ff';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Click for detailed explanation"
          >
            i
          </button>
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: '#f0f9ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          fontSize: '12px',
          lineHeight: '1.8',
          color: '#1e40af'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e40af' }}>
              📅 Understanding Cohort Analysis
            </h3>
            <button
              onClick={() => setShowInfo(false)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: '#64748b',
                padding: '0',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <strong>What is this?</strong> Cohort Analysis groups your policies by the month they started and tracks how well they stick around over time.
            Think of it like tracking different "graduating classes" of policies to see which months produced the most lasting relationships.
          </div>

          <div style={{ marginBottom: '16px' }}>
            <strong>Key Metrics Explained:</strong>
          </div>

          <div style={{ marginBottom: '12px', paddingLeft: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#1a1a1a' }}>Total Cohorts:</strong>
              <div style={{ marginTop: '4px', color: '#475569' }}>
                How many different "start months" you have policies from
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#10b981' }}>Avg 9-Mo Retention:</strong>
              <div style={{ marginTop: '4px', color: '#475569' }}>
                What percentage of policies are still active after 9 months (industry benchmark)
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  Example: 85% means 85 out of 100 policies are still active at month 9
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#3b82f6' }}>Best Cohort:</strong>
              <div style={{ marginTop: '4px', color: '#475569' }}>
                Which start month has the best retention (your strongest group)
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#ef4444' }}>Worst Cohort:</strong>
              <div style={{ marginTop: '4px', color: '#475569' }}>
                Which start month has the lowest retention (needs attention)
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', background: '#ffffff', borderRadius: '6px' }}>
            <strong>How to Read the Heatmap:</strong>
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#475569' }}>
              • <strong>Rows</strong> = Different cohorts (Jan 2025, Feb 2025, etc.)<br/>
              • <strong>Columns</strong> = Months elapsed (M0 = start, M3 = 3 months later, M9 = 9 months later)<br/>
              • <strong>Colors</strong> = Health indicator:<br/>
              <div style={{ paddingLeft: '12px', marginTop: '4px' }}>
                🟢 Green (≥90%) = Excellent retention<br/>
                🔵 Blue (80-89%) = Good retention<br/>
                🟡 Amber (70-79%) = Fair retention<br/>
                🟠 Orange (60-69%) = Needs attention<br/>
                🔴 Red (&lt;60%) = Critical - investigate!
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', background: '#ffffff', borderRadius: '6px' }}>
            <strong>Real Example:</strong>
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#475569' }}>
              Jan 2025 cohort: Started with 20 policies<br/>
              • M0 (Jan): 100% retention (20/20 active)<br/>
              • M3 (Apr): 90% retention (18/20 active) - 2 lapsed<br/>
              • M9 (Oct): 85% retention (17/20 active) - 1 more lapsed<br/>
              <div style={{ marginTop: '8px', color: '#1e40af' }}>
                This is a <strong>healthy cohort</strong> - losing only 3 policies in 9 months!
              </div>
            </div>
          </div>

          <div style={{
            padding: '8px',
            background: '#dbeafe',
            borderRadius: '4px',
            fontSize: '11px',
            textAlign: 'center',
            color: '#1e40af'
          }}>
            💡 <strong>Pro Tip:</strong> Look for patterns - if certain months have worse retention, investigate what was different about those sales!
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
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
    </div>
  );
}
