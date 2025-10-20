// src/features/analytics/components/ProductMatrix.tsx

import React, { useState } from 'react';
import { useAnalyticsData } from '../../../hooks';

/**
 * ProductMatrix - Product performance matrix
 */
export function ProductMatrix() {
  const { attribution, isLoading } = useAnalyticsData();
  const [showInfo, setShowInfo] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="p-10 text-center text-gray-400 text-xs">
          Loading product data...
        </div>
      </div>
    );
  }

  const { productMix } = attribution;
  const latestMonth = productMix[productMix.length - 1];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Product Mix - {latestMonth?.periodLabel}
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
              📦 Understanding Product Mix
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
            <strong>What is this?</strong> Product Mix shows which insurance products you're selling most and how your portfolio is balanced.
            This helps you identify gaps and opportunities in your product offerings.
          </div>

          <div className="mb-4 p-3 bg-white rounded-md">
            <strong>Why It Matters:</strong>
            <div className="text-xs mt-2 text-gray-600">
              • <strong>Diversification:</strong> Relying too heavily on one product type is risky<br/>
              • <strong>Income Stability:</strong> Different products have different commission structures<br/>
              • <strong>Client Needs:</strong> Shows if you're serving all client segments<br/>
              • <strong>Growth Opportunities:</strong> Identifies underutilized product lines
            </div>
          </div>

          <div className="mb-4 p-3 bg-white rounded-md">
            <strong>Real Example:</strong>
            <div className="text-xs mt-2 text-gray-600">
              Your current mix:<br/>
              • 60% Term Life (30 policies, $180K premium)<br/>
              • 25% Whole Life (10 policies, $150K premium)<br/>
              • 10% Health (8 policies, $80K premium)<br/>
              • 5% Disability (2 policies, $20K premium)<br/>
              <div style={{ marginTop: '8px', color: '#1e40af' }}>
                <strong>Insight:</strong> You're heavily term-focused. Consider pushing whole life and disability for better commission rates!
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
            💡 <strong>Pro Tip:</strong> Aim for a balanced mix - don't put all your eggs in one product basket!
          </div>
        </div>
      )}

      <div className="grid gap-2">
        {latestMonth?.productBreakdown.map((product, idx) => (
          <div
            key={product.product}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: idx === 0 ? '#f0f9ff' : '#f8f9fa',
              borderRadius: '6px'
            }}
          >
            <div>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#1a1a1a',
                marginBottom: '4px'
              }}>
                {product.product}
              </div>
              <div style={{
                fontSize: '10px',
                color: '#656d76'
              }}>
                {product.count} policies · {product.percentage.toFixed(1)}%
              </div>
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#3b82f6',
              fontFamily: 'Monaco, monospace'
            }}>
              {formatCurrency(product.revenue)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
