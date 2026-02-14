// src/features/admin/components/lead-vendors/RecentPoliciesTable.tsx

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { useLeadRecentPolicies } from "@/hooks/lead-purchases";
import type { LeadRecentPolicy } from "@/types/lead-purchase.types";

const statusColor = (status: string) => {
  switch (status) {
    case "active":
      return "border-emerald-300 text-emerald-600 dark:text-emerald-400";
    case "pending":
      return "border-amber-300 text-amber-600 dark:text-amber-400";
    case "cancelled":
    case "lapsed":
      return "border-red-300 text-red-600 dark:text-red-400";
    default:
      return "border-zinc-300 text-zinc-500";
  }
};

const freshnessColor = (freshness: string) =>
  freshness === "fresh"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800";

export function RecentPoliciesTable() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { data: policies, isLoading } = useLeadRecentPolicies(100);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3 text-zinc-500" />
        ) : (
          <ChevronDown className="h-3 w-3 text-zinc-500" />
        )}
        <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
          Recent Policies Sold
        </span>
        {policies && (
          <Badge variant="outline" className="text-[9px] ml-1">
            {policies.length}
          </Badge>
        )}
      </button>

      {!isCollapsed && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 max-h-[280px] overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            </div>
          ) : !policies || policies.length === 0 ? (
            <div className="text-center text-[11px] text-zinc-500 py-6">
              No policies linked to lead packs
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50 dark:bg-zinc-800/50">
                  <TableHead className="text-[9px] font-semibold p-1.5 uppercase">
                    Date
                  </TableHead>
                  <TableHead className="text-[9px] font-semibold p-1.5 uppercase">
                    Policy #
                  </TableHead>
                  <TableHead className="text-[9px] font-semibold p-1.5 uppercase">
                    Client
                  </TableHead>
                  <TableHead className="text-[9px] font-semibold p-1.5 uppercase">
                    Product
                  </TableHead>
                  <TableHead className="text-[9px] font-semibold p-1.5 text-right uppercase">
                    Premium
                  </TableHead>
                  <TableHead className="text-[9px] font-semibold p-1.5 uppercase">
                    Agent
                  </TableHead>
                  <TableHead className="text-[9px] font-semibold p-1.5 uppercase">
                    Vendor
                  </TableHead>
                  <TableHead className="text-[9px] font-semibold p-1.5 uppercase">
                    Pack
                  </TableHead>
                  <TableHead className="text-[9px] font-semibold p-1.5 text-center uppercase">
                    Type
                  </TableHead>
                  <TableHead className="text-[9px] font-semibold p-1.5 text-center uppercase">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p: LeadRecentPolicy) => (
                  <TableRow
                    key={p.policyId}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20"
                  >
                    <TableCell className="p-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                      {formatDate(p.effectiveDate || p.submitDate || "", {
                        month: "short",
                        day: "numeric",
                        year: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="p-1.5 text-[10px] font-mono text-zinc-700 dark:text-zinc-300">
                      {p.policyNumber || "\u2014"}
                    </TableCell>
                    <TableCell className="p-1.5 text-[10px] text-zinc-700 dark:text-zinc-300 max-w-[120px] truncate">
                      {p.clientName}
                    </TableCell>
                    <TableCell className="p-1.5 text-[10px] text-zinc-600 dark:text-zinc-400 max-w-[100px] truncate">
                      {p.product}
                    </TableCell>
                    <TableCell className="p-1.5 text-right text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                      {formatCurrency(p.annualPremium)}
                    </TableCell>
                    <TableCell className="p-1.5 text-[10px] text-zinc-600 dark:text-zinc-400 max-w-[100px] truncate">
                      {p.agentName}
                    </TableCell>
                    <TableCell className="p-1.5 text-[10px] text-zinc-600 dark:text-zinc-400 max-w-[100px] truncate">
                      {p.vendorName}
                    </TableCell>
                    <TableCell className="p-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 max-w-[100px] truncate">
                      {p.packName || "\u2014"}
                    </TableCell>
                    <TableCell className="p-1.5 text-center">
                      <Badge
                        variant="outline"
                        className={cn("text-[9px] px-1 py-0", freshnessColor(p.leadFreshness))}
                      >
                        {p.leadFreshness}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-1.5 text-center">
                      <Badge
                        variant="outline"
                        className={cn("text-[9px] px-1 py-0", statusColor(p.status))}
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
