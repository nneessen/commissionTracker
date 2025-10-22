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
    <div className="mb-6">
      {/* Title and Action Row */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-grey-900 tracking-tight">
          Policy Management
        </h1>
        <Button
          onClick={onNewPolicy}
          size="sm"
          className="bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
        >
          <Plus size={16} className="mr-1.5" />
          New Policy
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-4">
        {/* Total Policies */}
        <div className="bg-white border border-grey-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-grey-500 uppercase tracking-wider mb-2">
              Total Policies
            </span>
            <span className="text-2xl font-bold text-grey-900">
              {summary.totalPolicies}
            </span>
          </div>
        </div>

        {/* Active Policies */}
        <div className="bg-gradient-to-br from-brand-50 to-white border border-brand-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-brand-700 uppercase tracking-wider mb-2">
              Active
            </span>
            <span className="text-2xl font-bold text-brand-900">
              {summary.activePolicies}
            </span>
          </div>
        </div>

        {/* Total Premium */}
        <div className="bg-white border border-grey-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-grey-500 uppercase tracking-wider mb-2">
              Total Premium
            </span>
            <span className="text-2xl font-bold text-grey-900">
              ${(summary.totalAnnualPremium / 1000).toFixed(1)}K
            </span>
          </div>
        </div>

        {/* Expected Commission */}
        <div className="bg-gradient-to-br from-accent-green/5 to-white border border-accent-green/20 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-accent-green uppercase tracking-wider mb-2">
              Commission
            </span>
            <span className="text-2xl font-bold text-grey-900">
              ${(summary.totalExpectedCommission / 1000).toFixed(1)}K
            </span>
          </div>
        </div>

        {/* Average Rate */}
        <div className="bg-white border border-grey-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-grey-500 uppercase tracking-wider mb-2">
              Avg Rate
            </span>
            <span className="text-2xl font-bold text-grey-900">
              {summary.averageCommissionRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
