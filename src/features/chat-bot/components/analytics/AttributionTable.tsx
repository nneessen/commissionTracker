// src/features/chat-bot/components/analytics/AttributionTable.tsx

import { useState } from "react";
import { Link2, Unlink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { BotAttribution } from "../../hooks/useChatBotAnalytics";
import { useUnlinkAttribution } from "../../hooks/useChatBotAnalytics";

export function AttributionTable({
  attributions,
}: {
  attributions: BotAttribution[];
}) {
  const unlinkMutation = useUnlinkAttribution();
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const handleUnlink = async (id: string) => {
    setUnlinkingId(id);
    try {
      await unlinkMutation.mutateAsync(id);
    } finally {
      setUnlinkingId(null);
    }
  };

  if (attributions.length === 0) {
    return (
      <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg text-center">
        <Link2 className="h-5 w-5 text-zinc-300 dark:text-zinc-600 mx-auto mb-1" />
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          No attributed policies yet
        </p>
        <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">
          Policies are automatically linked when a bot conversation matches a
          sale
        </p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg overflow-hidden">
      <div className="px-2.5 py-1.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-1.5">
        <Link2 className="h-3 w-3 text-zinc-400" />
        <h4 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
          Attributed Policies
        </h4>
        <span className="text-[10px] text-zinc-400 ml-auto">
          {attributions.length} total
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
              <th className="text-left px-2 py-1 font-medium">Client</th>
              <th className="text-left px-2 py-1 font-medium">Policy</th>
              <th className="text-right px-2 py-1 font-medium">Premium</th>
              <th className="text-center px-2 py-1 font-medium">Type</th>
              <th className="text-center px-2 py-1 font-medium">Match</th>
              <th className="text-center px-2 py-1 font-medium">Confidence</th>
              <th className="text-right px-2 py-1 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {attributions.map((a) => {
              const clientName = a.policies?.clients
                ? `${a.policies.clients.first_name || ""} ${a.policies.clients.last_name || ""}`.trim()
                : a.lead_name || "Unknown";
              const premium =
                a.policies?.annual_premium ?? a.policies?.monthly_premium ?? 0;

              return (
                <tr
                  key={a.id}
                  className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                >
                  <td className="px-2 py-1.5 text-zinc-900 dark:text-zinc-100 font-medium">
                    {clientName}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {a.policies?.policy_number || "—"}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-medium text-zinc-900 dark:text-zinc-100">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(premium)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] px-1 py-0",
                        a.attribution_type === "bot_converted"
                          ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
                          : "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400",
                      )}
                    >
                      {a.attribution_type === "bot_converted"
                        ? "Converted"
                        : "Assisted"}
                    </Badge>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span className="text-zinc-500 dark:text-zinc-400 capitalize">
                      {a.match_method.replace("auto_", "")}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <ConfidenceBadge score={a.confidence_score} />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      onClick={() => handleUnlink(a.id)}
                      disabled={unlinkingId === a.id}
                      className="inline-flex items-center gap-0.5 text-[9px] text-red-500 hover:text-red-700 disabled:opacity-50"
                      title="Remove attribution"
                    >
                      {unlinkingId === a.id ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : (
                        <Unlink className="h-2.5 w-2.5" />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <span
      className={cn(
        "text-[9px] font-medium",
        pct >= 90
          ? "text-emerald-600 dark:text-emerald-400"
          : pct >= 60
            ? "text-amber-600 dark:text-amber-400"
            : "text-red-500",
      )}
    >
      {pct}%
    </span>
  );
}
