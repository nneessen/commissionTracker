import { Link } from "@tanstack/react-router";
import { Clock, ChevronRight, AlertCircle } from "lucide-react";
import { CategoryBadge } from "../shared/CategoryBadge";
import { DifficultyBadge } from "../shared/DifficultyBadge";
import { ProgressBar } from "../shared/ProgressBar";
import type { TrainingAssignment } from "../../types/training-module.types";
import { useModuleProgressSummary } from "../../hooks/useTrainingProgress";

interface ModuleCardProps {
  assignment: TrainingAssignment;
}

export function ModuleCard({ assignment }: ModuleCardProps) {
  const module = assignment.module;
  const { data: progress = [] } = useModuleProgressSummary(
    assignment.module_id,
  );

  if (!module) return null;

  const totalLessons = progress.length;
  const completedLessons = progress.filter(
    (p) => p.status === "completed",
  ).length;
  const isOverdue =
    assignment.due_date && new Date(assignment.due_date) < new Date();

  return (
    <Link
      to={"/my-training/$moduleId" as string}
      params={{ moduleId: module.id } as Record<string, string>}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-xs font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1">
            {module.title}
          </h3>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300 flex-shrink-0" />
        </div>

        <div className="flex items-center gap-1.5 mb-2">
          <CategoryBadge category={module.category} />
          <DifficultyBadge level={module.difficulty_level} />
          {module.estimated_duration_minutes && (
            <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {module.estimated_duration_minutes}m
            </span>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-500">
              {completedLessons}/{totalLessons} lessons
            </span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {totalLessons > 0
                ? Math.round((completedLessons / totalLessons) * 100)
                : 0}
              %
            </span>
          </div>
          <ProgressBar value={completedLessons} max={totalLessons} />
        </div>

        {isOverdue && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-red-500">
            <AlertCircle className="h-2.5 w-2.5" />
            Overdue
          </div>
        )}

        {assignment.due_date && !isOverdue && (
          <div className="text-[10px] text-zinc-400 mt-1">
            Due {new Date(assignment.due_date).toLocaleDateString()}
          </div>
        )}
      </div>
    </Link>
  );
}
