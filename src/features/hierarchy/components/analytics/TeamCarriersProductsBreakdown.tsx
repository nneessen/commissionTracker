// src/features/hierarchy/components/analytics/TeamCarriersProductsBreakdown.tsx

import React from "react";
import { cn } from "@/lib/utils";
import type { TeamCarrierBreakdown } from "@/types/team-analytics.types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TeamCarriersProductsBreakdownProps {
  data: TeamCarrierBreakdown[];
  isLoading?: boolean;
}

/**
 * TeamCarriersProductsBreakdown - Team premium by carrier and product
 */
export function TeamCarriersProductsBreakdown({
  data,
  isLoading,
}: TeamCarriersProductsBreakdownProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Team Carriers & Products
        </div>
        <div className="p-3 text-center text-[10px] text-zinc-500 dark:text-zinc-400">
          Loading...
        </div>
      </div>
    );
  }

  // Format product names from snake_case to Title Case
  const formatProductName = (product: string): string => {
    return product
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Prepare flattened data for table
  interface TableRowData {
    isCarrier: boolean;
    name: string;
    policies: number;
    premium: number;
    avgRate: number;
    commission: number;
  }

  const tableData: TableRowData[] = [];
  data.forEach((carrier) => {
    // Add carrier summary row
    tableData.push({
      isCarrier: true,
      name: carrier.carrierName,
      policies: carrier.policyCount,
      premium: carrier.totalPremium,
      avgRate: carrier.avgCommissionRate,
      commission: carrier.totalCommission,
    });

    // Add product rows (top 3 products per carrier)
    carrier.products.slice(0, 3).forEach((product) => {
      tableData.push({
        isCarrier: false,
        name: `  → ${formatProductName(product.name)}`,
        policies: product.policyCount,
        premium: product.totalPremium,
        avgRate: product.avgCommissionRate,
        commission: product.totalCommission,
      });
    });
  });

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Team Carriers & Products
        </div>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
          {data.length} carriers
        </span>
      </div>

      {tableData.length > 0 ? (
        <Table className="text-[11px]">
          <TableHeader>
            <TableRow className="h-7 border-b border-zinc-200 dark:border-zinc-800">
              <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                Carrier / Product
              </TableHead>
              <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                Policies
              </TableHead>
              <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                Premium
              </TableHead>
              <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                Rate
              </TableHead>
              <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                Commission
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row, idx) => (
              <TableRow
                key={idx}
                className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <TableCell className="p-1.5">
                  <span
                    className={cn(
                      row.isCarrier
                        ? "font-semibold text-zinc-900 dark:text-zinc-100"
                        : "text-[9px] text-zinc-500 dark:text-zinc-400"
                    )}
                  >
                    {row.name}
                  </span>
                </TableCell>
                <TableCell className="p-1.5 text-right font-mono text-zinc-500 dark:text-zinc-400">
                  {row.policies}
                </TableCell>
                <TableCell className="p-1.5 text-right font-mono text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(row.premium)}
                </TableCell>
                <TableCell className="p-1.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                  {row.avgRate.toFixed(1)}%
                </TableCell>
                <TableCell className="p-1.5 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(row.commission)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="p-3 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
          No carrier data available
        </div>
      )}
    </div>
  );
}
