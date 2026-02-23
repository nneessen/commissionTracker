// src/features/billing/BillingPage.tsx
// Unified billing & subscription management page

import { useState, useEffect } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import {
  Wallet,
  ChevronRight,
  HelpCircle,
  Rocket,
  Brain,
  Plug2,
  BarChart3,
  Sparkles,
  FlaskConical,
  MessageSquare,
  Bug,
  Lightbulb,
  CreditCard,
} from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useImo } from "@/contexts/ImoContext";
import { useQueryClient } from "@tanstack/react-query";
import { subscriptionKeys, type SubscriptionPlan } from "@/hooks/subscription";
import { CurrentPlanCard } from "./components/CurrentPlanCard";
import { PricingCards } from "./components/PricingCards";
import { UsageOverview } from "./components/UsageOverview";
import { PlanComparisonTable } from "./components/PlanComparisonTable";
import { PremiumAddonsSection } from "./components/PremiumAddonsSection";
import { AddonUpsellDialog } from "./components/AddonUpsellDialog";
import { CheckoutSuccessDialog } from "./components/CheckoutSuccessDialog";
import { AdminBillingPanel } from "./components/admin/AdminBillingPanel";

export function BillingPage() {
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

  // Checkout success dialog state
  const [checkoutSuccess, setCheckoutSuccess] = useState<{
    planName: string | null;
    billingInterval: string | null;
  } | null>(null);

  // Check search params for post-checkout states
  const searchParams = useSearch({ strict: false }) as Record<string, string>;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    let shouldClearParams = false;

    // Returning from Stripe portal — refresh subscription data
    if (searchParams?.portal_return === "1") {
      shouldClearParams = true;
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      toast.success("Subscription updated.");
    }

    if (searchParams?.checkout === "success") {
      shouldClearParams = true;

      // Invalidate subscription cache so fresh data is fetched
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });

      if (searchParams?.pending_addon_id) {
        // Pending addon flow: show toast (existing behavior)
        toast.success(
          "Plan activated! Complete your setup by adding a premium add-on below.",
          { duration: 8000 },
        );
      } else {
        // Normal checkout: open success dialog instead of toast
        setCheckoutSuccess({
          planName: searchParams?.plan_name || null,
          billingInterval: searchParams?.billing_interval || null,
        });
      }
    }
    // Clear search params to prevent re-firing on remount
    if (shouldClearParams) {
      navigate({ to: "/billing", search: {}, replace: true });
    }
  }, [
    searchParams?.portal_return,
    searchParams?.checkout,
    searchParams?.pending_addon_id,
    searchParams?.billing_interval,
    searchParams?.plan_name,
    navigate,
    queryClient,
  ]);

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
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5">
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
        {/* Pricing Cards — primary focus, top of page */}
        <PricingCards onPlanSelect={handlePlanSelect} />

        {/* What's Coming */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900">
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                What's Coming
              </span>
              <span className="text-[9px] font-medium bg-amber-400 text-zinc-900 rounded-full px-2 py-0.5 ml-1">
                Team gets early access
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-snug">
              This is just the beginning. The roadmap ahead is massive — and
              heavily AI-driven. Team subscribers get every new feature first,
              the moment it ships.
            </p>
          </div>

          {/* Feature columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100 dark:divide-zinc-800">
            {/* AI Suite */}
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <Brain className="h-3.5 w-3.5 text-indigo-500" />
                <p className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
                  AI Suite
                </p>
              </div>
              {[
                "AI-powered policy & coverage recommendations",
                "Smart underwriting insights from health data",
                "AI-drafted recruit emails & follow-ups",
                "Automated document review & flagging",
                "Conversational AI for client objection handling",
              ].map((item) => (
                <div key={item} className="flex items-start gap-1.5">
                  <Sparkles className="h-3 w-3 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-tight">
                    {item}
                  </p>
                </div>
              ))}
            </div>

            {/* CRM Integrations */}
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <Plug2 className="h-3.5 w-3.5 text-emerald-500" />
                <p className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
                  CRM Integrations
                </p>
              </div>
              {[
                "Close.io — bi-directional contact & lead sync",
                "GoHighLevel — pipeline and automation bridge",
                "Automated lead routing from either CRM",
                "Two-way activity & note sync",
                "Native dialer & SMS log import",
              ].map((item) => (
                <div key={item} className="flex items-start gap-1.5">
                  <Sparkles className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-tight">
                    {item}
                  </p>
                </div>
              ))}
            </div>

            {/* Power Tools */}
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <BarChart3 className="h-3.5 w-3.5 text-amber-500" />
                <p className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
                  Power Tools
                </p>
              </div>
              {[
                "Advanced analytics & custom report builder",
                "AI-generated training modules from your content",
                "Predictive persistency & chargeback alerts",
                "Bulk policy import & carrier data sync",
                "Open API access for custom integrations",
              ].map((item) => (
                <div key={item} className="flex items-start gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-tight">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 text-center">
              Features roll out to{" "}
              <span className="font-semibold text-violet-600 dark:text-violet-400">
                Team
              </span>{" "}
              first — then down to other tiers over time. Upgrade once, stay
              ahead always.
            </p>
          </div>
        </div>

        {/* Current Plan Status */}
        <CurrentPlanCard />

        {/* Team Early Access Strip */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/20 border border-violet-200 dark:border-violet-800">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/50 flex-shrink-0">
            <Rocket className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-violet-900 dark:text-violet-100">
              Team subscribers are first in line for every new feature
            </p>
            <p className="text-[10px] text-violet-600 dark:text-violet-400">
              Every major addition ships to Team before any other tier — no
              waiting, no extra cost.
            </p>
          </div>
        </div>

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
                  a="Full downline visibility, recruiting pipeline, override tracking, and UW Wizard built-in with seat assignment for your agents. $250/mo."
                />
                <FaqItem
                  q="Do my downlines need to pay?"
                  a="Each person manages their own subscription. If you have Team tier, you see their data regardless of their tier."
                />
              </div>
            </Collapsible.Content>
          </div>
        </Collapsible.Root>

        {/* Contact Support */}
        <SupportCard />

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

      {/* Checkout Success Dialog */}
      {checkoutSuccess && (
        <CheckoutSuccessDialog
          planNameHint={checkoutSuccess.planName}
          billingIntervalHint={checkoutSuccess.billingInterval}
          onClose={() => setCheckoutSuccess(null)}
        />
      )}
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

const SUPPORT_CATEGORIES = [
  {
    label: "Bug Report",
    icon: Bug,
    subject: "Bug Report",
    body: "Describe the bug:\n\nSteps to reproduce:\n1. \n2. \n\nExpected behavior:\n\nActual behavior:",
  },
  {
    label: "Feature Request",
    icon: Lightbulb,
    subject: "Feature Request",
    body: "Feature description:\n\nWhy it would be useful:",
  },
  {
    label: "Question",
    icon: MessageSquare,
    subject: "Question",
    body: "My question:",
  },
  {
    label: "Billing Help",
    icon: CreditCard,
    subject: "Billing Help",
    body: "Describe your billing issue:",
  },
] as const;

function SupportCard() {
  const [selected, setSelected] = useState<number>(2); // default: Question
  const [message, setMessage] = useState("");

  const cat = SUPPORT_CATEGORIES[selected];
  const body = message.trim()
    ? `${cat.body.split("\n")[0]}\n${message}`
    : cat.body;
  const mailto = `mailto:support@thestandardhq.com?subject=${encodeURIComponent(cat.subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />
        <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
          Contact Support
        </span>
        <span className="ml-auto text-[10px] text-zinc-400 dark:text-zinc-500">
          support@thestandardhq.com
        </span>
      </div>
      <div className="px-3 py-2.5 space-y-2.5">
        {/* Category selector */}
        <div className="flex gap-1.5 flex-wrap">
          {SUPPORT_CATEGORIES.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.label}
                onClick={() => setSelected(i)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border transition-colors",
                  selected === i
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                    : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500",
                )}
              >
                <Icon className="h-2.5 w-2.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Message */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your issue, question, or request..."
          rows={3}
          className="w-full text-[11px] px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
        />

        {/* Action */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Opens your email client with this message pre-filled.
          </p>
          <a
            href={mailto}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
          >
            <MessageSquare className="h-3 w-3" />
            Send Request
          </a>
        </div>
      </div>
    </div>
  );
}
