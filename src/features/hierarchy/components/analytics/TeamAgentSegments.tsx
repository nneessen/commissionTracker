// src/features/hierarchy/components/analytics/TeamAgentSegments.tsx

import React from "react";
import { cn } from "@/lib/utils";
import type {
  AgentSegmentationSummary,
  AgentPerformanceData,
} from "@/types/team-analytics.types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, TrendingUp, AlertTriangle } from "lucide-react";

interface TeamAgentSegmentsProps {
  data: AgentSegmentationSummary | null;
  isLoading?: boolean;
}

/**
 * TeamAgentSegments - Agent performance segmentation
 *
 * Replaces ClientSegmentation for team context.
 * Segments agents into top performers, solid performers, and needs attention.
 */
export function TeamAgentSegments({ data, isLoading }: TeamAgentSegmentsProps) {
  if (isLoading || !data) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Agent Segments
        </div>
        <div className="p-3 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
          {isLoading ? "Loading..." : "No data available"}
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Segment cards configuration
  const segments = [
    {
      label: "Top Performers",
      description: "Top 20% by AP",
      data: data.topPerformers,
      icon: Trophy,
      color: "emerald",
    },
    {
      label: "Solid Performers",
      description: "Middle 30%",
      data: data.solidPerformers,
      icon: TrendingUp,
      color: "blue",
    },
    {
      label: "Needs Attention",
      description: "Bottom 50%",
      data: data.needsAttention,
      icon: AlertTriangle,
      color: "amber",
    },
  ];

  const getColorClass = (color: string, type: "text" | "bg" | "border") => {
    const colors: Record<string, Record<string, string>> = {
      emerald: {
        text: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
      },
      blue: {
        text: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
      },
      amber: {
        text: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
      },
    };
    return colors[color]?.[type] || "";
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Agent Segments
          </div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {data.totalAgents} agents • {formatCurrency(data.totalTeamAP)} total AP
          </div>
        </div>
        <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
          Avg: {formatCurrency(data.avgAgentAP)}
        </div>
      </div>

      {/* Segment Cards */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {segments.map((segment) => {
          const Icon = segment.icon;
          const percentOfTeam =
            data.totalAgents > 0
              ? ((segment.data.agentCount / data.totalAgents) * 100).toFixed(0)
              : "0";
          const percentOfAP =
            data.totalTeamAP > 0
              ? ((segment.data.totalAP / data.totalTeamAP) * 100).toFixed(0)
              : "0";

          return (
            <div
              key={segment.label}
              className={cn(
                "p-2 rounded border",
                getColorClass(segment.color, "bg"),
                getColorClass(segment.color, "border")
              )}
            >
              <div className="flex items-center gap-1 mb-1">
                <Icon
                  className={cn("h-3 w-3", getColorClass(segment.color, "text"))}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    getColorClass(segment.color, "text")
                  )}
                >
                  {segment.label}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  className={cn(
                    "font-mono font-bold text-sm",
                    getColorClass(segment.color, "text")
                  )}
                >
                  {segment.data.agentCount}
                </span>
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
                  agents ({percentOfTeam}%)
                </span>
              </div>
              <div className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {formatCurrency(segment.data.totalAP)} ({percentOfAP}% of team AP)
              </div>
            </div>
          );
        })}
      </div>

      {/* Top 5 Performers Table */}
      {data.topPerformers.agents.length > 0 && (
        <>
          <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Top 5 Agents
          </div>
          <Table className="text-[11px]">
            <TableHeader>
              <TableRow className="h-7 border-b border-zinc-200 dark:border-zinc-800">
                <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                  Agent
                </TableHead>
                <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                  Policies
                </TableHead>
                <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                  AP
                </TableHead>
                <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                  Persist
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topPerformers.agents.slice(0, 5).map((agent, idx) => (
                <TableRow
                  key={agent.agentId}
                  className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <TableCell className="p-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
                        #{idx + 1}
                      </span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[120px]">
                        {agent.agentName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="p-1.5 text-right font-mono text-zinc-500 dark:text-zinc-400">
                    {agent.policyCount}
                  </TableCell>
                  <TableCell className="p-1.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(agent.totalAP)}
                  </TableCell>
                  <TableCell className="p-1.5 text-right">
                    <span
                      className={cn(
                        "font-mono",
                        agent.persistencyRate >= 80
                          ? "text-emerald-600 dark:text-emerald-400"
                          : agent.persistencyRate >= 60
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {agent.persistencyRate.toFixed(0)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
