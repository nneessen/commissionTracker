// src/features/dashboard/components/TeamRecruitingSection.tsx

import React from "react";
import { cn } from "@/lib/utils";
import { Lock, Users, UserPlus, Bell } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { HierarchyStats } from "@/types/hierarchy.types";
import type { RecruitingStats } from "@/hooks/recruiting/useRecruitingStats";

interface TeamRecruitingSectionProps {
  hierarchyStats?: HierarchyStats | null;
  recruitingStats?: RecruitingStats | null;
  unreadNotifications: number;
  unreadMessages: number;
  hasAccess: boolean;
}

interface MetricItemProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

const MetricItem: React.FC<MetricItemProps> = ({ label, value, highlight }) => (
  <div className="flex justify-between items-center text-[11px] py-0.5">
    <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
    <span
      className={cn(
        "font-mono font-semibold",
        highlight
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-zinc-900 dark:text-zinc-100",
      )}
    >
      {value}
    </span>
  </div>
);

/**
 * Team Details Panel - Left column (smaller)
 */
const TeamDetailsPanel: React.FC<{
  hierarchyStats?: HierarchyStats | null;
}> = ({ hierarchyStats }) => (
  <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 h-full">
    <div className="flex items-center gap-1.5 mb-2">
      <Users className="h-3 w-3 text-zinc-400" />
      <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        Team Details
      </span>
    </div>
    <div className="space-y-0.5">
      <MetricItem
        label="Direct Downlines"
        value={hierarchyStats?.direct_downlines ?? 0}
      />
      <MetricItem
        label="Total Team Size"
        value={hierarchyStats?.total_downlines ?? 0}
      />
      <MetricItem label="Team Depth" value={hierarchyStats?.max_depth ?? 0} />
      <div className="border-t border-zinc-100 dark:border-zinc-800 my-1.5" />
      <MetricItem
        label="Override MTD"
        value={formatCurrency(hierarchyStats?.total_override_income_mtd ?? 0)}
        highlight={(hierarchyStats?.total_override_income_mtd ?? 0) > 0}
      />
      <MetricItem
        label="Override YTD"
        value={formatCurrency(hierarchyStats?.total_override_income_ytd ?? 0)}
        highlight={(hierarchyStats?.total_override_income_ytd ?? 0) > 0}
      />
    </div>
  </div>
);

/**
 * Recruiting Pipeline Panel - Middle column (larger)
 */
const RecruitingPipelinePanel: React.FC<{
  recruitingStats?: RecruitingStats | null;
}> = ({ recruitingStats }) => {
  const phases = [
    { key: "interview_1", label: "Interview" },
    { key: "zoom_interview", label: "Zoom Interview" },
    { key: "pre_licensing", label: "Pre-Licensing" },
    { key: "exam", label: "Exam" },
    { key: "npn_received", label: "NPN Received" },
    { key: "contracting", label: "Contracting" },
    { key: "bootcamp", label: "Bootcamp" },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 h-full">
      <div className="flex items-center gap-1.5 mb-2">
        <UserPlus className="h-3 w-3 text-zinc-400" />
        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Recruiting Pipeline
        </span>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3">
        <div className="text-center">
          <div className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {recruitingStats?.total ?? 0}
          </div>
          <div className="text-[9px] text-zinc-500 uppercase">Total</div>
        </div>
        <div className="text-center">
          <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
            {recruitingStats?.active ?? 0}
          </div>
          <div className="text-[9px] text-zinc-500 uppercase">Active</div>
        </div>
        <div className="text-center">
          <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {recruitingStats?.completed ?? 0}
          </div>
          <div className="text-[9px] text-zinc-500 uppercase">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-base sm:text-lg font-bold text-zinc-400">
            {recruitingStats?.dropped ?? 0}
          </div>
          <div className="text-[9px] text-zinc-500 uppercase">Dropped</div>
        </div>
      </div>

      {/* Phase Breakdown */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2">
        <div className="text-[9px] text-zinc-400 uppercase mb-1.5">
          By Phase
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-2 sm:gap-x-3 gap-y-0.5">
          {phases.map((phase) => (
            <div
              key={phase.key}
              className="flex justify-between items-center text-[10px]"
            >
              <span className="text-zinc-500 truncate">{phase.label}</span>
              <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                {recruitingStats?.byPhase?.[phase.key] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Messages & Notifications Panel - Right column (smaller)
 */
const MessagesNotificationsPanel: React.FC<{
  unreadNotifications: number;
  unreadMessages: number;
}> = ({ unreadNotifications, unreadMessages }) => (
  <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 h-full">
    <div className="flex items-center gap-1.5 mb-2">
      <Bell className="h-3 w-3 text-zinc-400" />
      <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        Communications
      </span>
    </div>
    <div className="space-y-2">
      {/* Unread Notifications */}
      <div className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded">
        <div>
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
            Notifications
          </div>
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Unread
          </div>
        </div>
        <div
          className={cn(
            "text-xl font-bold",
            unreadNotifications > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-zinc-400",
          )}
        >
          {unreadNotifications}
        </div>
      </div>

      {/* Unread Messages */}
      <div className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded">
        <div>
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
            Messages
          </div>
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Unread
          </div>
        </div>
        <div
          className={cn(
            "text-xl font-bold",
            unreadMessages > 0
              ? "text-blue-600 dark:text-blue-400"
              : "text-zinc-400",
          )}
        >
          {unreadMessages}
        </div>
      </div>
    </div>
  </div>
);

/**
 * Team & Recruiting Section - Premium gated 3-column layout
 */
export const TeamRecruitingSection: React.FC<TeamRecruitingSectionProps> = ({
  hierarchyStats,
  recruitingStats,
  unreadNotifications,
  unreadMessages,
  hasAccess,
}) => {
  const content = (
    <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-[260px_1fr_280px]">
      <TeamDetailsPanel hierarchyStats={hierarchyStats} />
      <RecruitingPipelinePanel recruitingStats={recruitingStats} />
      <div className="md:col-span-2 lg:col-span-1">
        <MessagesNotificationsPanel
          unreadNotifications={unreadNotifications}
          unreadMessages={unreadMessages}
        />
      </div>
    </div>
  );

  if (!hasAccess) {
    return (
      <div className="relative">
        <div className="blur-sm pointer-events-none select-none opacity-50">
          {content}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-zinc-900/60 rounded-lg">
          <div className="text-center p-4">
            <Lock className="h-6 w-6 text-zinc-400 mx-auto mb-2" />
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Team & Recruiting
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Upgrade to Team plan to access
            </div>
          </div>
        </div>
      </div>
    );
  }

  return content;
};
