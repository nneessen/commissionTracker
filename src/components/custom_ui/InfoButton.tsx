// src/components/custom_ui/InfoButton.tsx

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

      {/* Info Panel */}
      {showInfo && (
        <div className="bg-blue-50 border border-blue-200">
          <div className="flex justify-between items-start mb-3">
            <h3 className="m-0 text-sm font-bold text-blue-800">
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
