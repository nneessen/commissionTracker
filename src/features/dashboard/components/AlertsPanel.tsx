// src/features/dashboard/components/AlertsPanel.tsx

import React from "react";
import { AlertTriangle, Info, AlertCircle } from "lucide-react";
import { AlertsPanelProps, AlertConfig } from "../../../types/dashboard.types";
import { cn } from "@/lib/utils";

/**
 * Alerts Panel Component - Compact zinc-styled design
 */
export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
  const activeAlerts = alerts.filter((alert) => alert.condition);

  if (activeAlerts.length === 0) {
    return null;
  }

  const getAlertIcon = (type: AlertConfig["type"]) => {
    switch (type) {
      case "info":
        return (
          <Info className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        );
      case "warning":
        return (
          <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        );
      case "danger":
      case "error":
        return (
          <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400 flex-shrink-0" />
        );
      default:
        return (
          <Info className="h-3 w-3 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
        );
    }
  };

  const getTextColor = (type: AlertConfig["type"]) => {
    switch (type) {
      case "info":
        return "text-blue-600 dark:text-blue-400";
      case "warning":
        return "text-amber-600 dark:text-amber-400";
      case "danger":
      case "error":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-zinc-500 dark:text-zinc-400";
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
        Alerts
      </div>
      <div className="space-y-2">
        {activeAlerts.map((alert, index) => (
          <div
            key={index}
            className="flex items-start gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/50 last:border-b-0 last:pb-0"
          >
            {getAlertIcon(alert.type)}
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "text-[11px] font-semibold",
                  getTextColor(alert.type),
                )}
              >
                {alert.title}
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {alert.message}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
