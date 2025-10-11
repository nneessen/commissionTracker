// src/features/dashboard/components/QuickActionsPanel.tsx

import React from 'react';
import { QuickActionsPanelProps } from '../../../types/dashboard.types';
import {
  BORDER_RADIUS,
  SHADOWS,
  FONT_SIZES,
  QUICK_ACTION_BUTTON,
} from '../../../constants/dashboard';

/**
 * Quick Actions Panel Component
 *
 * Displays quick action buttons (Add Policy, Add Expense, View Reports).
 * Extracted from DashboardHome.tsx (lines 1150-1214).
 */
export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  actions,
  onActionClick,
  isCreating,
}) => {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: BORDER_RADIUS.LARGE,
        padding: '14px',
        boxShadow: SHADOWS.CARD,
      }}
    >
      <div
        style={{
          fontSize: FONT_SIZES.SUBSECTION_HEADER,
          fontWeight: 600,
          marginBottom: '10px',
          color: '#1a1a1a',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Quick Actions
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => onActionClick(action.action)}
            disabled={isCreating}
            style={{
              padding: '8px 12px',
              borderRadius: BORDER_RADIUS.SMALL,
              border: `1px solid ${QUICK_ACTION_BUTTON.DEFAULT_BORDER}`,
              background: isCreating
                ? QUICK_ACTION_BUTTON.DISABLED_BG
                : QUICK_ACTION_BUTTON.DEFAULT_BG,
              fontSize: FONT_SIZES.STAT_LABEL,
              fontWeight: 500,
              cursor: isCreating ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              color: isCreating
                ? QUICK_ACTION_BUTTON.DISABLED_COLOR
                : '#1a1a1a',
              transition: 'all 0.2s ease',
              opacity: isCreating ? QUICK_ACTION_BUTTON.DISABLED_OPACITY : 1,
            }}
            onMouseEnter={(e) => {
              if (!isCreating) {
                e.currentTarget.style.background = QUICK_ACTION_BUTTON.HOVER_BG;
                e.currentTarget.style.borderColor = QUICK_ACTION_BUTTON.HOVER_BORDER;
              }
            }}
            onMouseLeave={(e) => {
              if (!isCreating) {
                e.currentTarget.style.background = QUICK_ACTION_BUTTON.DEFAULT_BG;
                e.currentTarget.style.borderColor = QUICK_ACTION_BUTTON.DEFAULT_BORDER;
              }
            }}
          >
            {isCreating && action.label !== 'View Reports'
              ? `${action.label}...`
              : action.label}
          </button>
        ))}
      </div>
    </div>
  );
};
