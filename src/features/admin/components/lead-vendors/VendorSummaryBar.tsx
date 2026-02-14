// src/features/admin/components/lead-vendors/VendorSummaryBar.tsx

import {
  Store,
  DollarSign,
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatCompactCurrency,
  formatPercent,
  formatNumber,
} from "@/lib/format";
import type { VendorAdminOverview } from "@/types/lead-purchase.types";

interface VendorSummaryBarProps {
  vendors: VendorAdminOverview[];
}

export function VendorSummaryBar({ vendors }: VendorSummaryBarProps) {
  if (!vendors || vendors.length === 0) return null;

  const totalSpent = vendors.reduce((sum, v) => sum + v.totalSpent, 0);
  const totalCommission = vendors.reduce((sum, v) => sum + v.totalCommission, 0);
  const totalPremium = vendors.reduce((sum, v) => sum + v.totalPremium, 0);
  const overallRoi =
    totalSpent > 0 ? ((totalCommission - totalSpent) / totalSpent) * 100 : 0;

  const bestVendor = [...vendors]
    .filter((v) => v.totalSpent > 0)
    .sort((a, b) => b.avgRoi - a.avgRoi)[0];

  const roiColor = (roi: number) =>
    roi > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : roi < 0
        ? "text-red-600 dark:text-red-400"
        : "text-zinc-500";

  const stats = [
    {
      label: "Vendors",
      value: String(vendors.length),
      icon: Store,
      color: "text-zinc-600 dark:text-zinc-400",
    },
    {
      label: "Total Spend",
      value: formatCompactCurrency(totalSpent),
      icon: DollarSign,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Total Leads",
      value: formatNumber(vendors.reduce((sum, v) => sum + v.totalLeads, 0)),
      icon: ShoppingCart,
      color: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Policies",
      value: formatNumber(vendors.reduce((sum, v) => sum + v.totalPolicies, 0)),
      icon: Target,
      color: "text-violet-600 dark:text-violet-400",
    },
    {
      label: "Commission",
      value: formatCompactCurrency(totalCommission),
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Premium",
      value: formatCompactCurrency(totalPremium),
      icon: DollarSign,
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Overall ROI",
      value: formatPercent(overallRoi),
      icon: TrendingUp,
      color: roiColor(overallRoi),
      isRoi: true,
    },
    {
      label: "Top Vendor",
      value: bestVendor?.vendorName || "\u2014",
      icon: Users,
      color: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-8 gap-2">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5"
        >
          <div className="flex items-center gap-1 mb-0.5">
            <stat.icon className={cn("h-3 w-3", stat.color)} />
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              {stat.label}
            </span>
          </div>
          <div
            className={cn(
              "text-sm font-semibold truncate",
              stat.isRoi
                ? stat.color
                : "text-zinc-900 dark:text-zinc-100",
            )}
          >
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
