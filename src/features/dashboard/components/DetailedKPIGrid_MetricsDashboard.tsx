// src/features/dashboard/components/DetailedKPIGrid_MetricsDashboard.tsx

import React from 'react';
import { DetailedKPIGridProps } from '../../../types/dashboard.types';
import {
  BORDER_RADIUS,
  SHADOWS,
  FONT_SIZES,
  GRADIENTS,
  TYPOGRAPHY,
} from '../../../constants/dashboard';

/**
 * Option 1: Metrics Dashboard (Data-Dense Grid)
 *
 * Style: Modern 4-column grid with color-coded categories and maximum data density
 * Best For: Power users who want all metrics visible at once
 *
 * Features:
 * - 4-column responsive grid layout
 * - Color-coded category headers with icons
 * - Compact spacing for maximum information
 * - Hover effects for visual feedback
 * - Gradient backgrounds for depth
 */
export const DetailedKPIGrid_MetricsDashboard: React.FC<DetailedKPIGridProps> = ({ sections }) => {
  // Category colors for visual distinction
  const categoryColors: Record<string, string> = {
    Financial: '#10b981',
    Production: '#3b82f6',
    Metrics: '#8b5cf6',
    Clients: '#ec4899',
    'Current Status': '#06b6d4',
    'Targets & Pace': '#f59e0b',
  };

  const getCategoryColor = (category: string): string => {
    // Match partial category names (e.g., "Monthly Financial" matches "Financial")
    for (const [key, color] of Object.entries(categoryColors)) {
      if (category.includes(key)) {
        return color;
      }
    }
    return '#64748b'; // Default gray
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: BORDER_RADIUS.LARGE,
        padding: '20px',
        boxShadow: SHADOWS.CARD,
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: FONT_SIZES.SECTION_HEADER,
          fontWeight: 600,
          marginBottom: '16px',
          color: '#1a1a1a',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        📊 Detailed Metrics
      </div>

      {/* 3-column grid (2 rows of 3) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
        }}
      >
        {sections.map((section, sectionIndex) => {
          const categoryColor = getCategoryColor(section.category);

          return (
            <div
              key={sectionIndex}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Category Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: `2px solid ${categoryColor}`,
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: categoryColor,
                  }}
                />
                <div
                  style={{
                    fontSize: FONT_SIZES.KPI_LABEL,
                    fontWeight: 700,
                    color: categoryColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {section.category}
                </div>
              </div>

              {/* KPI Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {section.kpis.map((kpi, kpiIndex) => (
                  <div
                    key={kpiIndex}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 0',
                    }}
                  >
                    <span
                      style={{
                        fontSize: FONT_SIZES.KPI_LABEL,
                        color: '#64748b',
                        fontWeight: 500,
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
            </div>
          );
        })}
      </div>
    </div>
  );
};
