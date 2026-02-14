// src/features/admin/components/lead-vendors/LeadPackTable.tsx

import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatCompactCurrency,
  formatPercent,
  formatNumber,
  formatDate,
} from "@/lib/format";
import type { LeadPackRow, HeatScoreV2 } from "@/types/lead-purchase.types";
import { SortableHead, type SortDir } from "./SortableHead";
import { PackHeatBadge } from "./PackHeatBadge";

type PackSortField =
  | "purchaseName"
  | "vendorName"
  | "agentName"
  | "purchaseDate"
  | "heat"
  | "leadCount"
  | "totalCost"
  | "costPerLead"
  | "policiesSold"
  | "conversionRate"
  | "totalPremium"
  | "commissionEarned"
  | "roiPercentage";

interface LeadPackTableProps {
  packs: LeadPackRow[] | undefined;
  isLoading: boolean;
  title: string;
  heatScores: Map<string, HeatScoreV2>;
  searchTerm: string;
}

export function LeadPackTable({
  packs,
  isLoading,
  title,
  heatScores,
  searchTerm,
}: LeadPackTableProps) {
  const [sortField, setSortField] = useState<PackSortField>("purchaseDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filteredPacks = useMemo(() => {
    if (!packs) return [];
    let result = packs;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.vendorName.toLowerCase().includes(term) ||
          p.agentName.toLowerCase().includes(term) ||
          p.purchaseName?.toLowerCase().includes(term),
      );
    }

    result = [...result].sort((a, b) => {
      if (sortField === "heat") {
        const aScore = heatScores.get(a.packId)?.score ?? 0;
        const bScore = heatScores.get(b.packId)?.score ?? 0;
        return sortDir === "asc" ? aScore - bScore : bScore - aScore;
      }

      const field = sortField as keyof LeadPackRow;
      const aVal = a[field];
      const bVal = b[field];
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
  }, [packs, searchTerm, sortField, sortDir, heatScores]);

  const handleSort = (field: PackSortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const roiColor = (roi: number) =>
    roi > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : roi < 0
        ? "text-red-600 dark:text-red-400"
        : "text-zinc-500";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
        <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
          {title}
        </span>
        <Badge variant="outline" className="text-[9px]">
          {filteredPacks.length} packs
        </Badge>
      </div>
      <div className="overflow-auto max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-800/50">
              <SortableHead
                field="purchaseName"
                label="Pack"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
              />
              <SortableHead
                field="vendorName"
                label="Vendor"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
              />
              <SortableHead
                field="agentName"
                label="Agent"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
              />
              <SortableHead
                field="purchaseDate"
                label="Date"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-right"
              />
              <SortableHead
                field="heat"
                label="Heat"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-center"
              />
              <SortableHead
                field="leadCount"
                label="Leads"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-right"
              />
              <SortableHead
                field="totalCost"
                label="Cost"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-right"
              />
              <SortableHead
                field="costPerLead"
                label="CPL"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-right"
              />
              <SortableHead
                field="policiesSold"
                label="Policies"
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
                field="totalPremium"
                label="Premium"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-right"
              />
              <SortableHead
                field="commissionEarned"
                label="Commission"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-right"
              />
              <SortableHead
                field="roiPercentage"
                label="ROI %"
                handleSort={handleSort}
                sortField={sortField}
                sortDir={sortDir}
                className="text-right"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPacks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={13}
                  className="text-center text-[11px] text-zinc-500 py-6"
                >
                  {searchTerm
                    ? "No packs match your search"
                    : "No pack data available"}
                </TableCell>
              </TableRow>
            ) : (
              filteredPacks.map((pack) => (
                <TableRow
                  key={pack.packId}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <TableCell className="p-1.5 text-[11px] text-zinc-700 dark:text-zinc-300 max-w-[120px] truncate">
                    {pack.purchaseName || "\u2014"}
                  </TableCell>
                  <TableCell className="p-1.5 text-[11px] font-medium text-zinc-900 dark:text-zinc-100 max-w-[100px] truncate">
                    {pack.vendorName}
                  </TableCell>
                  <TableCell className="p-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 max-w-[100px] truncate">
                    {pack.agentName}
                  </TableCell>
                  <TableCell className="p-1.5 text-right text-[11px] text-zinc-500 dark:text-zinc-400">
                    {formatDate(pack.purchaseDate, {
                      month: "short",
                      day: "numeric",
                      year: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="p-1.5 text-center">
                    <PackHeatBadge heat={heatScores.get(pack.packId)} />
                  </TableCell>
                  <TableCell className="p-1.5 text-right text-[11px] text-zinc-700 dark:text-zinc-300">
                    {formatNumber(pack.leadCount)}
                  </TableCell>
                  <TableCell className="p-1.5 text-right text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                    {formatCompactCurrency(pack.totalCost)}
                  </TableCell>
                  <TableCell className="p-1.5 text-right text-[11px] text-zinc-700 dark:text-zinc-300">
                    {formatCurrency(pack.costPerLead)}
                  </TableCell>
                  <TableCell className="p-1.5 text-right text-[11px] text-zinc-700 dark:text-zinc-300">
                    {formatNumber(pack.policiesSold)}
                  </TableCell>
                  <TableCell className="p-1.5 text-right text-[11px] text-zinc-700 dark:text-zinc-300">
                    {formatPercent(pack.conversionRate)}
                  </TableCell>
                  <TableCell className="p-1.5 text-right text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                    {formatCompactCurrency(pack.totalPremium)}
                  </TableCell>
                  <TableCell className="p-1.5 text-right text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                    {formatCompactCurrency(pack.commissionEarned)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "p-1.5 text-right text-[11px] font-medium",
                      roiColor(pack.roiPercentage),
                    )}
                  >
                    {formatPercent(pack.roiPercentage)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
