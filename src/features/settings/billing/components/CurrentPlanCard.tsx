// src/features/settings/billing/components/CurrentPlanCard.tsx
// Compact plan status bar showing current plan, status, and manage button

import { useState } from "react";
import {
  Crown,
  CheckCircle2,
  AlertTriangle,
  Gift,
  Calendar,
  Loader2,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, subscriptionService } from "@/hooks/subscription";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function CurrentPlanCard() {
  const { user } = useAuth();
  const {
    subscription,
    isLoading,
    isActive,
    isGrandfathered,
    grandfatherDaysRemaining,
    tierName,
  } = useSubscription();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const hasActivePayment =
    subscription?.stripe_subscription_id && !isGrandfathered;

  const handleManageSubscription = async () => {
    if (!user?.id) return;
    setIsLoadingPortal(true);
    try {
      const portalUrl = await subscriptionService.createPortalSession(user.id);
      if (portalUrl) window.open(portalUrl, "_blank");
    } finally {
      setIsLoadingPortal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2">
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-24" />
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-16" />
        </div>
      </div>
    );
  }

  const price = subscription?.plan?.price_monthly || 0;
  const billingInterval = subscription?.billing_interval || "monthly";

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      {/* Main status row */}
      <div className="flex items-center justify-between px-3 py-2 gap-3 flex-wrap">
        {/* Left: Plan info */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-[12px] font-bold text-zinc-900 dark:text-zinc-100">
              {tierName}
            </span>
          </div>

          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {price === 0
              ? "Free"
              : `${subscriptionService.formatPrice(price)}/${billingInterval === "annual" ? "yr" : "mo"}`}
          </span>

          {/* Status badge */}
          <div
            className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium",
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

          {/* Renewal / Expiry date */}
          {subscription?.current_period_end && !isGrandfathered && (
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
              <Calendar className="h-2.5 w-2.5" />
              <span>
                {subscription.cancel_at_period_end ? "Expires" : "Renews"}{" "}
                {new Date(subscription.current_period_end).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" },
                )}
              </span>
            </div>
          )}
        </div>

        {/* Right: Manage button */}
        {hasActivePayment && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px]"
            onClick={handleManageSubscription}
            disabled={isLoadingPortal}
          >
            {isLoadingPortal ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Receipt className="h-3 w-3 mr-1" />
            )}
            Manage Subscription
          </Button>
        )}
      </div>

      {/* Grandfathered notice */}
      {isGrandfathered && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800/50">
          <Gift className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-[10px] text-amber-700 dark:text-amber-400">
            Grandfathered {tierName} access —{" "}
            <span className="font-semibold">
              {grandfatherDaysRemaining} days remaining
            </span>
            . Subscribe before expiration to keep features.
          </p>
        </div>
      )}
    </div>
  );
}
