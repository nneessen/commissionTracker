// src/features/recruiting/components/PhaseTimeline.tsx
// Phase timeline with modern zinc palette styling

import React from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  SkipForward,
} from "lucide-react";
import type {
  RecruitPhaseProgress,
  PipelinePhase,
} from "@/types/recruiting.types";

interface PhaseTimelineProps {
  phaseProgress: RecruitPhaseProgress[];
  phases: PipelinePhase[];
  onPhaseClick?: (phaseId: string) => void;
}

export function PhaseTimeline({
  phaseProgress,
  phases,
  onPhaseClick,
}: PhaseTimelineProps) {
  const sortedPhases = [...phases].sort(
    (a, b) => a.phase_order - b.phase_order,
  );
  const progressMap = new Map(phaseProgress.map((p) => [p.phase_id, p]));

  const completedPhases = phaseProgress.filter(
    (p) => p.status === "completed",
  ).length;
  const totalPhases = phases.length;
  const progressPercentage =
    totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  const getPhaseIcon = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
        );
      case "in_progress":
        return <Clock className="h-5 w-5 text-amber-600 dark:text-amber-500" />;
      case "blocked":
        return (
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500" />
        );
      case "skipped":
        return (
          <SkipForward className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
        );
      default:
        return <Circle className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />;
    }
  };

  const getPhaseStyles = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-800 dark:hover:bg-emerald-950/50";
      case "in_progress":
        return "bg-amber-50 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-800 dark:hover:bg-amber-950/50";
      case "blocked":
        return "bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-950/30 dark:border-red-800 dark:hover:bg-red-950/50";
      case "skipped":
        return "bg-zinc-50 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800/30 dark:border-zinc-700 dark:hover:bg-zinc-800/50";
      default:
        return "bg-zinc-50 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800/30 dark:border-zinc-700 dark:hover:bg-zinc-800/50";
    }
  };

  const getBadgeStyles = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-600 text-white dark:bg-emerald-500";
      case "in_progress":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-800";
      case "blocked":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800";
      default:
        return "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress Summary */}
      <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Overall Progress
          </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {completedPhases}/{totalPhases} phases ({progressPercentage}%)
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Phase List */}
      <div className="space-y-2">
        {sortedPhases.map((phase, index) => {
          const progress = progressMap.get(phase.id);
          const status = progress?.status || "not_started";
          const isClickable = !!onPhaseClick;

          return (
            <div
              key={phase.id}
              className={`p-4 rounded-lg border transition-all ${getPhaseStyles(status)} ${
                isClickable ? "cursor-pointer" : ""
              }`}
              onClick={isClickable ? () => onPhaseClick(phase.id) : undefined}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getPhaseIcon(status)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {phase.phase_name}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Phase {index + 1} of {totalPhases}
                    </span>
                    <Badge
                      variant={status === "completed" ? "default" : "secondary"}
                      className={`text-xs px-2 py-0.5 capitalize ${getBadgeStyles(status)}`}
                    >
                      {status.replace("_", " ")}
                    </Badge>
                  </div>

                  {phase.phase_description && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                      {phase.phase_description}
                    </p>
                  )}

                  {progress?.blocked_reason && (
                    <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                      <span className="text-sm font-medium text-red-800 dark:text-red-300">
                        Blocked:{" "}
                      </span>
                      <span className="text-sm text-red-700 dark:text-red-400">
                        {progress.blocked_reason}
                      </span>
                    </div>
                  )}

                  {progress?.notes && !progress.blocked_reason && (
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 italic">
                      {progress.notes}
                    </p>
                  )}

                  {progress?.started_at && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>
                        Started:{" "}
                        {new Date(progress.started_at).toLocaleDateString()}
                      </span>
                      {progress.completed_at && (
                        <span>
                          Completed:{" "}
                          {new Date(progress.completed_at).toLocaleDateString()}
                        </span>
                      )}
                      {phase.estimated_days && status === "in_progress" && (
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          Est. {phase.estimated_days} days
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
