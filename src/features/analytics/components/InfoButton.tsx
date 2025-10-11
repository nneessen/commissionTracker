// src/features/analytics/components/InfoButton.tsx

import React, { useState } from 'react';

interface InfoButtonProps {
  title: string;
  children: React.ReactNode;
}

/**
 * InfoButton - Reusable info button with expandable explanation panel
 *
 * Provides consistent info button UI across all analytics components
 */
export function InfoButton({ title, children }: InfoButtonProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
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
              {title}
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
          {children}
        </div>
      )}
    </>
  );
}
