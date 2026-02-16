// src/features/admin/components/lead-vendors/LeadPoliciesTable.tsx

import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDate, formatCompactCurrency, formatPercent } from "@/lib/format";
import { SortableHead, type SortDir } from "./SortableHead";
import type { LeadRecentPolicy, LeadPackRow } from "@/types/lead-purchase.types";

// ---------------------------------------------------------------------------
// Enriched row with pack-level derived signals
// ---------------------------------------------------------------------------
interface EnrichedPolicy {
  policy: LeadRecentPolicy;
  packPurchaseDate: string | null;
  daysToSale: number | null;
  packPolicies: number;
  packRoi: number;
}

type PolicySortField =
  | "submitDate"
  | "packPurchaseDate"
  | "daysToSale"
  | "product"
  | "annualPremium"
  | "agentName"
  | "vendorName"
  | "packName"
  | "leadFreshness"
  | "packPolicies"
  | "packRoi";

const PAGE_SIZES = [10, 25, 50, 100] as const;

interface LeadPoliciesTableProps {
  policies: LeadRecentPolicy[];
  packs: LeadPackRow[];
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function getSortValue(row: EnrichedPolicy, field: PolicySortField): string | number {
  switch (field) {
    case "submitDate":
      return row.policy.submitDate || "";
    case "packPurchaseDate":
      return row.packPurchaseDate || "";
    case "daysToSale":
      return row.daysToSale ?? 9999;
    case "product":
      return row.policy.product;
    case "annualPremium":
      return row.policy.annualPremium;
    case "agentName":
      return row.policy.agentName;
    case "vendorName":
      return row.policy.vendorName;
    case "packName":
      return row.policy.packName || "";
    case "leadFreshness":
      return row.policy.leadFreshness;
    case "packPolicies":
      return row.packPolicies;
    case "packRoi":
      return row.packRoi;
    default:
      return "";
  }
}

function daysToSaleColor(days: number | null): string {
  if (days === null) return "text-zinc-400";
  if (days <= 7) return "text-emerald-600 dark:text-emerald-400";
  if (days <= 30) return "text-blue-600 dark:text-blue-400";
  if (days <= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function roiColor(roi: number): string {
  if (roi > 0) return "text-emerald-600 dark:text-emerald-400";
  if (roi < 0) return "text-red-600 dark:text-red-400";
  return "text-zinc-500";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function LeadPoliciesTable({ policies, packs, isLoading }: LeadPoliciesTableProps) {
  const [sortField, setSortField] = useState<PolicySortField>("submitDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const handleSort = (field: PolicySortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  // Build pack lookup + per-pack policy counts
  const enriched = useMemo((): EnrichedPolicy[] => {
    const packMap = new Map<string, LeadPackRow>();
    for (const p of packs) {
      packMap.set(p.packId, p);
    }

    // Sort by packId then submitDate to assign sequential numbers
    const sortedPolicies = [...policies].sort((a, b) => {
      if (a.packId !== b.packId) return a.packId.localeCompare(b.packId);
      return (a.submitDate || '').localeCompare(b.submitDate || '');
    });

    // Assign sequential policy numbers per pack
    const policySequence = new Map<string, number>();
    const policyNumberMap = new Map<string, number>();
    for (const p of sortedPolicies) {
      const seq = (policySequence.get(p.packId) || 0) + 1;
      policySequence.set(p.packId, seq);
      policyNumberMap.set(p.policyId, seq);
    }

    return policies.map((policy): EnrichedPolicy => {
      const pack = packMap.get(policy.packId);
      const packPurchaseDate = pack?.purchaseDate ?? null;
      let daysToSale: number | null = null;
      if (packPurchaseDate && policy.submitDate) {
        daysToSale = daysBetween(packPurchaseDate, policy.submitDate);
        if (daysToSale < 0) daysToSale = null;
      }

      return {
        policy,
        packPurchaseDate,
        daysToSale,
        packPolicies: policyNumberMap.get(policy.policyId) || 0,
        packRoi: pack?.roiPercentage ?? 0,
      };
    });
  }, [policies, packs]);

  // Sort
  const sorted = useMemo(() => {
    return [...enriched].sort((a, b) => {
      const aVal = getSortValue(a, sortField);
      const bVal = getSortValue(b, sortField);
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;
      return sortDir === "asc" ? aNum - bNum : bNum - aNum;
    });
  }, [enriched, sortField, sortDir]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when data changes
  useMemo(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  if (isLoading && policies.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
            Sold Policies
          </span>
          <Badge variant="outline" className="text-[9px]">
            {sorted.length} policies
          </Badge>
        </div>
      </div>

      {/* Table */}
      <Table className="min-w-[950px]">
        <TableHeader>
          <TableRow className="bg-zinc-50 dark:bg-zinc-800/50">
            <SortableHead field="submitDate" label="Submitted" handleSort={handleSort} sortField={sortField} sortDir={sortDir} className="w-[72px]" />
            <SortableHead field="packPurchaseDate" label="Purchased" handleSort={handleSort} sortField={sortField} sortDir={sortDir} className="w-[72px]" />
            <SortableHead field="daysToSale" label="Days" handleSort={handleSort} sortField={sortField} sortDir={sortDir} className="w-[44px] text-right" />
            <SortableHead field="product" label="Product" handleSort={handleSort} sortField={sortField} sortDir={sortDir} />
            <SortableHead field="annualPremium" label="Premium" handleSort={handleSort} sortField={sortField} sortDir={sortDir} className="w-[64px] text-right" />
            <SortableHead field="agentName" label="Agent" handleSort={handleSort} sortField={sortField} sortDir={sortDir} />
            <SortableHead field="vendorName" label="Vendor" handleSort={handleSort} sortField={sortField} sortDir={sortDir} />
            <SortableHead field="packName" label="Pack" handleSort={handleSort} sortField={sortField} sortDir={sortDir} />
            <SortableHead field="leadFreshness" label="F/A" handleSort={handleSort} sortField={sortField} sortDir={sortDir} className="w-[36px] text-center" />
            <SortableHead field="packPolicies" label="Pol#" handleSort={handleSort} sortField={sortField} sortDir={sortDir} className="w-[40px] text-right" />
            <SortableHead field="packRoi" label="Pack ROI" handleSort={handleSort} sortField={sortField} sortDir={sortDir} className="w-[60px] text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={11}
                className="text-center text-[10px] text-zinc-500 py-6"
              >
                No sold policies linked to lead packages
              </TableCell>
            </TableRow>
          ) : (
            paginated.map((row) => (
              <TableRow key={row.policy.policyId}>
                {/* Policy submit date */}
                <TableCell className="text-[10px] px-1.5 py-0.5 text-zinc-500 whitespace-nowrap">
                  {row.policy.submitDate
                    ? formatDate(row.policy.submitDate, { month: "numeric", day: "numeric", year: "2-digit" })
                    : "\u2014"}
                </TableCell>
                {/* Pack purchase date */}
                <TableCell className="text-[10px] px-1.5 py-0.5 text-zinc-500 whitespace-nowrap">
                  {row.packPurchaseDate
                    ? formatDate(row.packPurchaseDate, { month: "numeric", day: "numeric", year: "2-digit" })
                    : "\u2014"}
                </TableCell>
                {/* Days to sale */}
                <TableCell className={cn(
                  "text-[10px] px-1.5 py-0.5 text-right tabular-nums font-medium",
                  daysToSaleColor(row.daysToSale),
                )}>
                  {row.daysToSale !== null ? row.daysToSale : "\u2014"}
                </TableCell>
                {/* Product */}
                <TableCell className="text-[10px] px-1.5 py-0.5 text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]" title={row.policy.product}>
                  {row.policy.product}
                </TableCell>
                {/* Premium */}
                <TableCell className="text-[10px] px-1.5 py-0.5 text-right tabular-nums">
                  {formatCompactCurrency(row.policy.annualPremium)}
                </TableCell>
                {/* Agent */}
                <TableCell className="text-[10px] px-1.5 py-0.5 text-zinc-700 dark:text-zinc-300 truncate max-w-[110px]" title={row.policy.agentName}>
                  {row.policy.agentName}
                </TableCell>
                {/* Vendor */}
                <TableCell className="text-[10px] px-1.5 py-0.5 text-zinc-700 dark:text-zinc-300 truncate max-w-[100px]" title={row.policy.vendorName}>
                  {row.policy.vendorName}
                </TableCell>
                {/* Pack */}
                <TableCell className="text-[10px] px-1.5 py-0.5 text-zinc-700 dark:text-zinc-300 truncate max-w-[100px]" title={row.policy.packName || undefined}>
                  {row.policy.packName || "\u2014"}
                </TableCell>
                {/* F/A */}
                <TableCell className="text-[10px] px-1.5 py-0.5 text-center">
                  <span className={cn(
                    "font-semibold",
                    row.policy.leadFreshness === "fresh"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400",
                  )}>
                    {row.policy.leadFreshness === "fresh" ? "F" : "A"}
                  </span>
                </TableCell>
                {/* Sequential policy number within pack */}
                <TableCell className="text-[10px] px-1.5 py-0.5 text-right tabular-nums font-medium">
                  {row.packPolicies}
                </TableCell>
                {/* Pack ROI */}
                <TableCell className={cn(
                  "text-[10px] px-1.5 py-0.5 text-right tabular-nums font-medium",
                  roiColor(row.packRoi),
                )}>
                  {formatPercent(row.packRoi)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {sorted.length > 0 && (
        <div className="px-2 py-1 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">
            {(page - 1) * pageSize + 1}&ndash;{Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </span>

          <div className="flex items-center gap-2">
            {/* Page size selector */}
            <div className="flex items-center gap-0.5 border border-zinc-200 dark:border-zinc-700 rounded overflow-hidden">
              {PAGE_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => handlePageSizeChange(size)}
                  className={cn(
                    "px-1.5 py-0.5 text-[10px] transition-colors",
                    pageSize === size
                      ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                  )}
                >
                  {size}
                </button>
              ))}
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-1 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                &lsaquo;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (p === 1 || p === totalPages) return true;
                  return Math.abs(p - page) <= 1;
                })
                .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && arr[idx - 1] !== undefined && p - (arr[idx - 1] as number) > 1) {
                    acc.push("ellipsis");
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "ellipsis" ? (
                    <span
                      key={`e-${idx}`}
                      className="px-0.5 text-[10px] text-zinc-400"
                    >
                      &hellip;
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item)}
                      className={cn(
                        "px-1.5 py-0.5 text-[10px] rounded transition-colors",
                        page === item
                          ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                          : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      )}
                    >
                      {item}
                    </button>
                  ),
                )}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-1 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                &rsaquo;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
