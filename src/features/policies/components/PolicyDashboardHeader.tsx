// src/features/policies/components/PolicyDashboardHeader.tsx

import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Policy Management
        </h1>
        <Button
          onClick={onNewPolicy}
          size="sm"
        >
          <Plus size={16} className="mr-1.5" />
          New Policy
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-4">
        {/* Total Policies */}
        <Card className="bg-gradient-to-br from-accent/10 to-card shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Total Policies
              </span>
              <span className="text-2xl font-bold text-foreground font-mono">
                {summary.totalPolicies}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Active Policies */}
        <Card className="bg-gradient-to-br from-primary/20 via-info/10 to-card shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-primary uppercase tracking-wider mb-2">
                Active
              </span>
              <span className="text-2xl font-bold text-primary font-mono">
                {summary.activePolicies}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Premium */}
        <Card className="bg-gradient-to-br from-status-earned/20 via-info/10 to-card shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-status-earned uppercase tracking-wider mb-2">
                Total Premium
              </span>
              <span className="text-2xl font-bold text-status-earned font-mono">
                ${(summary.totalAnnualPremium / 1000).toFixed(1)}K
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Expected Commission */}
        <Card className="bg-gradient-to-br from-success/20 via-status-active/10 to-card shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-success uppercase tracking-wider mb-2">
                Commission
              </span>
              <span className="text-2xl font-bold text-success font-mono">
                ${(summary.totalExpectedCommission / 1000).toFixed(1)}K
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Average Rate */}
        <Card className="bg-gradient-to-br from-warning/20 via-status-pending/10 to-card shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-warning uppercase tracking-wider mb-2">
                Avg Rate
              </span>
              <span className="text-2xl font-bold text-warning font-mono">
                {summary.averageCommissionRate.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
