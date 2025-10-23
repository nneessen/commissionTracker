// src/features/dashboard/components/AlertsPanel.tsx

import React from 'react';
import { AlertsPanelProps, AlertConfig } from '../../../types/dashboard.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
          text: 'text-info',
          textLight: 'text-info/80',
        };
      case 'warning':
        return {
          bg: 'bg-warning/10',
          text: 'text-warning',
          textLight: 'text-warning/80',
        };
      case 'danger':
      case 'error':
        return {
          bg: 'bg-error/10',
          text: 'text-error',
          textLight: 'text-error/80',
        };
      default:
        return {
          bg: 'bg-info/10',
          text: 'text-info',
          textLight: 'text-info/80',
        };
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-sm uppercase tracking-wide">
          Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex flex-col gap-2">
          {activeAlerts.map((alert, index) => {
            const classes = getAlertClasses(alert.type);
            return (
              <div
                key={index}
                className={`${classes.bg} rounded-lg p-2 shadow-sm`}
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
      </CardContent>
    </Card>
  );
};
