// src/features/billing/BillingPage.tsx
// Unified billing & subscription management page

import { useState, useEffect } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { Wallet, ChevronRight, HelpCircle, Shield } from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useImo } from "@/contexts/ImoContext";
import { CurrentPlanCard } from "./components/CurrentPlanCard";
import { PricingCards } from "./components/PricingCards";
import { UsageOverview } from "./components/UsageOverview";
import { PlanComparisonTable } from "./components/PlanComparisonTable";
import { PremiumAddonsSection } from "./components/PremiumAddonsSection";
import { AddonUpsellDialog } from "./components/AddonUpsellDialog";
import { AdminBillingPanel } from "./components/admin/AdminBillingPanel";
import type { SubscriptionPlan } from "@/services/subscription";

export function BillingPage() {
  const { supabaseUser } = useAuth();
  const { isSuperAdmin } = useImo();
  const [faqOpen, setFaqOpen] = useState(false);

  // Upsell dialog state
  const [upsellPlan, setUpsellPlan] = useState<SubscriptionPlan | null>(null);
  const [upsellBillingInterval, setUpsellBillingInterval] = useState<
    "monthly" | "annual"
  >("monthly");
  const [upsellDiscountCode, setUpsellDiscountCode] = useState<
    string | undefined
  >();

  // Check search params for post-checkout states
  const searchParams = useSearch({ strict: false }) as Record<string, string>;
  const navigate = useNavigate();

  useEffect(() => {
    let hasToast = false;

    if (searchParams?.checkout === "success") {
      hasToast = true;
      if (searchParams?.pending_addon_id) {
        toast.success(
          "Plan activated! Complete your setup by adding a premium add-on below.",
          { duration: 8000 },
        );
      } else {
        toast.success("Subscription activated successfully!");
      }
    }
    if (searchParams?.addon_checkout === "success") {
      hasToast = true;
      toast.success("Add-on activated successfully!");
    }

    // Clear search params after showing toast to prevent re-firing on remount
    if (hasToast) {
      navigate({ to: "/billing", search: {}, replace: true });
    }
  }, [searchParams?.checkout, searchParams?.addon_checkout, searchParams?.pending_addon_id, navigate]);

  const handlePlanSelect = (
    plan: SubscriptionPlan,
    billingInterval: "monthly" | "annual",
    discountCode?: string,
  ) => {
    setUpsellPlan(plan);
    setUpsellBillingInterval(billingInterval);
    setUpsellDiscountCode(discountCode);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Billing
          </h1>
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Manage your subscription, add-ons, and usage
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {/* Current Plan Status */}
        <CurrentPlanCard />

        {/* Pricing Cards */}
        <PricingCards onPlanSelect={handlePlanSelect} />

        {/* Premium Add-ons */}
        <PremiumAddonsSection />

        {/* Usage Overview */}
        <UsageOverview />

        {/* Compare All Features (collapsible) */}
        <PlanComparisonTable />

        {/* FAQ (collapsible) */}
        <Collapsible.Root open={faqOpen} onOpenChange={setFaqOpen}>
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <Collapsible.Trigger asChild>
              <button className="flex items-center justify-between w-full px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors rounded-lg">
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                    FAQ
                  </span>
                </div>
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 text-zinc-400 transition-transform duration-200",
                    faqOpen && "rotate-90",
                  )}
                />
              </button>
            </Collapsible.Trigger>

            <Collapsible.Content>
              <div className="px-3 pb-3 space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-2">
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
            </Collapsible.Content>
          </div>
        </Collapsible.Root>

        {/* Super-admin: Admin Billing Panel */}
        {isSuperAdmin && <AdminBillingPanel />}
      </div>

      {/* Addon Upsell Dialog */}
      <AddonUpsellDialog
        plan={upsellPlan}
        billingInterval={upsellBillingInterval}
        discountCode={upsellDiscountCode}
        onClose={() => setUpsellPlan(null)}
      />
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0">
      <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
        {q}
      </p>
      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
        {a}
      </p>
    </div>
  );
}
