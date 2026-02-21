// src/features/recruiting/components/ActivityTab.tsx
import { Activity, AlertCircle } from "lucide-react";

interface ActivityEntry {
  id: string;
  action_type: string;
  created_at: string;
}

interface ActivityTabProps {
  activityLog: ActivityEntry[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function ActivityTab({
  activityLog,
  isLoading,
  error,
}: ActivityTabProps) {
  if (error) {
    return (
      <div className="py-8 text-center">
        <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
        <p className="text-xs text-red-500">Failed to load activity log</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <Activity className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2 animate-pulse" />
        <p className="text-xs text-zinc-500">Loading activity...</p>
      </div>
    );
  }

  if (!activityLog || activityLog.length === 0) {
    return (
      <div className="py-8 text-center">
        <Activity className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
        <p className="text-xs text-zinc-500">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {activityLog.slice(0, 20).map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-2 py-1.5 px-2 rounded bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800"
        >
          <Activity className="h-3 w-3 text-zinc-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
              {activity.action_type.replace(/_/g, " ")}
            </p>
            <p className="text-[10px] text-zinc-400">
              {new Date(activity.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
