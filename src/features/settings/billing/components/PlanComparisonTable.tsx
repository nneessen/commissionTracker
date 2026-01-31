// src/features/settings/billing/components/PlanComparisonTable.tsx
// Displays a comparison table of all subscription plans

import React, { useMemo } from "react";
import { Check, X, Layers } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSubscriptionPlans, useSubscription } from "@/hooks/subscription";
import { cn } from "@/lib/utils";
import {
  FEATURE_REGISTRY,
  FEATURE_CATEGORIES,
  getFeaturesByCategory,
  type FeatureCategory,
  type FeatureDefinition,
} from "@/constants/features";

// Utility function for formatting price
const formatPrice = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

// Features to exclude from display (universal to all plans)
const EXCLUDED_FEATURES = new Set(["settings"]);

// Features that show email limit
const EMAIL_LIMIT_FEATURES = new Set(["email"]);

// Category display order
const CATEGORY_ORDER: FeatureCategory[] = [
  "core",
  "tracking",
  "reports",
  "team",
  "messaging",
  "branding",
];

// Analytics sections available by tier (3-tier system)
const analyticsCountByTier: Record<string, number> = {
  free: 3,
  pro: 9,
  team: 9,
};

interface FeatureGroup {
  category: FeatureCategory;
  label: string;
  features: FeatureDefinition[];
}

export function PlanComparisonTable() {
  const { plans, isLoading } = useSubscriptionPlans();
  const { subscription } = useSubscription();

  const currentPlanName = subscription?.plan?.name || "free";

  // Build feature groups dynamically from registry
  const featureGroups = useMemo<FeatureGroup[]>(() => {
    const byCategory = getFeaturesByCategory();

    return CATEGORY_ORDER.map((category) => ({
      category,
      label: FEATURE_CATEGORIES[category].label,
      features: byCategory[category].filter(
        (f) => !EXCLUDED_FEATURES.has(f.key)
      ),
    })).filter((group) => group.features.length > 0);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/4" />
          <div className="h-40 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <Layers className="h-3.5 w-3.5 text-zinc-400" />
        <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
          Compare Plans
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <TableHead className="text-[11px] font-semibold w-40">
                Feature
              </TableHead>
              {plans.map((plan) => (
                <TableHead
                  key={plan.id}
                  className={cn(
                    "text-[11px] font-semibold text-center min-w-[80px]",
                    plan.name === currentPlanName &&
                      "bg-zinc-100 dark:bg-zinc-800"
                  )}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    {plan.name === currentPlanName && (
                      <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                        CURRENT
                      </span>
                    )}
                    <span>{plan.display_name}</span>
                    <span className="text-[10px] font-normal text-zinc-500">
                      {plan.price_monthly === 0
                        ? "Free"
                        : `${formatPrice(plan.price_monthly)}/mo`}
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {/* Analytics Row */}
            <TableRow className="bg-zinc-50/50 dark:bg-zinc-800/30">
              <TableCell className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                Analytics Sections
              </TableCell>
              {plans.map((plan) => (
                <TableCell
                  key={`analytics-${plan.id}`}
                  className={cn(
                    "text-[11px] text-center font-medium",
                    plan.name === currentPlanName &&
                      "bg-zinc-100/50 dark:bg-zinc-800/50"
                  )}
                >
                  {analyticsCountByTier[plan.name] || 0}/9
                </TableCell>
              ))}
            </TableRow>

            {/* Feature Groups */}
            {featureGroups.map((group) => (
              <React.Fragment key={group.category}>
                {/* Group Header */}
                <TableRow className="bg-zinc-100/50 dark:bg-zinc-800/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50">
                  <TableCell
                    colSpan={plans.length + 1}
                    className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide py-1"
                  >
                    {group.label}
                  </TableCell>
                </TableRow>

                {/* Features */}
                {group.features.map((feature) => (
                  <TableRow key={feature.key}>
                    <TableCell className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      {feature.displayName}
                    </TableCell>
                    {plans.map((plan) => {
                      const hasFeature =
                        plan.features[
                          feature.key as keyof typeof plan.features
                        ];
                      const emailLimit =
                        EMAIL_LIMIT_FEATURES.has(feature.key) &&
                        plan.email_limit > 0
                          ? plan.email_limit
                          : null;

                      return (
                        <TableCell
                          key={`${feature.key}-${plan.id}`}
                          className={cn(
                            "text-center",
                            plan.name === currentPlanName &&
                              "bg-zinc-100/50 dark:bg-zinc-800/50"
                          )}
                        >
                          {hasFeature ? (
                            <div className="flex flex-col items-center">
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                              {emailLimit && (
                                <span className="text-[9px] text-zinc-500">
                                  {emailLimit}/mo
                                </span>
                              )}
                            </div>
                          ) : (
                            <X className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-600 mx-auto" />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800">
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
          Training Hub and Admin access are role-based, not tier-based. Annual
          billing saves ~17%.
        </p>
      </div>
    </div>
  );
}
