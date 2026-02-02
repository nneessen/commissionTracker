// src/features/leaderboard/LeaderboardPage.tsx
// Main leaderboard page - data-dense brutalist design

import { useState } from "react";
import {
  Trophy,
  Users,
  Building2,
  Calendar,
  TrendingUp,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAgentLeaderboard,
  useAgencyLeaderboard,
  useTeamLeaderboard,
  useSubmitLeaderboard,
} from "@/hooks/leaderboard";
import { LeaderboardTable } from "./components/LeaderboardTable";
import { MetricsHelpPopover } from "./components/MetricsHelpPopover";
import { cn } from "@/lib/utils";
import { formatCompactCurrency } from "@/lib/format";
import type {
  LeaderboardFilters,
  LeaderboardTimePeriod,
  LeaderboardScope,
  TeamThreshold,
} from "@/types/leaderboard.types";

const timePeriods: { value: LeaderboardTimePeriod; label: string }[] = [
  { value: "mtd", label: "MTD" },
  { value: "ytd", label: "YTD" },
  { value: "custom", label: "Custom" },
];

const scopes: { value: LeaderboardScope; label: string }[] = [
  { value: "submit", label: "Submit" },
  { value: "all", label: "Agents" },
  { value: "agency", label: "Agencies" },
  { value: "team", label: "Teams" },
];

const thresholds: { value: TeamThreshold; label: string }[] = [
  { value: 3, label: "3+" },
  { value: 5, label: "5+" },
  { value: 10, label: "10+" },
];

export function LeaderboardPage() {
  const [filters, setFilters] = useState<LeaderboardFilters>({
    timePeriod: "mtd",
    scope: "all",
    teamThreshold: 5,
  });

  // Determine which query to run based on scope
  const queryEnabled =
    filters.timePeriod !== "custom" ||
    (!!filters.startDate && !!filters.endDate);

  const agentQuery = useAgentLeaderboard({
    filters,
    enabled: queryEnabled && filters.scope === "all",
  });

  const agencyQuery = useAgencyLeaderboard({
    filters,
    enabled: queryEnabled && filters.scope === "agency",
  });

  const teamQuery = useTeamLeaderboard({
    filters,
    enabled: queryEnabled && filters.scope === "team",
  });

  const submitQuery = useSubmitLeaderboard({
    filters,
    enabled: queryEnabled && filters.scope === "submit",
  });

  // Get the active query data
  const activeQuery =
    filters.scope === "submit"
      ? submitQuery
      : filters.scope === "agency"
        ? agencyQuery
        : filters.scope === "team"
          ? teamQuery
          : agentQuery;

  const { data, isLoading, error } = activeQuery;
  const totals = data?.totals;

  // Update a filter value
  const updateFilter = <K extends keyof LeaderboardFilters>(
    key: K,
    value: LeaderboardFilters[K],
  ) => {
    const newFilters = { ...filters, [key]: value };

    if (key === "timePeriod" && value !== "custom") {
      newFilters.startDate = undefined;
      newFilters.endDate = undefined;
    }

    setFilters(newFilters);
  };

  // Determine label based on scope
  const entryLabel =
    filters.scope === "submit"
      ? "agents"
      : filters.scope === "agency"
        ? "agencies"
        : filters.scope === "team"
          ? "teams"
          : "agents";

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
      {/* Compact Header + Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        {/* Title + Help */}
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Leaderboard
            </h1>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {filters.scope === "submit"
                ? "Rankings by Submitted Premium (AP)"
                : "Rankings by Issued Premium (IP)"}
            </p>
          </div>
          <MetricsHelpPopover />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Selector */}
          <div className="flex items-center gap-1 p-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
            {scopes.map((s) => (
              <Button
                key={s.value}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 px-2.5 text-[10px] font-medium rounded",
                  filters.scope === s.value
                    ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700",
                )}
                onClick={() => updateFilter("scope", s.value)}
              >
                {s.value === "submit" && <FileText className="h-3 w-3 mr-1" />}
                {s.value === "all" && <Users className="h-3 w-3 mr-1" />}
                {s.value === "agency" && <Building2 className="h-3 w-3 mr-1" />}
                {s.value === "team" && <TrendingUp className="h-3 w-3 mr-1" />}
                {s.label}
              </Button>
            ))}
          </div>

          {/* Team Threshold (only when team scope selected) */}
          {filters.scope === "team" && (
            <Select
              value={String(filters.teamThreshold || 5)}
              onValueChange={(v) =>
                updateFilter("teamThreshold", Number(v) as TeamThreshold)
              }
            >
              <SelectTrigger className="h-6 w-16 text-[10px] border-zinc-200 dark:border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {thresholds.map((t) => (
                  <SelectItem key={t.value} value={String(t.value)}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />

          {/* Time Period */}
          <div className="flex items-center gap-1 p-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
            {timePeriods.map((p) => (
              <Button
                key={p.value}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 px-2 text-[10px] font-medium rounded",
                  filters.timePeriod === p.value
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700",
                )}
                onClick={() => updateFilter("timePeriod", p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {filters.timePeriod === "custom" && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-zinc-400" />
              <Input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => updateFilter("startDate", e.target.value)}
                className="h-6 w-28 text-[10px] px-1.5"
              />
              <span className="text-[10px] text-zinc-400">-</span>
              <Input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => updateFilter("endDate", e.target.value)}
                className="h-6 w-28 text-[10px] px-1.5"
              />
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-4 text-[10px]">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </>
          ) : totals ? (
            <>
              <div className="flex items-center gap-1">
                <span className="text-zinc-500 dark:text-zinc-400">
                  {totals.totalEntries}
                </span>
                <span className="text-zinc-400 dark:text-zinc-500">
                  {entryLabel}
                </span>
              </div>
              {/* Show IP only for non-submit scopes */}
              {filters.scope !== "submit" && "totalIp" in totals && (
                <div className="flex items-center gap-1">
                  <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                    {formatCompactCurrency(totals.totalIp)}
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500">IP</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    "font-mono",
                    filters.scope === "submit"
                      ? "font-semibold text-amber-600 dark:text-amber-400"
                      : "text-zinc-600 dark:text-zinc-300",
                  )}
                >
                  {formatCompactCurrency(totals.totalAp)}
                </span>
                <span className="text-zinc-400 dark:text-zinc-500">AP</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-500 dark:text-zinc-400">
                  {totals.totalPolicies}
                </span>
                <span className="text-zinc-400 dark:text-zinc-500">
                  {filters.scope === "submit" ? "submitted" : "policies"}
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <LeaderboardTable
          scope={filters.scope}
          entries={data?.entries || []}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
}
