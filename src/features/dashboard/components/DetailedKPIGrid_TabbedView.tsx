// src/features/dashboard/components/DetailedKPIGrid_TabbedView.tsx

import React, { useState } from 'react';
import { DetailedKPIGridProps } from '../../../types/dashboard.types';
import {
  BORDER_RADIUS,
  SHADOWS,
  FONT_SIZES,
  GRADIENTS,
  TYPOGRAPHY,
} from '../../../constants/dashboard';

/**
 * Option 2: Tabbed View (Category-Based)
 *
 * Style: Tab navigation with focused content areas
 * Best For: Users who prefer focused, less overwhelming views
 *
 * Features:
 * - Tab navigation (one section visible at a time)
 * - Larger fonts for better readability
 * - Less visual clutter
 * - Smooth tab transitions
 * - Clean, spacious layout
 */
export const DetailedKPIGrid_TabbedView: React.FC<DetailedKPIGridProps> = ({ sections }) => {
  const [activeTab, setActiveTab] = useState(0);

  const activeSection = sections[activeTab];

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: BORDER_RADIUS.LARGE,
        padding: '20px',
        boxShadow: SHADOWS.CARD,
      }}
    >
      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: '2px solid #e2e8f0',
          overflowX: 'auto',
          paddingBottom: '0',
        }}
      >
        {sections.map((section, index) => {
          const isActive = index === activeTab;
          return (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              style={{
                padding: '12px 20px',
                fontSize: FONT_SIZES.SUBSECTION_HEADER,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#3b82f6' : '#64748b',
                background: isActive ? '#eff6ff' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                borderRadius: `${BORDER_RADIUS.SMALL} ${BORDER_RADIUS.SMALL} 0 0`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                marginBottom: '-2px',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#475569';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              {section.category}
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <div
        style={{
          minHeight: '300px',
          animation: 'fadeIn 0.3s ease',
        }}
      >
        {/* Category Title */}
        <div
          style={{
            fontSize: FONT_SIZES.SECTION_HEADER,
            fontWeight: 700,
            marginBottom: '20px',
            color: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '4px',
              height: '24px',
              background: 'linear-gradient(180deg, #3b82f6 0%, #8b5cf6 100%)',
              borderRadius: '2px',
            }}
          />
          {activeSection.category}
        </div>

        {/* KPI Grid - 2 columns for better readability */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {activeSection.kpis.map((kpi, kpiIndex) => (
            <div
              key={kpiIndex}
              style={{
                padding: '16px 20px',
                borderRadius: BORDER_RADIUS.MEDIUM,
                background: GRADIENTS.LIGHT_CARD,
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                e.currentTarget.style.borderColor = '#cbd5e0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <span
                style={{
                  fontSize: FONT_SIZES.TABLE_CELL,
                  color: '#475569',
                  fontWeight: 500,
                }}
              >
                {kpi.label}
              </span>
              <span
                style={{
                  fontSize: FONT_SIZES.SUBSECTION_HEADER,
                  fontWeight: TYPOGRAPHY.BOLD_FONT_WEIGHT,
                  fontFamily: TYPOGRAPHY.MONO_FONT,
                  color: '#1a1a1a',
                }}
              >
                {kpi.value}
              </span>
            </div>
          ))}
        </div>

        {/* Tab Navigation Hint */}
        <div
          style={{
            marginTop: '20px',
            padding: '12px 16px',
            background: '#f8fafc',
            borderRadius: BORDER_RADIUS.SMALL,
            fontSize: FONT_SIZES.ALERT_TEXT,
            color: '#64748b',
            textAlign: 'center',
          }}
        >
          Viewing {activeTab + 1} of {sections.length} sections •{' '}
          {activeTab < sections.length - 1 && (
            <button
              onClick={() => setActiveTab(activeTab + 1)}
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: FONT_SIZES.ALERT_TEXT,
              }}
            >
              Next: {sections[activeTab + 1].category}
            </button>
          )}
          {activeTab >= sections.length - 1 && (
            <button
              onClick={() => setActiveTab(0)}
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: FONT_SIZES.ALERT_TEXT,
              }}
            >
              Back to {sections[0].category}
            </button>
          )}
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
