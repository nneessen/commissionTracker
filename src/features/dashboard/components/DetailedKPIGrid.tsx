// src/features/dashboard/components/DetailedKPIGrid.tsx

import React from 'react';
import { DetailedKPIGridProps } from '../../../types/dashboard.types';
import {
  BORDER_RADIUS,
  SHADOWS,
  FONT_SIZES,
  GRADIENTS,
  LAYOUT,
  TYPOGRAPHY,
} from '../../../constants/dashboard';

/**
 * Detailed KPI Grid Component
 *
 * Bottom section displaying detailed KPI breakdown in grid layout.
 * Extracted from DashboardHome.tsx (lines 1217-1468).
 */
export const DetailedKPIGrid: React.FC<DetailedKPIGridProps> = ({ sections }) => {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: BORDER_RADIUS.LARGE,
        padding: '16px',
        boxShadow: SHADOWS.CARD,
      }}
    >
      <div
        style={{
          fontSize: FONT_SIZES.SECTION_HEADER,
          fontWeight: 600,
          marginBottom: '12px',
          color: '#1a1a1a',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Detailed KPI Breakdown
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: LAYOUT.KPI_GRID,
          gap: '12px',
        }}
      >
        {sections.map((section, sectionIndex) => (
          <div
            key={sectionIndex}
            style={{
              padding: '12px',
              borderRadius: BORDER_RADIUS.MEDIUM,
              background: GRADIENTS.LIGHT_CARD,
              border: '1px solid #cbd5e0',
            }}
          >
            <div
              style={{
                fontSize: FONT_SIZES.KPI_LABEL,
                fontWeight: 600,
                color: '#4a5568',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {section.category}
            </div>
            {section.kpis.map((kpi, kpiIndex) => (
              <div
                key={kpiIndex}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  borderBottom:
                    kpiIndex < section.kpis.length - 1
                      ? '1px solid #e2e8f0'
                      : 'none',
                }}
              >
                <span
                  style={{
                    fontSize: FONT_SIZES.KPI_LABEL,
                    color: '#656d76',
                  }}
                >
                  {kpi.label}
                </span>
                <span
                  style={{
                    fontSize: FONT_SIZES.KPI_VALUE,
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
        ))}
      </div>
    </div>
  );
};
