import { Badge } from "@/components/ui/badge";
import type { DifficultyLevel } from "../../types/training-module.types";

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  beginner:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  intermediate:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  advanced: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function DifficultyBadge({ level }: { level: DifficultyLevel }) {
  return (
    <Badge
      variant="secondary"
      className={`text-[10px] px-1.5 py-0 h-4 capitalize ${DIFFICULTY_COLORS[level]}`}
    >
      {level}
    </Badge>
  );
}
