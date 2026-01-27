// src/features/settings/billing/components/PremiumAddonsSection.tsx
// Section for purchasing premium add-ons like UW Wizard

import { useState } from "react";
import { Sparkles, Check, ExternalLink, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAdminSubscriptionAddons,
  type SubscriptionAddon,
} from "@/hooks/admin";
import { useUnderwritingFeatureFlag } from "@/features/underwriting";

export function PremiumAddonsSection() {
  const { user, supabaseUser } = useAuth();
  const userEmail = supabaseUser?.email || user?.email || "";
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">(
    "monthly",
  );

  // Get available add-ons (only show active ones)
  const { data: allAddons, isLoading: addonsLoading } =
    useAdminSubscriptionAddons();
  const addons = allAddons?.filter((a) => a.is_active);

  // Check UW Wizard access
  const { isEnabled: hasUwWizard, accessSource } = useUnderwritingFeatureFlag();

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const generateAddonCheckoutUrl = (
    addon: SubscriptionAddon,
  ): string | null => {
    if (!user?.id || !userEmail) return null;

    const variantId =
      billingInterval === "annual"
        ? addon.lemon_variant_id_annual
        : addon.lemon_variant_id_monthly;

    if (!variantId) return null;

    const LEMON_STORE_ID = import.meta.env.VITE_LEMON_SQUEEZY_STORE_ID || "";
    if (!LEMON_STORE_ID) return null;

    const checkoutUrl = new URL(
      `https://${LEMON_STORE_ID}.lemonsqueezy.com/buy/${variantId}`,
    );

    checkoutUrl.searchParams.set("checkout[email]", userEmail);
    checkoutUrl.searchParams.set("checkout[custom][user_id]", user.id);
    checkoutUrl.searchParams.set("checkout[custom][addon_id]", addon.id);

    const redirectUrl = `${window.location.origin}/settings?tab=billing&addon_checkout=success`;
    checkoutUrl.searchParams.set("checkout[redirect_url]", redirectUrl);

    return checkoutUrl.toString();
  };

  const handlePurchaseAddon = (addon: SubscriptionAddon) => {
    const checkoutUrl = generateAddonCheckoutUrl(addon);
    if (checkoutUrl) {
      window.open(checkoutUrl, "_blank");
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
    return null; // Don't show section if no add-ons
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

        <div className="space-y-3">
          {addons.map((addon) => {
            // Special handling for UW Wizard
            const isUwWizard = addon.name === "uw_wizard";
            const hasAccess = isUwWizard && hasUwWizard;
            const hasVariantIds =
              addon.lemon_variant_id_monthly || addon.lemon_variant_id_annual;

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
                      {accessSource === "super_admin"
                        ? "Admin Access"
                        : accessSource === "manual_grant"
                          ? "Granted"
                          : "Active"}
                    </Badge>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <Wand2 className="h-5 w-5 text-white" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {addon.display_name}
                      </h3>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {addon.description ||
                        "Advanced underwriting analysis with AI-powered recommendations."}
                    </p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        AI Analysis
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        Carrier Matching
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        Health Class Prediction
                      </span>
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="flex-shrink-0 text-right">
                    {!hasAccess && (
                      <>
                        <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                          {formatPrice(
                            billingInterval === "annual"
                              ? addon.price_annual / 12
                              : addon.price_monthly,
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          /month
                          {billingInterval === "annual" && (
                            <span className="text-emerald-600 ml-1">
                              (billed yearly)
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Action Area */}
                {!hasAccess && (
                  <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
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
                        {addon.price_annual > 0 && addon.price_monthly > 0 && (
                          <span className="text-emerald-600">
                            (-
                            {Math.round(
                              (1 -
                                addon.price_annual /
                                  (addon.price_monthly * 12)) *
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
