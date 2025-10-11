// src/features/analytics/components/CommissionDeepDive.tsx

import React, { useState } from 'react';
import { useAnalyticsData } from '../../../hooks';

/**
 * CommissionDeepDive - Detailed commission analysis
 */
export function CommissionDeepDive() {
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
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
          Loading commission data...
        </div>
      </div>
    );
  }

  const { earningProgress } = cohort;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalAdvance = earningProgress.reduce((sum, p) => sum + p.totalAdvance, 0);
  const totalEarned = earningProgress.reduce((sum, p) => sum + p.totalEarned, 0);
  const totalUnearned = earningProgress.reduce((sum, p) => sum + p.totalUnearned, 0);

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#1a1a1a',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Commission Deep Dive
        </div>
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
              💵 Understanding Commission Deep Dive
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
            <strong>What is this?</strong> Commission Deep Dive tracks your advance payments and shows how much you've actually earned versus what you still owe back.
            This is critical for managing cash flow and understanding your true income.
          </div>

          <div style={{ marginBottom: '16px' }}>
            <strong>Key Terms:</strong>
          </div>

          <div style={{ marginBottom: '12px', paddingLeft: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#3b82f6' }}>💰 Total Advance:</strong>
              <div style={{ marginTop: '4px', color: '#475569' }}>
                Money you received upfront from the carrier
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  Example: $10,000 paid to you when policy was sold
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#10b981' }}>✅ Total Earned:</strong>
              <div style={{ marginTop: '4px', color: '#475569' }}>
                Portion of the advance you've actually earned (policies still active)
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  As months pass and clients keep paying, you earn more
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#ef4444' }}>⏳ Total Unearned:</strong>
              <div style={{ marginTop: '4px', color: '#475569' }}>
                Money you still owe back if policies lapse/cancel
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  Risk amount - this could be charged back
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', background: '#ffffff', borderRadius: '6px' }}>
            <strong>How It Works:</strong>
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#475569' }}>
              Most insurance carriers pay you upfront but you only "earn" it over time:
              <div style={{ paddingLeft: '12px', marginTop: '4px' }}>
                • <strong>Month 1:</strong> Get $1,000 advance (100% unearned)<br/>
                • <strong>Month 6:</strong> Client still paying → 50% earned, 50% unearned<br/>
                • <strong>Month 12:</strong> Client still paying → 100% earned, 0% unearned<br/>
                • <strong>If client cancels at Month 3:</strong> Chargeback! You owe back ~75%
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', background: '#ffffff', borderRadius: '6px' }}>
            <strong>Real Example:</strong>
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#475569' }}>
              You sell 10 policies, receive $50,000 in advances<br/>
              After 6 months:<br/>
              • 8 policies still active → $40,000 earned<br/>
              • 2 policies lapsed → $10,000 unearned (at risk)<br/>
              <div style={{ marginTop: '8px', color: '#1e40af' }}>
                <strong>Your actual income:</strong> $40,000 (not $50,000!)<br/>
                <strong>Potential chargeback:</strong> $10,000 if those 2 don't reinstate
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
            💡 <strong>Pro Tip:</strong> High unearned balance = high risk! Focus on keeping those clients happy and policies active!
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
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
            Total Advance
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#3b82f6',
            fontFamily: 'Monaco, monospace'
          }}>
            {formatCurrency(totalAdvance)}
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
            Total Earned
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#10b981',
            fontFamily: 'Monaco, monospace'
          }}>
            {formatCurrency(totalEarned)}
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
            Total Unearned
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#ef4444',
            fontFamily: 'Monaco, monospace'
          }}>
            {formatCurrency(totalUnearned)}
          </div>
        </div>
      </div>
    </div>
  );
}
