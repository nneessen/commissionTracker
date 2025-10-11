// src/features/dashboard/components/AlertsPanel.tsx

import React from 'react';
import { AlertsPanelProps, AlertConfig } from '../../../types/dashboard.types';
import { BORDER_RADIUS, SHADOWS, FONT_SIZES, ALERT_COLORS } from '../../../constants/dashboard';

/**
 * Alerts Panel Component
 *
 * Displays conditional alerts based on dashboard state.
 * Extracted from DashboardHome.tsx (lines 939-1148).
 */
export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
  const activeAlerts = alerts.filter((alert) => alert.condition);

  if (activeAlerts.length === 0) {
    return null;
  }

  const getAlertStyle = (type: AlertConfig['type']) => {
    switch (type) {
      case 'info':
        return ALERT_COLORS.INFO;
      case 'warning':
        return ALERT_COLORS.WARNING;
      case 'danger':
        return ALERT_COLORS.DANGER;
      case 'error':
        return ALERT_COLORS.ERROR;
      default:
        return ALERT_COLORS.INFO;
    }
  };

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
        Alerts
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {activeAlerts.map((alert, index) => {
          const style = getAlertStyle(alert.type);
          return (
            <div
              key={index}
              style={{
                padding: '8px',
                borderRadius: BORDER_RADIUS.SMALL,
                background: style.background,
                borderLeft: `3px solid ${style.border}`,
              }}
            >
              <div
                style={{
                  fontSize: FONT_SIZES.ALERT_TITLE,
                  fontWeight: 600,
                  color: style.text,
                }}
              >
                {alert.title}
              </div>
              <div
                style={{
                  fontSize: FONT_SIZES.ALERT_TEXT,
                  color: style.textLight,
                  marginTop: '2px',
                }}
              >
                {alert.message}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
