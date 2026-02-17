// src/features/billing/components/PremiumAddonsSection.tsx
// Section for purchasing premium add-ons like UW Wizard with tier selection

import { useState } from "react";
import {
  Sparkles,
  Check,
  ExternalLink,
  Loader2,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAdminSubscriptionAddons,
  type SubscriptionAddon,
  type AddonTierConfig,
  type AddonTier,
} from "@/hooks/admin";
import { useUnderwritingFeatureFlag, useUWWizardUsage } from "@/features/underwriting";
import { subscriptionService } from "@/services/subscription";

interface TierWithAddon extends AddonTier {
  addonId: string;
}

export function PremiumAddonsSection() {
  const { user } = useAuth();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [selectedTierId, setSelectedTierId] = useState<string>("professional");

  // Get available add-ons (only show active ones)
  const { data: allAddons, isLoading: addonsLoading } =
    useAdminSubscriptionAddons();
  const addons = allAddons?.filter((a) => a.is_active);

  // Check UW Wizard access and usage
  const { isEnabled: hasUwWizard, accessSource } = useUnderwritingFeatureFlag();
  const { data: uwUsage } = useUWWizardUsage();

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getTierConfig = (addon: SubscriptionAddon): AddonTierConfig | null => {
    const raw = (addon as { tier_config?: AddonTierConfig | null }).tier_config;
    if (!raw || !raw.tiers || raw.tiers.length === 0) return null;
    return raw;
  };

  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const handlePurchaseTier = async (tier: TierWithAddon) => {
    if (!user?.id) return;

    const priceId =
      billingInterval === "annual"
        ? tier.stripe_price_id_annual
        : tier.stripe_price_id_monthly;

    if (!priceId) return;

    setIsCheckoutLoading(true);
    try {
      const url = await subscriptionService.createAddonCheckoutSession(
        priceId,
        tier.addonId,
        tier.id,
      );
      if (url) window.open(url, "_blank");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handlePurchaseAddon = async (addon: SubscriptionAddon) => {
    if (!user?.id) return;

    const priceId =
      billingInterval === "annual"
        ? addon.stripe_price_id_annual
        : addon.stripe_price_id_monthly;

    if (!priceId) return;

    setIsCheckoutLoading(true);
    try {
      const url = await subscriptionService.createAddonCheckoutSession(
        priceId,
        addon.id,
      );
      if (url) window.open(url, "_blank");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  if (addonsLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
          <Sparkles className="h-3.5 w-3.5 text-purple-500" />
          <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
            Premium Add-ons
          </span>
        </div>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        </div>
      </div>
    );
  }

  if (!addons || addons.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
        <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
          Premium Add-ons
        </span>
      </div>
      <div className="p-3">
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-3">
          Enhance your experience with premium features that work alongside any
          subscription plan.
        </p>

        <div className="space-y-4">
          {addons.map((addon) => {
            const isUwWizard = addon.name === "uw_wizard";
            const hasAccess = isUwWizard && hasUwWizard;
            const tierConfig = getTierConfig(addon);
            const hasTiers = tierConfig && tierConfig.tiers.length > 0;

            // For tiered addons with access, show current usage
            if (hasAccess && isUwWizard) {
              return (
                <div
                  key={addon.id}
                  className="relative p-3 rounded-lg border border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/20"
                >
                  <div className="absolute -top-2 right-3">
                    <Badge className="bg-purple-500 text-white text-[9px] px-1.5">
                      <Check className="h-2.5 w-2.5 mr-0.5" />
                      {accessSource === "super_admin"
                        ? "Admin Access"
                        : accessSource === "manual_grant"
                          ? "Granted"
                          : "Active"}
                    </Badge>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                      <Wand2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {addon.display_name}
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {addon.description}
                      </p>

                      {/* Usage Display */}
                      {uwUsage && (
                        <div className="mt-3 p-2 bg-white dark:bg-zinc-800 rounded border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                              {uwUsage.tier_name} Tier
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {uwUsage.runs_used} / {uwUsage.runs_limit} runs
                            </span>
                          </div>
                          <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                uwUsage.usage_percent >= 90
                                  ? "bg-red-500"
                                  : uwUsage.usage_percent >= 75
                                    ? "bg-amber-500"
                                    : "bg-purple-500",
                              )}
                              style={{ width: `${Math.min(uwUsage.usage_percent, 100)}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-zinc-400 mt-1">
                            {uwUsage.runs_remaining} runs remaining this month
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // For tiered addons without access, show tier selection
            if (hasTiers && isUwWizard) {
              const selectedTier = tierConfig.tiers.find(
                (t) => t.id === selectedTierId,
              ) || tierConfig.tiers[1]; // Default to middle tier

              const selectedTierWithAddon: TierWithAddon = {
                ...selectedTier,
                addonId: addon.id,
              };

              const hasVariantIds =
                selectedTier.stripe_price_id_monthly ||
                selectedTier.stripe_price_id_annual;

              return (
                <div
                  key={addon.id}
                  className="relative p-3 rounded-lg border border-zinc-200 dark:border-zinc-700"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                      <Wand2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {addon.display_name}
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {addon.description ||
                          "Advanced underwriting analysis with AI-powered recommendations."}
                      </p>
                    </div>
                  </div>

                  {/* Tier Selection */}
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Zap className="h-3 w-3 text-amber-500" />
                      <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                        Choose Your Plan
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {tierConfig.tiers.map((tier) => {
                        const isSelected = selectedTierId === tier.id;
                        const price =
                          billingInterval === "annual"
                            ? tier.price_annual / 12
                            : tier.price_monthly;

                        return (
                          <button
                            key={tier.id}
                            onClick={() => setSelectedTierId(tier.id)}
                            className={cn(
                              "p-2 rounded-lg border text-left transition-all",
                              isSelected
                                ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                                : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600",
                            )}
                          >
                            <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
                              {tier.name}
                            </div>
                            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                              {formatPrice(price)}
                              <span className="text-[9px] font-normal text-zinc-500">
                                /mo
                              </span>
                            </div>
                            <div className="text-[9px] text-zinc-500 dark:text-zinc-400">
                              {tier.runs_per_month.toLocaleString()} runs/mo
                            </div>
                            {isSelected && (
                              <div className="mt-1">
                                <Badge className="text-[8px] bg-purple-500 text-white">
                                  Selected
                                </Badge>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Features for selected tier */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      AI Analysis
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      Carrier Matching
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      Health Class Prediction
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
                      {selectedTier.runs_per_month.toLocaleString()} runs/month
                    </span>
                  </div>

                  {/* Action Area */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    {/* Billing Toggle */}
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5">
                      <button
                        onClick={() => setBillingInterval("monthly")}
                        className={cn(
                          "px-2 py-1 text-[10px] rounded transition-colors",
                          billingInterval === "monthly"
                            ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                            : "text-zinc-500 dark:text-zinc-400",
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
                            : "text-zinc-500 dark:text-zinc-400",
                        )}
                      >
                        Annual{" "}
                        {selectedTier.price_annual > 0 &&
                          selectedTier.price_monthly > 0 && (
                            <span className="text-emerald-600">
                              (-
                              {Math.round(
                                (1 -
                                  selectedTier.price_annual /
                                    (selectedTier.price_monthly * 12)) *
                                  100,
                              )}
                              %)
                            </span>
                          )}
                      </button>
                    </div>

                    {/* Purchase Button */}
                    {hasVariantIds ? (
                      <Button
                        size="sm"
                        className="h-7 text-[10px] bg-purple-600 hover:bg-purple-700"
                        onClick={() => handlePurchaseTier(selectedTierWithAddon)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Subscribe to {selectedTier.name}
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-[9px]">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                </div>
              );
            }

            // For non-tiered addons, show original simple display
            const hasVariantIds =
              addon.stripe_price_id_monthly || addon.stripe_price_id_annual;

            return (
              <div
                key={addon.id}
                className={cn(
                  "relative p-3 rounded-lg border",
                  hasAccess
                    ? "border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/20"
                    : "border-zinc-200 dark:border-zinc-700",
                )}
              >
                {hasAccess && (
                  <div className="absolute -top-2 right-3">
                    <Badge className="bg-purple-500 text-white text-[9px] px-1.5">
                      <Check className="h-2.5 w-2.5 mr-0.5" />
                      Active
                    </Badge>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <Wand2 className="h-5 w-5 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {addon.display_name}
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {addon.description}
                    </p>
                  </div>

                  {!hasAccess && (
                    <div className="flex-shrink-0 text-right">
                      <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        {formatPrice(
                          billingInterval === "annual"
                            ? addon.price_annual / 12
                            : addon.price_monthly,
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500">/month</div>
                    </div>
                  )}
                </div>

                {!hasAccess && (
                  <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5">
                      <button
                        onClick={() => setBillingInterval("monthly")}
                        className={cn(
                          "px-2 py-1 text-[10px] rounded transition-colors",
                          billingInterval === "monthly"
                            ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                            : "text-zinc-500 dark:text-zinc-400",
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
                            : "text-zinc-500 dark:text-zinc-400",
                        )}
                      >
                        Annual
                      </button>
                    </div>

                    {hasVariantIds ? (
                      <Button
                        size="sm"
                        className="h-7 text-[10px] bg-purple-600 hover:bg-purple-700"
                        onClick={() => handlePurchaseAddon(addon)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Purchase Add-on
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-[9px]">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
