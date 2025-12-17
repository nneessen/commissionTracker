// src/features/policies/components/PolicyDashboardHeader.tsx

import React from "react";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PolicyDashboardHeaderProps {
  summary: {
    totalPolicies: number;
    activePolicies: number;
    pendingPolicies: number;
    totalAnnualPremium: number;
    totalPaidCommission: number;
    totalPendingCommission: number;
    dateRangeLabel?: string;
  };
  onNewPolicy: () => void;
}

/**
 * Header component for PolicyDashboard with summary statistics
 * Displays inline metrics in compact zinc-styled layout
 */
export const PolicyDashboardHeader: React.FC<PolicyDashboardHeaderProps> = ({
  summary,
  onNewPolicy,
}) => {
  return (
    <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
      {/* Title */}
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
        <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Policy Management
        </h1>
      </div>

      {/* Inline Stats with Dividers */}
      <div className="flex items-center gap-3 text-[11px]">
        <div className="flex items-center gap-1">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {summary.totalPolicies}
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">total</span>
        </div>
        <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {summary.activePolicies}
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">active</span>
        </div>
        <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {summary.pendingPolicies}
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">pending</span>
        </div>
        <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex items-center gap-1">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            ${(summary.totalAnnualPremium / 1000).toFixed(1)}K
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">premium</span>
        </div>
        <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex items-center gap-1">
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            ${(summary.totalPaidCommission / 1000).toFixed(1)}K
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">paid</span>
        </div>
        <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex items-center gap-1">
          <span className="font-medium text-blue-600 dark:text-blue-400">
            ${(summary.totalPendingCommission / 1000).toFixed(1)}K
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">pending comm</span>
        </div>
        {summary.dateRangeLabel && (
          <>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <span className="text-[9px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
              {summary.dateRangeLabel}
            </span>
          </>
        )}
      </div>

      {/* New Policy Button */}
      <Button onClick={onNewPolicy} size="sm" className="h-6 text-[10px] px-2">
        <Plus className="h-3 w-3 mr-1" />
        New Policy
      </Button>
    </div>
  );
};
