// src/features/policies/components/PolicyDashboardHeader.tsx

import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PolicyDashboardHeaderProps {
  summary: {
    totalPolicies: number;
    activePolicies: number;
    totalAnnualPremium: number;
    totalExpectedCommission: number;
    averageCommissionRate: number;
  };
  onNewPolicy: () => void;
}

/**
 * Header component for PolicyDashboard with summary statistics
 */
export const PolicyDashboardHeader: React.FC<PolicyDashboardHeaderProps> = ({
  summary,
  onNewPolicy,
}) => {
  return (
    <div className="flex justify-between items-start mb-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Policy Management</h1>
        <div className="flex gap-6">
          <div className="flex flex-col items-center min-w-[60px]">
            <span className="text-xl font-semibold text-gray-900 leading-none">
              {summary.totalPolicies}
            </span>
            <span className="text-[11px] text-gray-500 uppercase tracking-wide mt-0.5">
              Policies
            </span>
          </div>
          <div className="flex flex-col items-center min-w-[60px]">
            <span className="text-xl font-semibold text-gray-900 leading-none">
              {summary.activePolicies}
            </span>
            <span className="text-[11px] text-gray-500 uppercase tracking-wide mt-0.5">
              Active
            </span>
          </div>
          <div className="flex flex-col items-center min-w-[60px]">
            <span className="text-xl font-semibold text-gray-900 leading-none">
              ${(summary.totalAnnualPremium / 1000).toFixed(1)}K
            </span>
            <span className="text-[11px] text-gray-500 uppercase tracking-wide mt-0.5">
              Premium
            </span>
          </div>
          <div className="flex flex-col items-center min-w-[60px]">
            <span className="text-xl font-semibold text-gray-900 leading-none">
              ${(summary.totalExpectedCommission / 1000).toFixed(1)}K
            </span>
            <span className="text-[11px] text-gray-500 uppercase tracking-wide mt-0.5">
              Commission
            </span>
          </div>
          <div className="flex flex-col items-center min-w-[60px]">
            <span className="text-xl font-semibold text-gray-900 leading-none">
              {summary.averageCommissionRate.toFixed(1)}%
            </span>
            <span className="text-[11px] text-gray-500 uppercase tracking-wide mt-0.5">
              Avg Rate
            </span>
          </div>
        </div>
      </div>
      <div>
        <Button onClick={onNewPolicy} size="sm">
          <Plus size={16} />
          New Policy
        </Button>
      </div>
    </div>
  );
};
