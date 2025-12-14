// src/features/dashboard/components/AlertsPanel.tsx

import React from "react";
import {AlertTriangle, Info, AlertCircle} from "lucide-react";
import {AlertsPanelProps, AlertConfig} from "../../../types/dashboard.types";
import {Card, CardContent} from "@/components/ui/card";
import {cn} from "@/lib/utils";

/**
 * Alerts Panel Component - Clean, minimal design matching Targets/Expenses pages
 */
export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
  const activeAlerts = alerts.filter((alert) => alert.condition);

  if (activeAlerts.length === 0) {
    return null;
  }

  const getAlertIcon = (type: AlertConfig["type"]) => {
    switch (type) {
      case "info":
        return <Info className="h-3 w-3 text-info flex-shrink-0" />;
      case "warning":
        return <AlertTriangle className="h-3 w-3 text-warning flex-shrink-0" />;
      case "danger":
      case "error":
        return <AlertCircle className="h-3 w-3 text-error flex-shrink-0" />;
      default:
        return <Info className="h-3 w-3 text-muted-foreground flex-shrink-0" />;
    }
  };

  const getTextColor = (type: AlertConfig["type"]) => {
    switch (type) {
      case "info":
        return "text-info";
      case "warning":
        return "text-warning";
      case "danger":
      case "error":
        return "text-error";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[11px] font-medium text-muted-foreground uppercase mb-2">Alerts</div>
        <div className="space-y-2">
          {activeAlerts.map((alert, index) => (
            <div key={index} className="flex items-start gap-2 pb-2 border-b last:border-b-0 last:pb-0">
              {getAlertIcon(alert.type)}
              <div className="flex-1 min-w-0">
                <div className={cn("text-[11px] font-semibold", getTextColor(alert.type))}>
                  {alert.title}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {alert.message}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
