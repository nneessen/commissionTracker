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
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="p-10 text-center text-gray-400 text-xs">
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
    <div className="bg-white rounded-xl p-5 shadow-sm w-full box-border overflow-hidden">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Commission Deep Dive
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="bg-blue-50 border border-blue-100"
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
        <div className="bg-blue-50 border border-blue-200">
          <div className="flex justify-between items-start mb-3">
            <h3 className="m-0 text-sm font-bold text-blue-800">
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

          <div className="mb-4">
            <strong>What is this?</strong> Commission Deep Dive tracks your advance payments and shows how much you've actually earned versus what you still owe back.
            This is critical for managing cash flow and understanding your true income.
          </div>

          <div className="mb-4">
            <strong>Key Terms:</strong>
          </div>

          <div className="mb-3 pl-4">
            <div className="mb-2">
              <strong className="text-blue-500">💰 Total Advance:</strong>
              <div className="mt-1 text-gray-600">
                Money you received upfront from the carrier
                <div className="text-xs mt-0.5">
                  Example: $10,000 paid to you when policy was sold
                </div>
              </div>
            </div>

            <div className="mb-2">
              <strong className="text-green-500">✅ Total Earned:</strong>
              <div className="mt-1 text-gray-600">
                Portion of the advance you've actually earned (policies still active)
                <div className="text-xs mt-0.5">
                  As months pass and clients keep paying, you earn more
                </div>
              </div>
            </div>

            <div className="mb-2">
              <strong className="text-red-500">⏳ Total Unearned:</strong>
              <div className="mt-1 text-gray-600">
                Money you still owe back if policies lapse/cancel
                <div className="text-xs mt-0.5">
                  Risk amount - this could be charged back
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4 p-3 bg-white rounded-md">
            <strong>How It Works:</strong>
            <div className="text-xs mt-2 text-gray-600">
              Most insurance carriers pay you upfront but you only "earn" it over time:
              <div className="pl-3 mt-1">
                • <strong>Month 1:</strong> Get $1,000 advance (100% unearned)<br/>
                • <strong>Month 6:</strong> Client still paying → 50% earned, 50% unearned<br/>
                • <strong>Month 12:</strong> Client still paying → 100% earned, 0% unearned<br/>
                • <strong>If client cancels at Month 3:</strong> Chargeback! You owe back ~75%
              </div>
            </div>
          </div>

          <div className="mb-4 p-3 bg-white rounded-md">
            <strong>Real Example:</strong>
            <div className="text-xs mt-2 text-gray-600">
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
