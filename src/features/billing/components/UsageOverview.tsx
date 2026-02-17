// src/features/billing/components/UsageOverview.tsx
// Displays email and SMS usage meters

import { Mail, MessageSquare, AlertTriangle, Activity } from "lucide-react";
import { useUsageTracking } from "@/hooks/subscription";
import { useSubscription } from "@/hooks/subscription";
import { PRICING } from "@/services/subscription";
import { cn } from "@/lib/utils";

export function UsageOverview() {
  const { emailUsage, smsUsage, isLoading, isEmailWarning, isEmailOverLimit } =
    useUsageTracking();
  const { subscription } = useSubscription();

  const hasEmailAccess = subscription?.plan?.features?.email || false;
  const hasSmsAccess = subscription?.plan?.features?.sms || false;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/4" />
          <div className="h-12 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <Activity className="h-3.5 w-3.5 text-zinc-400" />
        <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
          Usage This Month
        </span>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* No access state */}
        {!hasEmailAccess && !hasSmsAccess && (
          <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded">
            <Mail className="h-3.5 w-3.5 text-zinc-400" />
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
              <p className="font-medium">Email & SMS not available</p>
              <p>Upgrade to Pro or Team to unlock.</p>
            </div>
          </div>
        )}

        {/* Email Usage */}
        {hasEmailAccess && emailUsage && (
          <UsageMeter
            icon={<Mail className="h-3.5 w-3.5" />}
            label="Emails"
            used={emailUsage.used}
            limit={emailUsage.limit}
            isWarning={isEmailWarning}
            isOverLimit={isEmailOverLimit}
            overage={emailUsage.overage}
            overageCost={emailUsage.overageCost}
          />
        )}

        {/* SMS Usage */}
        {hasSmsAccess && smsUsage && (
          <UsageMeter
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            label="SMS"
            used={smsUsage.used}
            limit={0}
            isUsageBased
            totalCost={smsUsage.used * PRICING.SMS_PRICE_PER_MESSAGE}
          />
        )}
      </div>
    </div>
  );
}

interface UsageMeterProps {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number;
  isWarning?: boolean;
  isOverLimit?: boolean;
  isUsageBased?: boolean;
  overage?: number;
  overageCost?: number;
  totalCost?: number;
}

function UsageMeter({
  icon,
  label,
  used,
  limit,
  isWarning,
  isOverLimit,
  isUsageBased,
  overage,
  overageCost,
  totalCost,
}: UsageMeterProps) {
  const percentUsed = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-zinc-400",
              isOverLimit && "text-red-500",
              isWarning && !isOverLimit && "text-amber-500",
            )}
          >
            {icon}
          </span>
          <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
            {label}
          </span>
        </div>

        {isUsageBased ? (
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {used} sent
            {totalCost !== undefined && totalCost > 0 && (
              <span className="ml-1 text-zinc-400">
                (${(totalCost / 100).toFixed(2)})
              </span>
            )}
          </span>
        ) : (
          <span
            className={cn(
              "text-[11px]",
              isOverLimit
                ? "text-red-600 dark:text-red-400 font-medium"
                : isWarning
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-zinc-500 dark:text-zinc-400",
            )}
          >
            {used.toLocaleString()} / {limit.toLocaleString()}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {!isUsageBased && limit > 0 && (
        <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isOverLimit
                ? "bg-red-500"
                : isWarning
                  ? "bg-amber-500"
                  : "bg-emerald-500",
            )}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      )}

      {/* Warning */}
      {isWarning && !isOverLimit && (
        <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-2.5 w-2.5" />
          <span>Approaching limit. Overage: $5/500 emails.</span>
        </div>
      )}

      {/* Over limit */}
      {isOverLimit && overage !== undefined && overageCost !== undefined && (
        <div className="flex items-center justify-between p-1.5 bg-red-50 dark:bg-red-950/30 rounded text-[10px]">
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-2.5 w-2.5" />
            <span>{overage.toLocaleString()} over limit</span>
          </div>
          <span className="font-medium text-red-700 dark:text-red-300">
            +${(overageCost / 100).toFixed(2)}
          </span>
        </div>
      )}

      {/* Usage-based pricing info */}
      {isUsageBased && (
        <p className="text-[10px] text-zinc-400">$0.05 per SMS</p>
      )}
    </div>
  );
}
