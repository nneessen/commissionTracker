// src/features/chat-bot/components/AllBotsTab.tsx
// "All Bots" tab — visible to ALL users. Shows collective bot analytics.
// No PII, no agent names, no client data — pure aggregate metrics.

import { useState } from "react";
import {
  Bot,
  MessageSquare,
  Calendar,
  TrendingUp,
  Loader2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCollectiveAnalytics } from "../hooks/useChatBotAnalytics";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function AllBotsTab({
  onNavigateToSubscription,
}: {
  onNavigateToSubscription?: () => void;
}) {
  const [range] = useState(() => {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 86400000)
      .toISOString()
      .slice(0, 10);
    return { from, to };
  });

  const { data, isLoading, error } = useCollectiveAnalytics(
    range.from,
    range.to,
  );

  if (isLoading) {
    return (
      <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg">
        <div className="py-8 text-center">
          <AlertTriangle className="h-6 w-6 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Analytics temporarily unavailable
          </p>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: "Active Bots",
      value: data.activeBots,
      icon: Bot,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Total Conversations",
      value: data.totalConversations.toLocaleString(),
      icon: MessageSquare,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      label: "Appointments Booked",
      value: data.totalAppointments.toLocaleString(),
      icon: Calendar,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950",
    },
    {
      label: "Policies Attributed",
      value: data.totalAttributions.toLocaleString(),
      icon: TrendingUp,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
  ];

  return (
    <div className="space-y-3">
      {/* Hero Header */}
      <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-blue-50 via-white to-violet-50 dark:from-blue-950/30 dark:via-zinc-900 dark:to-violet-950/30 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            AI Chat Bot Performance
          </h3>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 ml-auto">
            Last 30 days
          </span>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="p-2.5 rounded-md bg-white/60 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/50"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <div className={cn("p-1 rounded", m.bg)}>
                  <m.icon className={cn("h-3 w-3", m.color)} />
                </div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {m.label}
                </span>
              </div>
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {m.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Conversion & Revenue Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <StatCard
          label="Booking Rate"
          value={formatPercent(data.bookingRate)}
          sublabel="Conversations → Appointments"
        />
        <StatCard
          label="Conversion Rate"
          value={formatPercent(data.conversionRate)}
          sublabel="Conversations → Policies"
        />
        <StatCard
          label="Total Premium"
          value={formatCurrency(data.totalPremium)}
          sublabel="Attributed annual premium"
          highlight
        />
        <StatCard
          label="Bot Converted"
          value={`${data.botConverted}`}
          sublabel={`${data.botAssisted} assisted`}
        />
      </div>

      {/* CTA for non-subscribers */}
      {onNavigateToSubscription && (
        <div className="p-3 border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                Start your AI Chat Bot
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Engage leads via SMS, book appointments, and close more sales
                automatically.
              </p>
            </div>
            <button
              onClick={onNavigateToSubscription}
              className="px-3 py-1.5 text-[11px] font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  highlight,
}: {
  label: string;
  value: string;
  sublabel: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "p-2.5 rounded-lg border",
        highlight
          ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30"
          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900",
      )}
    >
      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-bold",
          highlight
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-zinc-900 dark:text-zinc-100",
        )}
      >
        {value}
      </p>
      <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">
        {sublabel}
      </p>
    </div>
  );
}
