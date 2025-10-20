// src/features/dashboard/components/AlertsPanel.tsx

import React from 'react';
import { AlertsPanelProps, AlertConfig } from '../../../types/dashboard.types';

/**
 * Alerts Panel Component
 *
 * Displays conditional alerts based on dashboard state.
 * Extracted from DashboardHome.tsx (lines 939-1148).
 *
 * Refactored to use Tailwind CSS classes instead of inline styles.
 */
export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
  const activeAlerts = alerts.filter((alert) => alert.condition);

  if (activeAlerts.length === 0) {
    return null;
  }

  const getAlertClasses = (type: AlertConfig['type']) => {
    switch (type) {
      case 'info':
        return {
          bg: 'bg-info/10',
          border: 'border-info',
          text: 'text-info',
          textLight: 'text-info/80',
        };
      case 'warning':
        return {
          bg: 'bg-warning/10',
          border: 'border-warning',
          text: 'text-warning',
          textLight: 'text-warning/80',
        };
      case 'danger':
      case 'error':
        return {
          bg: 'bg-error/10',
          border: 'border-error',
          text: 'text-error',
          textLight: 'text-error/80',
        };
      default:
        return {
          bg: 'bg-info/10',
          border: 'border-info',
          text: 'text-info',
          textLight: 'text-info/80',
        };
    }
  };

  return (
    <div className="bg-card rounded-lg p-3.5 shadow-sm">
      <div className="text-sm font-semibold mb-2.5 text-foreground uppercase tracking-wide">
        Alerts
      </div>
      <div className="flex flex-col gap-2">
        {activeAlerts.map((alert, index) => {
          const classes = getAlertClasses(alert.type);
          return (
            <div
              key={index}
              className={`p-2 rounded-sm ${classes.bg} border-l-[3px] ${classes.border}`}
            >
              <div className={`text-xs font-semibold ${classes.text}`}>
                {alert.title}
              </div>
              <div className={`text-xs ${classes.textLight} mt-0.5`}>
                {alert.message}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
