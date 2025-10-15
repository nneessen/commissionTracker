// src/features/dashboard/components/DetailedKPIGrid_Accordion.tsx

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { DetailedKPIGridProps } from '../../../types/dashboard.types';
import {
  BORDER_RADIUS,
  SHADOWS,
  FONT_SIZES,
  GRADIENTS,
  TYPOGRAPHY,
} from '../../../constants/dashboard';

/**
 * Option 3: Collapsible Accordion (Progressive Disclosure)
 *
 * Style: Expandable sections with summaries
 * Best For: Users who want quick overview with drill-down capability
 *
 * Features:
 * - Expandable/collapsible sections
 * - Summary shows top 2-3 key metrics
 * - Click to expand for full detail
 * - Smooth animations
 * - Remembers expanded state
 * - Space-efficient
 */
export const DetailedKPIGrid_Accordion: React.FC<DetailedKPIGridProps> = ({ sections }) => {
  // Start with first section expanded
  const [expandedSections, setExpandedSections] = useState<number[]>([0]);

  const toggleSection = (index: number) => {
    if (expandedSections.includes(index)) {
      setExpandedSections(expandedSections.filter((i) => i !== index));
    } else {
      setExpandedSections([...expandedSections, index]);
    }
  };

  const isExpanded = (index: number) => expandedSections.includes(index);

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
        📋 Detailed Metrics
      </div>

      {/* Accordion Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sections.map((section, sectionIndex) => {
          const expanded = isExpanded(sectionIndex);
          // Show first 3 KPIs in summary
          const summaryKPIs = section.kpis.slice(0, 3);

          return (
            <div
              key={sectionIndex}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: BORDER_RADIUS.MEDIUM,
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                boxShadow: expanded ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {/* Section Header (Always Visible) */}
              <button
                onClick={() => toggleSection(sectionIndex)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  background: expanded
                    ? 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
                    : '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!expanded) {
                    e.currentTarget.style.background = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!expanded) {
                    e.currentTarget.style.background = '#ffffff';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {expanded ? (
                    <ChevronDown size={18} color="#3b82f6" />
                  ) : (
                    <ChevronRight size={18} color="#64748b" />
                  )}
                  <span
                    style={{
                      fontSize: FONT_SIZES.SUBSECTION_HEADER,
                      fontWeight: 600,
                      color: expanded ? '#3b82f6' : '#1a1a1a',
                      textAlign: 'left',
                    }}
                  >
                    {section.category}
                  </span>
                </div>

                {/* Summary Preview (when collapsed) */}
                {!expanded && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '16px',
                      fontSize: FONT_SIZES.ALERT_TEXT,
                      color: '#64748b',
                    }}
                  >
                    {summaryKPIs.map((kpi, i) => (
                      <span key={i}>
                        {kpi.label}: <strong style={{ color: '#1a1a1a' }}>{kpi.value}</strong>
                      </span>
                    ))}
                    {section.kpis.length > 3 && (
                      <span style={{ color: '#94a3b8' }}>+{section.kpis.length - 3} more</span>
                    )}
                  </div>
                )}
              </button>

              {/* Expanded Content */}
              {expanded && (
                <div
                  style={{
                    padding: '16px 20px 20px',
                    background: '#ffffff',
                    borderTop: '1px solid #e2e8f0',
                    animation: 'slideDown 0.3s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px',
                    }}
                  >
                    {section.kpis.map((kpi, kpiIndex) => (
                      <div
                        key={kpiIndex}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderRadius: BORDER_RADIUS.SMALL,
                          background: GRADIENTS.LIGHT_CARD,
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = GRADIENTS.LIGHT_CARD;
                        }}
                      >
                        <span
                          style={{
                            fontSize: FONT_SIZES.KPI_LABEL,
                            color: '#475569',
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
              )}
            </div>
          );
        })}
      </div>

      {/* Expand/Collapse All Button */}
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <button
          onClick={() => {
            if (expandedSections.length === sections.length) {
              setExpandedSections([]);
            } else {
              setExpandedSections(sections.map((_, i) => i));
            }
          }}
          style={{
            padding: '8px 16px',
            fontSize: FONT_SIZES.ALERT_TEXT,
            color: '#3b82f6',
            background: 'none',
            border: '1px solid #3b82f6',
            borderRadius: BORDER_RADIUS.SMALL,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#3b82f6';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = '#3b82f6';
          }}
        >
          {expandedSections.length === sections.length ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 1000px;
          }
        }
      `}</style>
    </div>
  );
};
