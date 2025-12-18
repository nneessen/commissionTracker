// src/features/settings/billing/BillingTab.tsx
// Main billing tab component

import { CreditCard } from "lucide-react";
import { CurrentPlanCard } from "./components/CurrentPlanCard";
import { UsageOverview } from "./components/UsageOverview";
import { PlanComparisonTable } from "./components/PlanComparisonTable";
import { useSubscription } from "@/hooks/subscription";
import { Button } from "@/components/ui/button";

export function BillingTab() {
  const { isGrandfathered } = useSubscription();

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
        <div className="p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-md">
              {isGrandfathered
                ? "You're on a grandfathered plan. Subscribe before it expires to keep your features."
                : "Upgrade to unlock more features and grow your business."}
            </p>
            <Button
              size="sm"
              className="h-6 text-[10px] bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
              disabled
            >
              Upgrade Now
            </Button>
          </div>
          <div className="mt-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded text-[10px] text-zinc-500 dark:text-zinc-400">
            <strong>Coming Soon:</strong> Online subscription management is
            being set up.
          </div>
        </div>
      </div>

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
