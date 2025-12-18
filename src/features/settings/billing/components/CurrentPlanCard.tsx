// src/features/settings/billing/components/CurrentPlanCard.tsx
// Displays the user's current subscription plan and status

import {
  Crown,
  CheckCircle2,
  AlertTriangle,
  Gift,
  Calendar,
} from "lucide-react";
import { useSubscription } from "@/hooks/subscription";
import { subscriptionService } from "@/services/subscription";
import { cn } from "@/lib/utils";

export function CurrentPlanCard() {
  const {
    subscription,
    isLoading,
    isActive,
    isGrandfathered,
    grandfatherDaysRemaining,
    tierName,
  } = useSubscription();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3" />
          <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3" />
        </div>
      </div>
    );
  }

  const price = subscription?.plan?.price_monthly || 0;
  const billingInterval = subscription?.billing_interval || "monthly";

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <Crown className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
            Current Plan
          </span>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
            isActive
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
          )}
        >
          {isActive ? (
            <>
              <CheckCircle2 className="h-2.5 w-2.5" />
              Active
            </>
          ) : (
            <>
              <AlertTriangle className="h-2.5 w-2.5" />
              Inactive
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Plan Name & Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {tierName}
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {price === 0
              ? "Free"
              : `${subscriptionService.formatPrice(price)}/${billingInterval === "annual" ? "year" : "mo"}`}
          </span>
        </div>

        {/* Description */}
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
          {subscription?.plan?.description ||
            "Basic access to track your business"}
        </p>

        {/* Grandfathered Notice */}
        {isGrandfathered && (
          <div className="flex items-start gap-1.5 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800/50">
            <Gift className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-[10px]">
              <p className="font-medium text-amber-800 dark:text-amber-300">
                Grandfathered Access
              </p>
              <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                Free {tierName} access for{" "}
                <span className="font-semibold">
                  {grandfatherDaysRemaining} days
                </span>
                . Subscribe before expiration to keep features.
              </p>
            </div>
          </div>
        )}

        {/* Billing Period */}
        {subscription?.current_period_end && !isGrandfathered && (
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
            <Calendar className="h-3 w-3" />
            <span>
              {subscription.cancel_at_period_end ? "Access until" : "Renews"}{" "}
              {new Date(subscription.current_period_end).toLocaleDateString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                },
              )}
            </span>
          </div>
        )}

        {/* Features Summary */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
            Included Features
          </p>
          <div className="flex flex-wrap gap-1">
            {subscription?.plan?.features?.dashboard && (
              <FeatureTag>Dashboard</FeatureTag>
            )}
            {subscription?.plan?.features?.policies && (
              <FeatureTag>Policies</FeatureTag>
            )}
            {subscription?.plan?.features?.expenses && (
              <FeatureTag>Expenses</FeatureTag>
            )}
            {subscription?.plan?.features?.targets_full && (
              <FeatureTag>Full Targets</FeatureTag>
            )}
            {subscription?.plan?.features?.targets_basic &&
              !subscription?.plan?.features?.targets_full && (
                <FeatureTag>Basic Targets</FeatureTag>
              )}
            {subscription?.plan?.features?.reports_export && (
              <FeatureTag>Reports + Export</FeatureTag>
            )}
            {subscription?.plan?.features?.reports_view &&
              !subscription?.plan?.features?.reports_export && (
                <FeatureTag>Reports (View)</FeatureTag>
              )}
            {subscription?.plan?.features?.email && (
              <FeatureTag>Email</FeatureTag>
            )}
            {subscription?.plan?.features?.sms && <FeatureTag>SMS</FeatureTag>}
            {subscription?.plan?.features?.hierarchy && (
              <FeatureTag>Team Visibility</FeatureTag>
            )}
            {subscription?.plan?.features?.recruiting && (
              <FeatureTag>Recruiting</FeatureTag>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
      {children}
    </span>
  );
}
