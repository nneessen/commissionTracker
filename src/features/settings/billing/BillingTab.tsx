// src/features/settings/billing/BillingTab.tsx
// Main billing tab component — modern pricing layout

import { useState } from "react";
import { ChevronRight, HelpCircle } from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { CurrentPlanCard } from "./components/CurrentPlanCard";
import { PricingCards } from "./components/PricingCards";
import { UsageOverview } from "./components/UsageOverview";
import { PlanComparisonTable } from "./components/PlanComparisonTable";
import { PremiumAddonsSection } from "./components/PremiumAddonsSection";
import { cn } from "@/lib/utils";

export function BillingTab() {
  const [faqOpen, setFaqOpen] = useState(false);

  return (
    <div className="space-y-3 pb-4">
      {/* Status Bar */}
      <CurrentPlanCard />

      {/* Pricing Cards */}
      <PricingCards />

      {/* Usage Overview */}
      <UsageOverview />

      {/* Premium Add-ons */}
      <PremiumAddonsSection />

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
