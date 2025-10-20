// src/features/dashboard/components/ActivityFeed.tsx

import React from "react";
import { Clock, FileText, DollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "../../../lib/format";
import { cn } from "@/lib/utils";

interface RecentPolicy {
  id: string;
  policyNumber: string;
  clientName: string;
  annualPremium: number;
  product: string;
  createdAt: Date;
}

interface RecentCommission {
  id: string;
  amount: number;
  product: string;
  status: string;
  paidDate?: Date;
  createdAt: Date;
}

interface ActivityFeedProps {
  recentPolicies: RecentPolicy[];
  recentCommissions: RecentCommission[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  recentPolicies,
  recentCommissions,
}) => {
  const formatProductName = (product: string) => {
    return product
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const hasActivity =
    (recentPolicies && recentPolicies.length > 0) ||
    (recentCommissions && recentCommissions.length > 0);

  return (
    <div className="bg-gradient-to-br from-card to-muted/20 rounded-lg p-6 shadow-md">
      {/* Header Section */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-3 rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-md">
          <Clock size={24} className="text-card" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground m-0">
            Recent Activity
          </h3>
          <p className="text-sm text-muted-foreground m-0">
            Latest policies and commissions
          </p>
        </div>
      </div>

      {/* Empty State */}
      {!hasActivity ? (
        <div className="text-center py-10 px-5">
          <div className="text-5xl mb-4">📊</div>
          <div className="text-base text-muted-foreground mb-2 font-medium">
            No recent activity
          </div>
          <div className="text-sm text-muted-foreground/60">
            Start adding policies to see your activity here
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent Policies */}
          {recentPolicies && recentPolicies.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                <FileText size={16} className="text-foreground" />
                <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Recent Policies
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {recentPolicies.slice(0, 5).map((policy) => (
                  <div
                    key={policy.id}
                    className="p-3 rounded-md bg-gradient-to-br from-muted/20 to-muted/50 shadow-sm transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div>
                        <div className="text-sm font-semibold text-foreground mb-0.5">
                          {policy.clientName}
                        </div>
                        <div className="text-xs text-muted-foreground/80">
                          {policy.policyNumber}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-foreground font-mono">
                        {formatCurrency(policy.annualPremium)}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-card">
                        {formatProductName(policy.product)}
                      </div>
                      <div className="text-xs text-muted-foreground/60">
                        {formatDate(policy.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Commissions */}
          {recentCommissions && recentCommissions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                <DollarSign size={16} className="text-foreground" />
                <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Recent Commissions
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {recentCommissions.slice(0, 5).map((commission) => (
                  <div
                    key={commission.id}
                    className={cn(
                      "p-3 rounded-md shadow-sm transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
                      commission.status === "paid"
                        ? "bg-gradient-to-br from-green-50 to-green-100"
                        : "bg-gradient-to-br from-blue-50 to-blue-100",
                    )}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div>
                        <div className="text-sm font-bold text-foreground font-mono">
                          {formatCurrency(commission.amount)}
                        </div>
                        <div className="text-xs text-muted-foreground/80">
                          {formatProductName(commission.product)}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "text-xs px-2 py-0.5 rounded font-semibold uppercase",
                          commission.status === "paid"
                            ? "text-green-700 bg-green-100"
                            : "text-blue-700 bg-blue-100",
                        )}
                      >
                        {commission.status}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground/60">
                      {commission.paidDate
                        ? formatDate(commission.paidDate)
                        : formatDate(commission.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
