// src/features/billing/components/AddonUpsellDialog.tsx
// Dialog shown when user selects a paid plan, offering premium add-ons before checkout

import { useState } from "react";
import {
  Wand2,
  Zap,
  ExternalLink,
  Loader2,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAdminSubscriptionAddons,
  type AddonTierConfig,
  type SubscriptionAddon,
} from "@/hooks/admin";
import { subscriptionService } from "@/services/subscription";
import type { SubscriptionPlan } from "@/services/subscription";

interface AddonUpsellDialogProps {
  plan: SubscriptionPlan | null;
  billingInterval: "monthly" | "annual";
  discountCode?: string;
  onClose: () => void;
}

export function AddonUpsellDialog({
  plan,
  billingInterval,
  discountCode,
  onClose,
}: AddonUpsellDialogProps) {
  const { user } = useAuth();
  const { data: allAddons } = useAdminSubscriptionAddons();
  const addons = allAddons?.filter((a) => a.is_active);

  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const open = !!plan;

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getTierConfig = (addon: SubscriptionAddon): AddonTierConfig | null => {
    const raw = (addon as { tier_config?: AddonTierConfig | null }).tier_config;
    if (!raw || !raw.tiers || raw.tiers.length === 0) return null;
    return raw;
  };

  const handleSkip = async () => {
    if (!plan || !user?.id) return;

    setIsLoading(true);
    try {
      const checkoutUrl = await subscriptionService.createCheckoutSession(
        plan,
        billingInterval,
        discountCode,
      );
      if (checkoutUrl) {
        window.open(checkoutUrl, "_blank");
      } else {
        toast.error("Failed to create checkout session. Please try again.");
      }
    } catch {
      toast.error("Failed to create checkout session. Please try again.");
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  const handleContinueWithAddon = async () => {
    if (!plan || !user?.id) return;

    setIsLoading(true);
    try {
      // Find selected addon and tier details for the success URL
      const uwAddon = addons?.find((a) => a.name === "uw_wizard");
      const pendingAddonId = uwAddon?.id;
      const pendingTierId = selectedTierId;

      // Create checkout with pending addon info encoded in success URL
      const checkoutUrl = await subscriptionService.createCheckoutSession(
        plan,
        billingInterval,
        discountCode,
        pendingAddonId && pendingTierId
          ? { addonId: pendingAddonId, tierId: pendingTierId }
          : undefined,
      );
      if (checkoutUrl) {
        window.open(checkoutUrl, "_blank");
      } else {
        toast.error("Failed to create checkout session. Please try again.");
      }
    } catch {
      toast.error("Failed to create checkout session. Please try again.");
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  // Find UW Wizard addon with tiers
  const uwAddon = addons?.find((a) => a.name === "uw_wizard" && a.is_active);
  const tierConfig = uwAddon ? getTierConfig(uwAddon) : null;
  const hasTiers = tierConfig && tierConfig.tiers.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Enhance Your {plan?.display_name} Plan
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Add premium tools to your subscription before checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* UW Wizard Addon */}
          {hasTiers && (
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Wand2 className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {uwAddon?.display_name}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {uwAddon?.description ||
                      "AI-powered underwriting analysis and carrier matching."}
                  </p>
                </div>
              </div>

              {/* Tier Selection */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap className="h-3 w-3 text-amber-500" />
                  <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                    Choose a Tier (optional)
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
                        onClick={() =>
                          setSelectedTierId(isSelected ? null : tier.id)
                        }
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
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] text-zinc-500"
              onClick={handleSkip}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <ArrowRight className="h-3 w-3 mr-1" />
              )}
              Skip, just get {plan?.display_name}
            </Button>

            {selectedTierId ? (
              <Button
                size="sm"
                className="text-[11px] bg-purple-600 hover:bg-purple-700"
                onClick={handleContinueWithAddon}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <ExternalLink className="h-3 w-3 mr-1" />
                )}
                Continue with Add-on
              </Button>
            ) : (
              <Button
                size="sm"
                className="text-[11px]"
                onClick={handleSkip}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <ExternalLink className="h-3 w-3 mr-1" />
                )}
                Proceed to Checkout
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
