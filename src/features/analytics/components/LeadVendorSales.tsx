// src/features/analytics/components/LeadVendorSales.tsx

import React from "react";
import { useAnalyticsDateRange } from "../context/AnalyticsDateContext";
import { useLeadRecentPolicies } from "@/hooks/lead-purchases";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "@/lib/date";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeadRecentPolicy } from "@/types/lead-purchase.types";

/**
 * LeadVendorSales - Recent policy sales linked to lead vendors
 * with a weekly breakdown sub-table by vendor
 */
export function LeadVendorSales() {
  const { dateRange } = useAnalyticsDateRange();
  const { data: allRecentPolicies, isLoading } = useLeadRecentPolicies(100);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Lead Vendor Sales
        </div>
        <div className="p-3 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
          Loading...
        </div>
      </div>
    );
  }

  // Filter policies by selected date range
  const policies = (allRecentPolicies || []).filter((p) => {
    const date = p.effectiveDate
      ? parseLocalDate(p.effectiveDate)
      : p.submitDate
        ? new Date(p.submitDate)
        : null;
    if (!date) return false;
    return date >= dateRange.startDate && date <= dateRange.endDate;
  });

  // Build weekly breakdown: rows = vendors, columns = weeks
  const weeklyBreakdown = buildWeeklyBreakdown(
    policies,
    dateRange.startDate,
    dateRange.endDate,
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const d = parseLocalDate(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Lead Vendor Sales
        </div>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
          {policies.length} policies
        </span>
      </div>

      {policies.length === 0 ? (
        <div className="p-3 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
          No lead-linked sales in this period
        </div>
      ) : (
        <>
          {/* Recent Sales Table */}
          <Table className="text-[11px] mb-3">
            <TableHeader>
              <TableRow className="h-7 border-b border-zinc-200 dark:border-zinc-800">
                <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                  Date
                </TableHead>
                <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                  Client
                </TableHead>
                <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                  Product
                </TableHead>
                <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                  AP
                </TableHead>
                <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                  Vendor
                </TableHead>
                <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                  Type
                </TableHead>
                <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.slice(0, 10).map((p) => (
                <TableRow
                  key={p.policyId}
                  className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <TableCell className="p-1.5 font-mono text-zinc-600 dark:text-zinc-300">
                    {formatDate(p.effectiveDate)}
                  </TableCell>
                  <TableCell className="p-1.5 text-zinc-900 dark:text-zinc-100 truncate max-w-[100px]">
                    {p.clientName}
                  </TableCell>
                  <TableCell className="p-1.5 text-zinc-600 dark:text-zinc-400 truncate max-w-[80px]">
                    {p.product}
                  </TableCell>
                  <TableCell className="p-1.5 text-right font-mono text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(p.annualPremium)}
                  </TableCell>
                  <TableCell className="p-1.5 text-zinc-600 dark:text-zinc-400 truncate max-w-[80px]">
                    {p.vendorName}
                  </TableCell>
                  <TableCell className="p-1.5">
                    <span
                      className={cn(
                        "px-1 py-0.5 rounded text-[9px] font-medium",
                        p.leadFreshness === "fresh"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {p.leadFreshness}
                    </span>
                  </TableCell>
                  <TableCell className="p-1.5">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {p.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Weekly Vendor Breakdown */}
          {weeklyBreakdown.vendors.length > 0 && (
            <>
              <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Weekly Breakdown by Vendor
              </div>
              <Table className="text-[11px]">
                <TableHeader>
                  <TableRow className="h-7 border-b border-zinc-200 dark:border-zinc-800">
                    <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                      Vendor
                    </TableHead>
                    {weeklyBreakdown.weeks.map((week) => (
                      <TableHead
                        key={week.label}
                        className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-center"
                      >
                        {week.label}
                      </TableHead>
                    ))}
                    <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-center">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeklyBreakdown.vendors.map((vendor) => (
                    <TableRow
                      key={vendor.name}
                      className="border-b border-zinc-100 dark:border-zinc-800/50"
                    >
                      <TableCell className="p-1.5 text-zinc-900 dark:text-zinc-100 truncate max-w-[100px]">
                        {vendor.name}
                      </TableCell>
                      {weeklyBreakdown.weeks.map((week) => {
                        const count = vendor.weekCounts[week.label] || 0;
                        return (
                          <TableCell
                            key={week.label}
                            className="p-1.5 text-center font-mono"
                          >
                            <span
                              className={cn(
                                count > 0
                                  ? "text-zinc-900 dark:text-zinc-100"
                                  : "text-zinc-300 dark:text-zinc-700",
                              )}
                            >
                              {count}
                            </span>
                          </TableCell>
                        );
                      })}
                      <TableCell className="p-1.5 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {vendor.total}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </>
      )}
    </div>
  );
}

interface WeekInfo {
  label: string;
  start: Date;
  end: Date;
}

interface VendorWeekRow {
  name: string;
  weekCounts: Record<string, number>;
  total: number;
}

interface WeeklyBreakdownResult {
  weeks: WeekInfo[];
  vendors: VendorWeekRow[];
}

function buildWeeklyBreakdown(
  policies: LeadRecentPolicy[],
  rangeStart: Date,
  rangeEnd: Date,
): WeeklyBreakdownResult {
  // Generate week buckets within the range
  const weeks: WeekInfo[] = [];
  const cursor = new Date(rangeStart);
  // Align to Monday
  cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  cursor.setHours(0, 0, 0, 0);

  let weekNum = 1;
  while (cursor <= rangeEnd && weeks.length < 12) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    weeks.push({
      label: `W${weekNum}`,
      start: weekStart,
      end: weekEnd,
    });

    cursor.setDate(cursor.getDate() + 7);
    weekNum++;
  }

  // Group policies by vendor + week
  const vendorMap = new Map<
    string,
    { weekCounts: Record<string, number>; total: number }
  >();

  for (const p of policies) {
    const date = p.effectiveDate
      ? parseLocalDate(p.effectiveDate)
      : p.submitDate
        ? new Date(p.submitDate)
        : null;
    if (!date) continue;

    if (!vendorMap.has(p.vendorName)) {
      vendorMap.set(p.vendorName, { weekCounts: {}, total: 0 });
    }
    const vendor = vendorMap.get(p.vendorName)!;
    vendor.total++;

    for (const week of weeks) {
      if (date >= week.start && date <= week.end) {
        vendor.weekCounts[week.label] =
          (vendor.weekCounts[week.label] || 0) + 1;
        break;
      }
    }
  }

  const vendors: VendorWeekRow[] = Array.from(vendorMap.entries())
    .map(([name, data]) => ({
      name,
      weekCounts: data.weekCounts,
      total: data.total,
    }))
    .sort((a, b) => b.total - a.total);

  return { weeks, vendors };
}
