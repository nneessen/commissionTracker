// src/features/admin/components/LeadVendorsTab.tsx
// Admin-only tab showing aggregated lead vendor performance across all users

import React, { useState, useMemo } from "react";
import {
  Store,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Loader2,
  Mail,
  Phone,
  Globe,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  ShoppingCart,
  Flame,
  Minus,
  Snowflake,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useLeadVendorAdminOverview,
  useLeadVendorUserBreakdown,
  useLeadVendorPolicyTimeline,
  useVendorHeatScores,
  getHeatColor,
  getHeatBgColor,
  getTrendArrow,
} from "@/hooks/lead-purchases";
import {
  formatCurrency,
  formatCompactCurrency,
  formatPercent,
  formatNumber,
  formatDate,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  VendorAdminOverview,
  VendorHeatScore,
  HeatLevel,
} from "@/types/lead-purchase.types";

type SortField =
  | "vendorName"
  | "lastPurchaseDate"
  | "totalPurchases"
  | "totalLeads"
  | "totalSpent"
  | "totalPolicies"
  | "totalCommission"
  | "avgCostPerLead"
  | "avgRoi"
  | "conversionRate"
  | "uniqueUsers"
  | "heat";

type SortDir = "asc" | "desc";

export function LeadVendorsTab() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("totalSpent");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: vendors, isLoading } = useLeadVendorAdminOverview(
    startDate || undefined,
    endDate || undefined,
  );

  const { data: userBreakdown, isLoading: breakdownLoading } =
    useLeadVendorUserBreakdown(
      expandedVendorId,
      startDate || undefined,
      endDate || undefined,
    );

  const { heatScores } = useVendorHeatScores();

  // Filter + sort vendors
  const filteredVendors = useMemo(() => {
    if (!vendors) return [];
    let result = vendors;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (v) =>
          v.vendorName.toLowerCase().includes(term) ||
          v.contactName?.toLowerCase().includes(term) ||
          v.contactEmail?.toLowerCase().includes(term),
      );
    }

    result = [...result].sort((a, b) => {
      // Special handling for heat sort
      if (sortField === "heat") {
        const aScore = heatScores.get(a.vendorId)?.score ?? 0;
        const bScore = heatScores.get(b.vendorId)?.score ?? 0;
        return sortDir === "asc" ? aScore - bScore : bScore - aScore;
      }

      const field = sortField as keyof VendorAdminOverview;
      const aVal = a[field];
      const bVal = b[field];
      // Handle nullable strings (dates) — nulls sort last
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;
      return sortDir === "asc" ? aNum - bNum : bNum - aNum;
    });

    return result;
  }, [vendors, searchTerm, sortField, sortDir, heatScores]);

  // Summary stats computed from vendor data
  const summary = useMemo(() => {
    if (!vendors || vendors.length === 0)
      return {
        vendorCount: 0,
        totalSpent: 0,
        totalLeads: 0,
        totalPolicies: 0,
        totalCommission: 0,
        overallRoi: 0,
        bestVendor: "",
      };

    const totalSpent = vendors.reduce((sum, v) => sum + v.totalSpent, 0);
    const totalCommission = vendors.reduce(
      (sum, v) => sum + v.totalCommission,
      0,
    );
    const overallRoi =
      totalSpent > 0 ? ((totalCommission - totalSpent) / totalSpent) * 100 : 0;

    const bestVendor = [...vendors]
      .filter((v) => v.totalSpent > 0)
      .sort((a, b) => b.avgRoi - a.avgRoi)[0];

    return {
      vendorCount: vendors.length,
      totalSpent: vendors.reduce((sum, v) => sum + v.totalSpent, 0),
      totalLeads: vendors.reduce((sum, v) => sum + v.totalLeads, 0),
      totalPolicies: vendors.reduce((sum, v) => sum + v.totalPolicies, 0),
      totalCommission,
      overallRoi,
      bestVendor: bestVendor?.vendorName || "—",
    };
  }, [vendors]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const toggleExpand = (vendorId: string) => {
    setExpandedVendorId(expandedVendorId === vendorId ? null : vendorId);
    setExpandedAgentId(null);
  };

  const roiColor = (roi: number) =>
    roi > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : roi < 0
        ? "text-red-600 dark:text-red-400"
        : "text-zinc-500";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-2 overflow-hidden">
      {/* Header with filters */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Lead Vendors
          </h2>
          <Badge variant="outline" className="text-[10px]">
            {summary.vendorCount} vendors
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-7 px-2 text-[11px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-700 dark:text-zinc-300"
              placeholder="Start"
            />
            <span className="text-[10px] text-zinc-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-7 px-2 text-[11px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-700 dark:text-zinc-300"
              placeholder="End"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vendors..."
              className="h-7 pl-7 pr-2 w-44 text-[11px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats Bar */}
      <div className="grid grid-cols-7 gap-2">
        {[
          {
            label: "Vendors",
            value: String(summary.vendorCount),
            icon: Store,
            color: "text-zinc-600 dark:text-zinc-400",
          },
          {
            label: "Total Spend",
            value: formatCompactCurrency(summary.totalSpent),
            icon: DollarSign,
            color: "text-blue-600 dark:text-blue-400",
          },
          {
            label: "Total Leads",
            value: formatNumber(summary.totalLeads),
            icon: ShoppingCart,
            color: "text-indigo-600 dark:text-indigo-400",
          },
          {
            label: "Policies",
            value: formatNumber(summary.totalPolicies),
            icon: Target,
            color: "text-violet-600 dark:text-violet-400",
          },
          {
            label: "Commission",
            value: formatCompactCurrency(summary.totalCommission),
            icon: DollarSign,
            color: "text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "Overall ROI",
            value: formatPercent(summary.overallRoi),
            icon: TrendingUp,
            color: roiColor(summary.overallRoi),
          },
          {
            label: "Top Vendor",
            value: summary.bestVendor,
            icon: Users,
            color: "text-amber-600 dark:text-amber-400",
          },
        ].map((stat) => (
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
                stat.label === "Overall ROI"
                  ? stat.color
                  : "text-zinc-900 dark:text-zinc-100",
              )}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Vendor Table */}
      <div className="flex-1 overflow-auto bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-800/50">
              <TableHead className="w-6 p-1.5" />
              <SortableHead
                field="vendorName"
                label="Vendor"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
              />
              <SortableHead
                field="heat"
                label="Heat"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-center"
              />
              <TableHead className="text-[10px] font-semibold p-1.5">
                Contact
              </TableHead>
              <SortableHead
                field="lastPurchaseDate"
                label="Last Purchase"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-right"
              />
              <SortableHead
                field="totalPurchases"
                label="Purchases"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-right"
              />
              <SortableHead
                field="totalLeads"
                label="Leads"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-right"
              />
              <TableHead className="text-[10px] font-semibold p-1.5 text-right">
                Fresh / Aged
              </TableHead>
              <SortableHead
                field="totalSpent"
                label="Spend"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-right"
              />
              <SortableHead
                field="totalPolicies"
                label="Policies"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-right"
              />
              <SortableHead
                field="totalCommission"
                label="Commission"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-right"
              />
              <SortableHead
                field="avgCostPerLead"
                label="CPL"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-right"
              />
              <SortableHead
                field="avgRoi"
                label="ROI %"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-right"
              />
              <SortableHead
                field="conversionRate"
                label="Conv %"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-right"
              />
              <SortableHead
                field="uniqueUsers"
                label="Agents"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-right"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={15}
                  className="text-center text-[11px] text-zinc-500 py-8"
                >
                  {searchTerm
                    ? "No vendors match your search"
                    : "No vendor data available"}
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors.map((vendor) => (
                <VendorRow
                  key={vendor.vendorId}
                  vendor={vendor}
                  isExpanded={expandedVendorId === vendor.vendorId}
                  onToggle={() => toggleExpand(vendor.vendorId)}
                  userBreakdown={
                    expandedVendorId === vendor.vendorId
                      ? userBreakdown
                      : undefined
                  }
                  breakdownLoading={
                    expandedVendorId === vendor.vendorId && breakdownLoading
                  }
                  roiColor={roiColor}
                  heatScore={heatScores.get(vendor.vendorId)}
                  expandedAgentId={
                    expandedVendorId === vendor.vendorId
                      ? expandedAgentId
                      : null
                  }
                  onToggleAgent={(agentId) =>
                    setExpandedAgentId(
                      expandedAgentId === agentId ? null : agentId,
                    )
                  }
                  startDate={startDate || undefined}
                  endDate={endDate || undefined}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** Heat icon for a given level */
function HeatIcon({
  level,
  className,
}: {
  level: HeatLevel;
  className?: string;
}) {
  switch (level) {
    case "hot":
      return <Flame className={className} />;
    case "warming":
      return <TrendingUp className={className} />;
    case "neutral":
      return <Minus className={className} />;
    case "cooling":
      return <TrendingDown className={className} />;
    case "cold":
      return <Snowflake className={className} />;
  }
}

/** Heat badge with tooltip showing breakdown */
function VendorHeatBadge({ heat }: { heat?: VendorHeatScore }) {
  if (!heat) return <span className="text-[10px] text-zinc-400">—</span>;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-medium cursor-default",
              getHeatBgColor(heat.level),
              getHeatColor(heat.level),
            )}
          >
            <HeatIcon level={heat.level} className="h-2.5 w-2.5" />
            <span>{heat.score}</span>
            <span className="text-[9px]">{getTrendArrow(heat.trend)}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="text-[10px] space-y-1 max-w-[220px]"
        >
          <div className="font-semibold">Heat Score: {heat.score}/100</div>
          <div className="space-y-0.5 text-zinc-500 dark:text-zinc-400">
            <div>
              1st Sale Speed: {heat.breakdown.timeToFirstSale}/25{" "}
              {heat.medianDaysToFirstSale >= 0
                ? `(${Math.round(heat.medianDaysToFirstSale)}d median)`
                : "(no data)"}
            </div>
            <div>
              Sale Cadence: {heat.breakdown.interSaleCadence}/20{" "}
              {heat.avgDaysBetweenSales >= 0
                ? `(${Math.round(heat.avgDaysBetweenSales)}d avg gap)`
                : ""}
            </div>
            <div>
              Agent Activity: {heat.breakdown.activeAgentRatio}/15 (
              {heat.agentSalesRatio30d} sold/30d)
            </div>
            <div>
              Pack Efficiency: {heat.breakdown.packEfficiency}/15 (
              {heat.avgPoliciesPerPack} pol/pack)
            </div>
            <div>
              Recency: {heat.breakdown.recency}/15 (
              {heat.daysSinceLastSale < 999
                ? `${heat.daysSinceLastSale}d ago`
                : "never"}
              )
            </div>
            <div>
              Momentum: {heat.breakdown.freshness}/10 ({heat.salesLast30d}{" "}
              sales/30d)
            </div>
          </div>
          <div className="text-[9px] text-zinc-400 pt-0.5 border-t border-zinc-200 dark:border-zinc-700">
            {heat.totalPacks90d} packs in 90d
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Sortable table header cell */
function SortableHead({
  field,
  label,
  handleSort,
  sortField,
  sortDir,
  className,
}: {
  field: SortField;
  label: string;
  handleSort: (f: SortField) => void;
  sortField: SortField;
  sortDir: SortDir;
  className?: string;
}) {
  const isActive = sortField === field;
  return (
    <TableHead
      className={cn(
        "text-[10px] font-semibold p-1.5 cursor-pointer select-none hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors",
        className,
      )}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {isActive ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-2.5 w-2.5 text-zinc-600 dark:text-zinc-300" />
          ) : (
            <ArrowDown className="h-2.5 w-2.5 text-zinc-600 dark:text-zinc-300" />
          )
        ) : (
          <ArrowUpDown className="h-2.5 w-2.5 text-zinc-400" />
        )}
      </span>
    </TableHead>
  );
}

/** Inline policy timeline for an agent within a vendor */
function AgentPolicyTimeline({
  vendorId,
  userId,
  startDate,
  endDate,
}: {
  vendorId: string;
  userId: string;
  startDate?: string;
  endDate?: string;
}) {
  const { data: policies, isLoading } = useLeadVendorPolicyTimeline(
    vendorId,
    userId,
    startDate,
    endDate,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!policies || policies.length === 0) {
    return (
      <div className="text-center text-[10px] text-zinc-500 py-3">
        No policies linked to this vendor's leads
      </div>
    );
  }

  return (
    <div className="mx-4 my-1.5 rounded border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-100/50 dark:bg-zinc-800/30">
            <TableHead className="text-[9px] font-semibold p-1 uppercase">
              Policy #
            </TableHead>
            <TableHead className="text-[9px] font-semibold p-1 uppercase">
              Client
            </TableHead>
            <TableHead className="text-[9px] font-semibold p-1 uppercase">
              Product
            </TableHead>
            <TableHead className="text-[9px] font-semibold p-1 text-right uppercase">
              Submit
            </TableHead>
            <TableHead className="text-[9px] font-semibold p-1 text-right uppercase">
              Effective
            </TableHead>
            <TableHead className="text-[9px] font-semibold p-1 text-right uppercase">
              Annual Premium
            </TableHead>
            <TableHead className="text-[9px] font-semibold p-1 text-center uppercase">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {policies.map((p) => (
            <TableRow
              key={p.policyId}
              className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20"
            >
              <TableCell className="p-1 text-[10px] font-mono text-zinc-700 dark:text-zinc-300">
                {p.policyNumber || "—"}
              </TableCell>
              <TableCell className="p-1 text-[10px] text-zinc-700 dark:text-zinc-300">
                {p.clientName}
              </TableCell>
              <TableCell className="p-1 text-[10px] text-zinc-600 dark:text-zinc-400">
                {p.product}
              </TableCell>
              <TableCell className="p-1 text-right text-[10px] text-zinc-500 dark:text-zinc-400">
                {formatDate(p.submitDate, {
                  month: "short",
                  day: "numeric",
                  year: "2-digit",
                })}
              </TableCell>
              <TableCell className="p-1 text-right text-[10px] text-zinc-500 dark:text-zinc-400">
                {formatDate(p.effectiveDate, {
                  month: "short",
                  day: "numeric",
                  year: "2-digit",
                })}
              </TableCell>
              <TableCell className="p-1 text-right text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                {formatCurrency(p.annualPremium)}
              </TableCell>
              <TableCell className="p-1 text-center">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] px-1 py-0",
                    p.status === "active" &&
                      "border-emerald-300 text-emerald-600 dark:text-emerald-400",
                    p.status === "pending" &&
                      "border-amber-300 text-amber-600 dark:text-amber-400",
                    p.status === "cancelled" &&
                      "border-red-300 text-red-600 dark:text-red-400",
                  )}
                >
                  {p.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Vendor row with expandable user breakdown */
function VendorRow({
  vendor,
  isExpanded,
  onToggle,
  userBreakdown,
  breakdownLoading,
  roiColor,
  heatScore,
  expandedAgentId,
  onToggleAgent,
  startDate,
  endDate,
}: {
  vendor: VendorAdminOverview;
  isExpanded: boolean;
  onToggle: () => void;
  userBreakdown: ReturnType<typeof useLeadVendorUserBreakdown>["data"];
  breakdownLoading: boolean;
  roiColor: (roi: number) => string;
  heatScore?: VendorHeatScore;
  expandedAgentId: string | null;
  onToggleAgent: (agentId: string) => void;
  startDate?: string;
  endDate?: string;
}) {
  return (
    <>
      <TableRow
        className={cn(
          "group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors",
          isExpanded && "bg-zinc-50 dark:bg-zinc-800/30",
        )}
        onClick={onToggle}
      >
        <TableCell className="p-1.5 w-6">
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-zinc-500" />
          ) : (
            <ChevronRight className="h-3 w-3 text-zinc-400" />
          )}
        </TableCell>
        <TableCell className="p-1.5">
          <div className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
            {vendor.vendorName}
          </div>
        </TableCell>
        <TableCell
          className="p-1.5 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <VendorHeatBadge heat={heatScore} />
        </TableCell>
        <TableCell className="p-1.5">
          <div className="flex flex-col gap-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
            {vendor.contactName && <span>{vendor.contactName}</span>}
            <div className="flex items-center gap-2">
              {vendor.contactEmail && (
                <a
                  href={`mailto:${vendor.contactEmail}`}
                  className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="h-2.5 w-2.5" />
                  {vendor.contactEmail}
                </a>
              )}
              {vendor.contactPhone && (
                <span className="inline-flex items-center gap-0.5">
                  <Phone className="h-2.5 w-2.5" />
                  {vendor.contactPhone}
                </span>
              )}
              {vendor.website && (
                <a
                  href={
                    vendor.website.startsWith("http")
                      ? vendor.website
                      : `https://${vendor.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Globe className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="p-1.5 text-right text-[11px] text-zinc-500 dark:text-zinc-400">
          {vendor.lastPurchaseDate
            ? formatDate(vendor.lastPurchaseDate, {
                month: "short",
                day: "numeric",
                year: "2-digit",
              })
            : "—"}
        </TableCell>
        <TableCell className="p-1.5 text-right text-[11px] text-zinc-700 dark:text-zinc-300">
          {formatNumber(vendor.totalPurchases)}
        </TableCell>
        <TableCell className="p-1.5 text-right text-[11px] text-zinc-700 dark:text-zinc-300">
          {formatNumber(vendor.totalLeads)}
        </TableCell>
        <TableCell className="p-1.5 text-right text-[10px] text-zinc-500 dark:text-zinc-400">
          <span className="text-emerald-600 dark:text-emerald-400">
            {formatNumber(vendor.freshLeads)}
          </span>
          {" / "}
          <span className="text-amber-600 dark:text-amber-400">
            {formatNumber(vendor.agedLeads)}
          </span>
        </TableCell>
        <TableCell className="p-1.5 text-right text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
          {formatCompactCurrency(vendor.totalSpent)}
        </TableCell>
        <TableCell className="p-1.5 text-right text-[11px] text-zinc-700 dark:text-zinc-300">
          {formatNumber(vendor.totalPolicies)}
        </TableCell>
        <TableCell className="p-1.5 text-right text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
          {formatCompactCurrency(vendor.totalCommission)}
        </TableCell>
        <TableCell className="p-1.5 text-right text-[11px] text-zinc-700 dark:text-zinc-300">
          {formatCurrency(vendor.avgCostPerLead)}
        </TableCell>
        <TableCell
          className={cn(
            "p-1.5 text-right text-[11px] font-medium",
            roiColor(vendor.avgRoi),
          )}
        >
          {formatPercent(vendor.avgRoi)}
        </TableCell>
        <TableCell className="p-1.5 text-right text-[11px] text-zinc-700 dark:text-zinc-300">
          {formatPercent(vendor.conversionRate)}
        </TableCell>
        <TableCell className="p-1.5 text-right text-[11px] text-zinc-700 dark:text-zinc-300">
          {vendor.uniqueUsers}
        </TableCell>
      </TableRow>

      {/* Expanded: Per-user breakdown sub-table */}
      {isExpanded && (
        <TableRow className="bg-zinc-50/50 dark:bg-zinc-800/20">
          <TableCell colSpan={15} className="p-0">
            <div className="mx-6 my-2 rounded border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                <Users className="h-3 w-3" />
                Agent Breakdown — {vendor.vendorName}
              </div>
              {breakdownLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                </div>
              ) : !userBreakdown || userBreakdown.length === 0 ? (
                <div className="text-center text-[11px] text-zinc-500 py-4">
                  No user data for this vendor
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50 dark:bg-zinc-800/50">
                      <TableHead className="w-6 p-1.5" />
                      <TableHead className="text-[10px] font-semibold p-1.5">
                        Agent
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold p-1.5 text-right">
                        Last Purchase
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold p-1.5 text-right">
                        Purchases
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold p-1.5 text-right">
                        Leads
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold p-1.5 text-right">
                        Fresh / Aged
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold p-1.5 text-right">
                        Spend
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold p-1.5 text-right">
                        Policies
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold p-1.5 text-right">
                        Commission
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold p-1.5 text-right">
                        CPL
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold p-1.5 text-right">
                        ROI %
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold p-1.5 text-right">
                        Conv %
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userBreakdown.map((user) => (
                      <React.Fragment key={user.userId}>
                        <TableRow
                          className={cn(
                            "cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-700/30",
                            expandedAgentId === user.userId &&
                              "bg-zinc-100/50 dark:bg-zinc-700/20",
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleAgent(user.userId);
                          }}
                        >
                          <TableCell className="p-1.5 w-6">
                            {expandedAgentId === user.userId ? (
                              <ChevronDown className="h-2.5 w-2.5 text-zinc-500" />
                            ) : (
                              <ChevronRight className="h-2.5 w-2.5 text-zinc-400" />
                            )}
                          </TableCell>
                          <TableCell className="p-1.5 text-[11px] font-medium text-zinc-800 dark:text-zinc-200">
                            {user.userName}
                          </TableCell>
                          <TableCell className="p-1.5 text-right text-[11px] text-zinc-500 dark:text-zinc-400">
                            {user.lastPurchaseDate
                              ? formatDate(user.lastPurchaseDate, {
                                  month: "short",
                                  day: "numeric",
                                  year: "2-digit",
                                })
                              : "—"}
                          </TableCell>
                          <TableCell className="p-1.5 text-right text-[11px] text-zinc-600 dark:text-zinc-400">
                            {formatNumber(user.totalPurchases)}
                          </TableCell>
                          <TableCell className="p-1.5 text-right text-[11px] text-zinc-600 dark:text-zinc-400">
                            {formatNumber(user.totalLeads)}
                          </TableCell>
                          <TableCell className="p-1.5 text-right text-[10px] text-zinc-500 dark:text-zinc-400">
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {formatNumber(user.freshLeads)}
                            </span>
                            {" / "}
                            <span className="text-amber-600 dark:text-amber-400">
                              {formatNumber(user.agedLeads)}
                            </span>
                          </TableCell>
                          <TableCell className="p-1.5 text-right text-[11px] text-zinc-600 dark:text-zinc-400">
                            {formatCompactCurrency(user.totalSpent)}
                          </TableCell>
                          <TableCell className="p-1.5 text-right text-[11px] text-zinc-600 dark:text-zinc-400">
                            {formatNumber(user.totalPolicies)}
                          </TableCell>
                          <TableCell className="p-1.5 text-right text-[11px] text-zinc-600 dark:text-zinc-400">
                            {formatCompactCurrency(user.totalCommission)}
                          </TableCell>
                          <TableCell className="p-1.5 text-right text-[11px] text-zinc-600 dark:text-zinc-400">
                            {formatCurrency(user.avgCostPerLead)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "p-1.5 text-right text-[11px] font-medium",
                              roiColor(user.avgRoi),
                            )}
                          >
                            {formatPercent(user.avgRoi)}
                          </TableCell>
                          <TableCell className="p-1.5 text-right text-[11px] text-zinc-600 dark:text-zinc-400">
                            {formatPercent(user.conversionRate)}
                          </TableCell>
                        </TableRow>
                        {/* Expanded agent: policy timeline */}
                        {expandedAgentId === user.userId && (
                          <TableRow key={`${user.userId}-timeline`}>
                            <TableCell
                              colSpan={12}
                              className="p-0 bg-zinc-50/30 dark:bg-zinc-800/10"
                            >
                              <AgentPolicyTimeline
                                vendorId={vendor.vendorId}
                                userId={user.userId}
                                startDate={startDate}
                                endDate={endDate}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
