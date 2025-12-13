// src/features/dashboard/components/AlertsPanel.tsx

import React from "react";
import { AlertsPanelProps, AlertConfig } from "../../../types/dashboard.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  const getAlertClasses = (type: AlertConfig["type"]) => {
    switch (type) {
      case "info":
        return {
          bg: "bg-gradient-to-br from-blue-50/50 to-sky-50/40 dark:from-blue-950/10 dark:to-sky-950/8 shadow-sm",
          text: "text-blue-700 dark:text-blue-300",
          textLight: "text-blue-600/80 dark:text-blue-400/70",
        };
      case "warning":
        return {
          bg: "bg-gradient-to-br from-amber-50/50 to-yellow-50/40 dark:from-amber-950/10 dark:to-yellow-950/8 shadow-sm",
          text: "text-amber-700 dark:text-amber-300",
          textLight: "text-amber-600/80 dark:text-amber-400/70",
        };
      case "danger":
      case "error":
        return {
          bg: "bg-gradient-to-br from-red-50/50 to-rose-50/40 dark:from-red-950/10 dark:to-rose-950/8 shadow-sm",
          text: "text-red-700 dark:text-red-300",
          textLight: "text-red-600/80 dark:text-red-400/70",
        };
      default:
        return {
          bg: "bg-gradient-to-br from-blue-50/50 to-sky-50/40 dark:from-blue-950/10 dark:to-sky-950/8 shadow-sm",
          text: "text-blue-700 dark:text-blue-300",
          textLight: "text-blue-600/80 dark:text-blue-400/70",
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
        <div className="flex flex-col gap-3">
          {activeAlerts.map((alert, index) => {
            const classes = getAlertClasses(alert.type);
            return (
              <div key={index} className={`${classes.bg} rounded-lg p-3`}>
                <div className={`text-xs font-semibold ${classes.text}`}>
                  {alert.title}
                </div>
                <div className={`text-xs ${classes.textLight} mt-1`}>
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
