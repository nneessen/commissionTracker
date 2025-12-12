// src/features/policies/components/PolicyDashboardHeader.tsx

import React from "react";
import {Plus, Calendar} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";

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
 * Displays 6 metrics in a 2×3 grid layout with actual commission data
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

      {/* Date Range Label */}
      {summary.dateRangeLabel && (
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} className="text-muted-foreground" />
          <Badge variant="secondary" className="text-xs font-medium">
            {summary.dateRangeLabel}
          </Badge>
        </div>
      )}
      {!summary.dateRangeLabel && (
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Showing: All Policies
          </span>
        </div>
      )}

      {/* Stats Grid - 2x3 Layout */}
      <div className="grid grid-cols-3 gap-4">
        {/* Row 1 - Policy Counts */}

        {/* Total Policies */}
        <Card className="bg-gradient-to-br from-accent/10 to-card shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Total
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

        {/* Pending Policies */}
        <Card className="bg-gradient-to-br from-warning/20 via-status-pending/10 to-card shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-warning uppercase tracking-wider mb-2">
                Pending
              </span>
              <span className="text-2xl font-bold text-warning font-mono">
                {summary.pendingPolicies}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Row 2 - Financial Metrics */}

        {/* Annual Premium */}
        <Card className="bg-gradient-to-br from-status-earned/20 via-info/10 to-card shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-status-earned uppercase tracking-wider mb-2">
                Annual Premium
              </span>
              <span className="text-2xl font-bold text-status-earned font-mono">
                ${(summary.totalAnnualPremium / 1000).toFixed(1)}K
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Paid Commissions */}
        <Card className="bg-gradient-to-br from-success/20 via-status-active/10 to-card shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-success uppercase tracking-wider mb-2">
                Paid Commissions
              </span>
              <span className="text-2xl font-bold text-success font-mono">
                ${(summary.totalPaidCommission / 1000).toFixed(1)}K
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Pending Commissions */}
        <Card className="bg-gradient-to-br from-info/20 via-primary/10 to-card shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-info uppercase tracking-wider mb-2">
                Pending Commissions
              </span>
              <span className="text-2xl font-bold text-info font-mono">
                ${(summary.totalPendingCommission / 1000).toFixed(1)}K
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
