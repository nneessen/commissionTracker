// src/features/dashboard/components/DashboardHeader.tsx

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardHeaderProps } from "../../../types/dashboard.types";

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  monthProgress,
}) => {
  const {
    now,
    daysPassed,
    daysInMonth,
    monthProgress: progressPercent,
  } = monthProgress;

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground m-0 mb-1">
              The Standard HQ
            </h1>
            <div className="text-xs text-muted-foreground/80 flex gap-4">
              <span>
                Last Updated:{" "}
                {now.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span>
                Month Progress: {progressPercent.toFixed(0)}% ({daysPassed}/
                {daysInMonth} days)
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
