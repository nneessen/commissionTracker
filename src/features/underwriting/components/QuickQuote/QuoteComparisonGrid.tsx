// src/features/underwriting/components/QuickQuote/QuoteComparisonGrid.tsx
// 3-column comparison grid for Quick Quote results

import { Fragment, useMemo } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  QuickQuoteResult,
  QuickQuoteProductType,
} from "@/services/underwriting/quickQuoteCalculator";

// =============================================================================
// Types
// =============================================================================

interface QuoteComparisonGridProps {
  quotes: QuickQuoteResult[];
  mode: "coverage" | "budget";
  amounts: [number, number, number];
  isLoading?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

function formatCurrency(value: number | null): string {
  if (value === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrencyCompact(value: number | null): string {
  if (value === null) return "N/A";
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return formatCurrency(value);
}

function formatCostPerThousand(value: number | null): string {
  if (value === null) return "-";
  return `$${value.toFixed(2)}`;
}

function getProductTypeBadge(productType: QuickQuoteProductType): {
  label: string;
  variant: "default" | "secondary" | "outline";
} {
  switch (productType) {
    case "term_life":
      return { label: "Term", variant: "default" };
    case "whole_life":
      return { label: "Whole Life", variant: "secondary" };
    case "participating_whole_life":
      return { label: "Part. WL", variant: "outline" };
    case "indexed_universal_life":
      return { label: "IUL", variant: "outline" };
    default:
      return { label: productType, variant: "default" };
  }
}

function getProductTypeOrder(productType: QuickQuoteProductType): number {
  const order: Record<QuickQuoteProductType, number> = {
    term_life: 1,
    whole_life: 2,
    participating_whole_life: 3,
    indexed_universal_life: 4,
  };
  return order[productType] ?? 99;
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function GridSkeleton() {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2">
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="grid grid-cols-5 gap-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center p-8 text-center border rounded-lg bg-muted/30">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// =============================================================================
// Product Group Header
// =============================================================================

function ProductGroupHeader({
  productType,
  termYears,
}: {
  productType: QuickQuoteProductType;
  termYears: number | null;
}) {
  const { label } = getProductTypeBadge(productType);
  const displayLabel =
    productType === "term_life" && termYears
      ? `${label} (${termYears}yr)`
      : label;

  return (
    <TableRow className="bg-muted/50 hover:bg-muted/50">
      <TableCell
        colSpan={5}
        className="py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {displayLabel}
      </TableCell>
    </TableRow>
  );
}

// =============================================================================
// Quote Row
// =============================================================================

function QuoteRow({
  quote,
  mode,
  isFirst,
}: {
  quote: QuickQuoteResult;
  mode: "coverage" | "budget";
  isFirst: boolean;
}) {
  // Find lowest cost column to highlight
  const lowestCostIndex = useMemo(() => {
    const costs = quote.columns.map((c, i) => ({
      cost: c.costPerThousand,
      index: i,
    }));
    const validCosts = costs.filter((c) => c.cost !== null);
    if (validCosts.length === 0) return -1;
    validCosts.sort((a, b) => a.cost! - b.cost!);
    return validCosts[0].index;
  }, [quote.columns]);

  const hasAnyValid = quote.columns.some((c) =>
    mode === "coverage" ? c.premium !== null : c.coverage !== null,
  );

  if (!hasAnyValid) {
    // All columns are N/A - show condensed row
    return (
      <TableRow className="opacity-50">
        <TableCell className="py-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate max-w-[140px]">
              {quote.carrierName}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              {quote.productName}
            </span>
          </div>
        </TableCell>
        <TableCell colSpan={3} className="py-1.5 text-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground">
                No rates available
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>This product doesn&apos;t have rates for these amounts</p>
            </TooltipContent>
          </Tooltip>
        </TableCell>
        <TableCell className="py-1.5 text-center text-muted-foreground">
          -
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className={cn(isFirst && "border-t-2 border-primary/20")}>
      {/* Carrier/Product Name */}
      <TableCell className="py-1.5 min-w-[180px]">
        <div className="flex flex-col">
          <span
            className="text-sm font-medium truncate"
            title={quote.carrierName}
          >
            {quote.carrierName}
          </span>
          <span
            className="text-xs text-muted-foreground truncate"
            title={quote.productName}
          >
            {quote.productName}
          </span>
        </div>
      </TableCell>

      {/* 3 Amount Columns */}
      {quote.columns.map((col, idx) => {
        const isLowest =
          idx === lowestCostIndex &&
          quote.columns.filter((c) => c.costPerThousand !== null).length > 1;
        const value = mode === "coverage" ? col.premium : col.coverage;
        const displayValue =
          mode === "coverage"
            ? formatCurrency(col.premium)
            : formatCurrencyCompact(col.coverage);

        return (
          <TableCell
            key={idx}
            className={cn(
              "py-1.5 text-center tabular-nums",
              isLowest && "bg-green-50 dark:bg-green-950/30",
              value === null && "text-muted-foreground",
            )}
          >
            {value !== null ? (
              <span
                className={cn(
                  "text-sm",
                  isLowest &&
                    "font-semibold text-green-700 dark:text-green-400",
                )}
              >
                {displayValue}
                {mode === "coverage" && (
                  <span className="text-xs text-muted-foreground">/mo</span>
                )}
              </span>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs">N/A</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rate not available for this amount</p>
                </TooltipContent>
              </Tooltip>
            )}
          </TableCell>
        );
      })}

      {/* Cost per $1k */}
      <TableCell className="py-1.5 text-center tabular-nums">
        <span className="text-xs text-muted-foreground">
          {formatCostPerThousand(quote.avgCostPerThousand)}
        </span>
      </TableCell>
    </TableRow>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function QuoteComparisonGrid({
  quotes,
  mode,
  amounts,
  isLoading = false,
}: QuoteComparisonGridProps) {
  // Group quotes by product type
  const groupedQuotes = useMemo(() => {
    const groups = new Map<string, QuickQuoteResult[]>();

    for (const quote of quotes) {
      // Group key includes term years for term products
      const groupKey =
        quote.productType === "term_life" && quote.termYears
          ? `${quote.productType}-${quote.termYears}`
          : quote.productType;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(quote);
    }

    // Sort groups by product type order
    const sortedGroups = [...groups.entries()].sort((a, b) => {
      const aType = a[1][0]?.productType ?? "term_life";
      const bType = b[1][0]?.productType ?? "term_life";
      const aTermYears = a[1][0]?.termYears ?? 0;
      const bTermYears = b[1][0]?.termYears ?? 0;

      const typeOrder = getProductTypeOrder(aType) - getProductTypeOrder(bType);
      if (typeOrder !== 0) return typeOrder;
      return aTermYears - bTermYears;
    });

    return sortedGroups;
  }, [quotes]);

  if (isLoading) {
    return <GridSkeleton />;
  }

  if (quotes.length === 0) {
    return (
      <EmptyState message="Select products and enter demographics to see quotes" />
    );
  }

  return (
    <TooltipProvider>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[180px] py-2 text-xs font-semibold">
                Product
              </TableHead>
              {amounts.map((amount, idx) => (
                <TableHead
                  key={idx}
                  className="py-2 text-center text-xs font-semibold tabular-nums"
                >
                  {mode === "coverage" ? (
                    formatCurrencyCompact(amount)
                  ) : (
                    <>{formatCurrency(amount)}/mo</>
                  )}
                </TableHead>
              ))}
              <TableHead className="w-[70px] py-2 text-center text-xs font-semibold">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">$/1k</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Average cost per $1,000 of coverage</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedQuotes.map(([groupKey, groupQuotes]) => {
              const firstQuote = groupQuotes[0];
              if (!firstQuote) return null;

              return (
                <Fragment key={groupKey}>
                  <ProductGroupHeader
                    productType={firstQuote.productType}
                    termYears={firstQuote.termYears}
                  />
                  {groupQuotes.map((quote, idx) => (
                    <QuoteRow
                      key={`${quote.productId}-${quote.termYears ?? "wl"}`}
                      quote={quote}
                      mode={mode}
                      isFirst={idx === 0}
                    />
                  ))}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
