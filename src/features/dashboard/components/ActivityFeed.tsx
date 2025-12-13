// src/features/dashboard/components/ActivityFeed.tsx

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <Card className="bg-gradient-to-br from-card via-accent/5 to-card shadow-xl">
      <CardContent className="p-6">
        {/* Header Section */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-lg bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-lg">
            <Clock size={24} className="text-primary-foreground" />
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
                <div className="flex items-center gap-2 mb-3 pb-2">
                  <FileText size={16} className="text-info" />
                  <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Recent Policies
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {recentPolicies.slice(0, 5).map((policy) => (
                    <div
                      key={policy.id}
                      className="bg-gradient-to-r from-card to-info/5 shadow-md rounded-lg p-3 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <div>
                          <div className="text-sm font-semibold text-foreground mb-0.5">
                            {policy.clientName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {policy.policyNumber}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-success font-mono">
                          {formatCurrency(policy.annualPremium)}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <Badge
                          variant="secondary"
                          className="text-xs bg-info/20 text-info"
                        >
                          {formatProductName(policy.product)}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
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
                <div className="flex items-center gap-2 mb-3 pb-2">
                  <DollarSign size={16} className="text-success" />
                  <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Recent Commissions
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {recentCommissions.slice(0, 5).map((commission) => (
                    <div
                      key={commission.id}
                      className={cn(
                        "shadow-md rounded-lg p-3 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg",
                        commission.status === "paid"
                          ? "bg-gradient-to-r from-card to-success/10"
                          : "bg-gradient-to-r from-card to-warning/10",
                      )}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <div>
                          <div className="text-sm font-bold text-foreground font-mono">
                            {formatCurrency(commission.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatProductName(commission.product)}
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            "text-xs uppercase shadow-sm",
                            commission.status === "paid"
                              ? "bg-success text-primary-foreground"
                              : "bg-warning text-warning-foreground",
                          )}
                        >
                          {commission.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
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
      </CardContent>
    </Card>
  );
};
