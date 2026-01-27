// src/features/settings/billing/BillingTab.tsx
// Main billing tab component

import { useState } from "react";
import {
  CreditCard,
  ExternalLink,
  Receipt,
  Loader2,
  Check,
  Tag,
} from "lucide-react";
import { CurrentPlanCard } from "./components/CurrentPlanCard";
import { UsageOverview } from "./components/UsageOverview";
import { PlanComparisonTable } from "./components/PlanComparisonTable";
import { PremiumAddonsSection } from "./components/PremiumAddonsSection";
import {
  useSubscription,
  useSubscriptionPlans,
  subscriptionService,
} from "@/hooks/subscription";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function BillingTab() {
  const { user, supabaseUser } = useAuth();
  const { subscription, isGrandfathered } = useSubscription();

  // Use supabaseUser.email directly as it comes from Supabase session
  const userEmail = supabaseUser?.email || user?.email || "";
  const { plans } = useSubscriptionPlans();
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [discountCode, setDiscountCode] = useState<string>("");

  // All plans come from useSubscriptionPlans hook (fetched from database)

  // Handle plan change click
  const handlePlanChange = async () => {
    if (!selectedPlan || !user?.id || !userEmail) return;

    const plan = plans.find((p) => p.id === selectedPlan);
    if (!plan) return;

    // If selecting Free plan, direct to customer portal to cancel
    if (!subscriptionService.isPaidPlan(plan)) {
      // If they have an active Lemon Squeezy subscription, send to portal to cancel
      if (subscription?.lemon_subscription_id) {
        const portalUrl = await subscriptionService.getCustomerPortalUrl(
          user.id,
        );
        if (portalUrl) {
          window.open(portalUrl, "_blank");
        }
      }
      return;
    }

    // For paid plans, generate checkout URL with optional discount code
    const checkoutUrl = subscriptionService.generateCheckoutUrl(
      plan,
      user.id,
      userEmail,
      billingInterval,
      discountCode || undefined,
    );

    if (checkoutUrl) {
      window.open(checkoutUrl, "_blank");
    }
  };

  // Handle manage subscription click
  const handleManageSubscription = async () => {
    if (!user?.id) return;

    setIsLoadingPortal(true);
    try {
      const portalUrl = await subscriptionService.getCustomerPortalUrl(user.id);
      if (portalUrl) {
        window.open(portalUrl, "_blank");
      }
    } finally {
      setIsLoadingPortal(false);
    }
  };

  // Check if user has an active paid subscription (not grandfathered)
  const hasActivePayment =
    subscription?.lemon_subscription_id && !isGrandfathered;

  return (
    <div className="space-y-3 pb-4">
      {/* Top Section: Current Plan + Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <CurrentPlanCard />
        <UsageOverview />
      </div>

      {/* Manage Subscription */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
          <CreditCard className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
            Manage Subscription
          </span>
        </div>
        <div className="p-3 space-y-3">
          {/* Plan Selection Cards */}
          {plans.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {isGrandfathered
                  ? "Subscribe before your free access expires to keep your features."
                  : "Select a plan to change your subscription."}
              </p>

              {/* Plan Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {plans
                  .filter((plan) => {
                    // Hide Free option unless user has an active Lemon subscription (something to cancel)
                    if (!subscriptionService.isPaidPlan(plan)) {
                      return !!subscription?.lemon_subscription_id;
                    }
                    return true;
                  })
                  .map((plan) => {
                    const isCurrentPlan = subscription?.plan?.id === plan.id;
                    const isSelected = selectedPlan === plan.id;
                    const isPaid = subscriptionService.isPaidPlan(plan);

                    return (
                      <button
                        key={plan.id}
                        onClick={() =>
                          !isCurrentPlan && setSelectedPlan(plan.id)
                        }
                        disabled={isCurrentPlan}
                        className={cn(
                          "relative p-2 rounded-lg border text-left transition-all",
                          isCurrentPlan
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 cursor-default"
                            : isSelected
                              ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800"
                              : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600",
                        )}
                      >
                        {isCurrentPlan && (
                          <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Check className="h-2 w-2" />
                            Current
                          </span>
                        )}
                        <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
                          {plan.display_name}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {isPaid
                            ? `${subscriptionService.formatPrice(plan.price_monthly)}/mo`
                            : "Free forever"}
                        </div>
                      </button>
                    );
                  })}
              </div>

              {/* Billing Interval + Discount Code + Action */}
              {selectedPlan && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                  {(() => {
                    const selectedPlanData = plans.find(
                      (p) => p.id === selectedPlan,
                    );
                    const isPaidPlan =
                      selectedPlanData &&
                      subscriptionService.isPaidPlan(selectedPlanData);

                    return (
                      <>
                        {isPaidPlan && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Billing Interval Toggle */}
                            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5">
                              <button
                                onClick={() => setBillingInterval("monthly")}
                                className={cn(
                                  "px-2 py-1 text-[10px] rounded transition-colors",
                                  billingInterval === "monthly"
                                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
                                )}
                              >
                                Monthly
                              </button>
                              <button
                                onClick={() => setBillingInterval("annual")}
                                className={cn(
                                  "px-2 py-1 text-[10px] rounded transition-colors",
                                  billingInterval === "annual"
                                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
                                )}
                              >
                                Annual{" "}
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  (-17%)
                                </span>
                              </button>
                            </div>

                            {/* Discount Code Input */}
                            <div className="flex items-center gap-1">
                              <Tag className="h-3 w-3 text-zinc-400" />
                              <Input
                                type="text"
                                placeholder="Discount code"
                                value={discountCode}
                                onChange={(e) =>
                                  setDiscountCode(e.target.value.toUpperCase())
                                }
                                className="h-7 w-28 text-[10px] px-2 uppercase"
                              />
                            </div>
                          </div>
                        )}
                        <Button
                          size="sm"
                          className="h-7 text-[10px] bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
                          onClick={handlePlanChange}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {isPaidPlan ? "Subscribe" : "Cancel Subscription"}
                        </Button>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Manage Existing Subscription */}
          {hasActivePayment && (
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Manage your subscription, update payment method, or view
                invoices.
              </p>
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
            </div>
          )}

          {/* Setup Notice for New Users */}
          {!hasActivePayment && plans.length === 0 && (
            <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded text-[10px] text-zinc-500 dark:text-zinc-400">
              You're on the highest tier. Thank you for your support!
            </div>
          )}
        </div>
      </div>

      {/* Premium Add-ons */}
      <PremiumAddonsSection />

      {/* Plan Comparison */}
      <PlanComparisonTable />

      {/* FAQ */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
            FAQ
          </span>
        </div>
        <div className="p-3 space-y-2">
          <FaqItem
            q="What happens when grandfathered period ends?"
            a="You'll move to Free tier unless you subscribe. All data is preserved."
          />
          <FaqItem
            q="What if I exceed my email limit?"
            a="You can keep sending. Overages charged at $5/500 emails on your next invoice."
          />
          <FaqItem
            q="What's in the Team tier?"
            a="Visibility into all connected downlines, recruiting pipeline, override tracking. Flat $50/mo regardless of team size."
          />
          <FaqItem
            q="Do my downlines need to pay?"
            a="Each person manages their own subscription. If you have Team tier, you see their data regardless of their tier."
          />
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0">
      <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
        {q}
      </p>
      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{a}</p>
    </div>
  );
}
