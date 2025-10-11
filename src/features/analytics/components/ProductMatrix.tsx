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
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
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
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#1a1a1a',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Product Mix - {latestMonth?.periodLabel}
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

          <div style={{ marginBottom: '16px' }}>
            <strong>What is this?</strong> Product Mix shows which insurance products you're selling most and how your portfolio is balanced.
            This helps you identify gaps and opportunities in your product offerings.
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', background: '#ffffff', borderRadius: '6px' }}>
            <strong>Why It Matters:</strong>
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#475569' }}>
              • <strong>Diversification:</strong> Relying too heavily on one product type is risky<br/>
              • <strong>Income Stability:</strong> Different products have different commission structures<br/>
              • <strong>Client Needs:</strong> Shows if you're serving all client segments<br/>
              • <strong>Growth Opportunities:</strong> Identifies underutilized product lines
            </div>
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', background: '#ffffff', borderRadius: '6px' }}>
            <strong>Real Example:</strong>
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#475569' }}>
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

      <div style={{ display: 'grid', gap: '8px' }}>
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
