import { Flame } from "lucide-react";

export function StreakIndicator({ days }: { days: number }) {
  const isActive = days > 0;

  return (
    <div className="flex items-center gap-1">
      <Flame
        className={`h-3 w-3 ${isActive ? "text-orange-500" : "text-zinc-300 dark:text-zinc-600"}`}
      />
      <span
        className={`font-bold text-[11px] ${isActive ? "text-orange-600 dark:text-orange-400" : "text-zinc-400"}`}
      >
        {days}
      </span>
      <span className="text-zinc-400 text-[10px]">
        day{days !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
