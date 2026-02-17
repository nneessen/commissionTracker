// src/features/billing/components/PricingCards.tsx
// Hero pricing columns driven by DB feature matrix

import { useState } from "react";
import { Check, ExternalLink, Loader2, Star, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useSubscription,
  useSubscriptionPlans,
  subscriptionService,
} from "@/hooks/subscription";
import { useAuth } from "@/contexts/AuthContext";
import { useImo } from "@/contexts/ImoContext";
import { FEATURE_REGISTRY } from "@/constants/features";
import type { SubscriptionPlan, SubscriptionFeatures } from "@/services/subscription";

/** Features hidden from pricing cards (universal to all plans) */
const EXCLUDED_FEATURES = new Set(["settings", "connect_upline"]);

/** Ordered plan names for "Everything in X, plus:" logic */
const PLAN_ORDER = ["free", "pro", "team"] as const;

/**
 * Get the human-readable features list for a plan,
 * showing only incremental features vs the previous tier.
 */
function getIncrementalFeatures(
  plan: SubscriptionPlan,
  plans: SubscriptionPlan[],
): { inherited: string | null; features: string[] } {
  const planIndex = PLAN_ORDER.indexOf(
    plan.name as (typeof PLAN_ORDER)[number],
  );
  const previousPlan =
    planIndex > 0
      ? plans.find((p) => p.name === PLAN_ORDER[planIndex - 1])
      : null;

  const features: string[] = [];
  const featureKeys = Object.keys(plan.features) as (keyof SubscriptionFeatures)[];

  for (const key of featureKeys) {
    if (EXCLUDED_FEATURES.has(key)) continue;
    if (!plan.features[key]) continue;

    // If previous tier already has it, skip (it's inherited)
    if (previousPlan?.features[key]) continue;

    const registry = FEATURE_REGISTRY[key];
    if (!registry) continue;

    let label = registry.displayName;

    // Add email limit annotation
    if (key === "email" && plan.email_limit > 0) {
      label = `${label} (${plan.email_limit.toLocaleString()}/mo)`;
    }

    features.push(label);
  }

  // Add analytics count
  const analyticsCount = plan.analytics_sections?.length || 0;
  const prevAnalyticsCount = previousPlan?.analytics_sections?.length || 0;
  if (analyticsCount > prevAnalyticsCount) {
    features.push(`${analyticsCount}/9 Analytics Sections`);
  }

  const inherited = previousPlan ? previousPlan.display_name : null;
  return { inherited, features };
}

interface PricingCardsProps {
  /** When provided, intercepts plan selection (for upsell dialog flow) */
  onPlanSelect?: (
    plan: SubscriptionPlan,
    billingInterval: "monthly" | "annual",
    discountCode?: string,
  ) => void;
}

export function PricingCards({ onPlanSelect }: PricingCardsProps = {}) {
  const { user, supabaseUser } = useAuth();
  const userEmail = supabaseUser?.email || user?.email || "";
  const { isSuperAdmin } = useImo();
  const { subscription, isGrandfathered } = useSubscription();
  const { plans } = useSubscriptionPlans();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [discountCode, setDiscountCode] = useState("");
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const currentPlanId = subscription?.plan?.id;

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (!user?.id || !userEmail) return;

    // If selecting Free plan, direct to portal to cancel
    if (!subscriptionService.isPaidPlan(plan)) {
      if (subscription?.stripe_subscription_id) {
        setLoadingPlanId(plan.id);
        try {
          const portalUrl = await subscriptionService.createPortalSession(user.id);
          if (portalUrl) window.open(portalUrl, "_blank");
        } finally {
          setLoadingPlanId(null);
        }
      }
      return;
    }

    // If onPlanSelect callback provided, use it (for upsell dialog)
    if (onPlanSelect) {
      onPlanSelect(plan, billingInterval, discountCode || undefined);
      return;
    }

    setLoadingPlanId(plan.id);
    try {
      const checkoutUrl = await subscriptionService.createCheckoutSession(
        plan,
        billingInterval,
        discountCode || undefined,
      );
      if (checkoutUrl) window.open(checkoutUrl, "_blank");
    } finally {
      setLoadingPlanId(null);
    }
  };

  // Show all plans — Free tier is always visible for comparison
  const visiblePlans = plans;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="p-4">
        {/* Header + Billing Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Choose Your Plan
            </h2>
            {isGrandfathered && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                Subscribe before your free access expires to keep your features.
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={cn(
                "px-2.5 py-1 text-[10px] font-medium rounded transition-colors",
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
                "px-2.5 py-1 text-[10px] font-medium rounded transition-colors",
                billingInterval === "annual"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
              )}
            >
              Annual{" "}
              <span className="text-emerald-600 dark:text-emerald-400">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visiblePlans.map((plan) => {
            const isCurrent = !isSuperAdmin && plan.id === currentPlanId;
            const isPaid = subscriptionService.isPaidPlan(plan);
            const isPopular = plan.name === "pro";
            const isLoading = loadingPlanId === plan.id;
            const price = subscriptionService.getEffectiveMonthlyPrice(
              plan,
              billingInterval,
            );
            const { inherited, features } = getIncrementalFeatures(plan, plans);

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-lg border p-3 transition-all",
                  isCurrent
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : isPopular
                      ? "border-zinc-900 dark:border-zinc-100"
                      : "border-zinc-200 dark:border-zinc-700",
                )}
              >
                {/* Popular badge */}
                {isPopular && !isCurrent && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-0.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-semibold px-2 py-0.5 rounded-full">
                      <Star className="h-2.5 w-2.5" />
                      Popular
                    </span>
                  </div>
                )}

                {/* Current badge */}
                {isCurrent && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-0.5 bg-emerald-500 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full">
                      <Check className="h-2.5 w-2.5" />
                      Current Plan
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mt-1 mb-3">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {plan.display_name}
                  </h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                      {isPaid
                        ? subscriptionService.formatPrice(price)
                        : "$0"}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      /mo
                    </span>
                  </div>
                  {isPaid && billingInterval === "annual" && (
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Billed {subscriptionService.formatPrice(plan.price_annual)}
                      /year
                    </p>
                  )}
                  {!isPaid && (
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Free forever
                    </p>
                  )}
                </div>

                {/* Features list */}
                <div className="flex-1 space-y-1.5 mb-3">
                  {inherited && (
                    <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Everything in {inherited}, plus:
                    </p>
                  )}
                  {features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-1.5"
                    >
                      <Check className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-[10px] text-zinc-700 dark:text-zinc-300">
                        {feature}
                      </span>
                    </div>
                  ))}

                  {/* Team size note */}
                  {plan.team_size_limit === null && plan.name === "team" && (
                    <div className="flex items-start gap-1.5">
                      <Check className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-[10px] text-zinc-700 dark:text-zinc-300">
                        Unlimited team size
                      </span>
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <Button
                  size="sm"
                  className={cn(
                    "h-7 text-[10px] w-full",
                    isCurrent
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 cursor-default"
                      : isPaid
                        ? "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
                  )}
                  disabled={isCurrent || isLoading}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : isPaid ? (
                    <>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {subscription?.stripe_subscription_id ? "Change Plan" : "Get Started"}
                    </>
                  ) : (
                    "Downgrade"
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Discount Code */}
        {visiblePlans.some((p) => subscriptionService.isPaidPlan(p)) && (
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Tag className="h-3 w-3 text-zinc-400" />
            <Input
              type="text"
              placeholder="Discount code"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              className="h-7 w-32 text-[10px] px-2 uppercase"
            />
          </div>
        )}
      </div>
    </div>
  );
}
