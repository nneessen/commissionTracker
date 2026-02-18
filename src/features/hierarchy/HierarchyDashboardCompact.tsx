// src/features/hierarchy/HierarchyDashboardCompact.tsx

import { useState, useMemo } from "react";
import { Download, UserPlus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyDownlines, useMyHierarchyStats } from "@/hooks";
import { useCurrentUserProfile } from "@/hooks/admin";
import { useFeatureAccess } from "@/hooks";
import { OWNER_EMAILS } from "@/hooks";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate } from "@/lib/format";
import { SendInvitationModal } from "./components/SendInvitationModal";
import { TeamMetricsCard } from "./components/TeamMetricsCard";
import { AgentTable } from "./components/AgentTable";
import { IssuedPremiumTable } from "./components/IssuedPremiumTable";
import { InvitationsList } from "./components/InvitationsList";
import { PendingInvitationBanner } from "./components/PendingInvitationBanner";
import { TeamActivityFeed } from "./components/TeamActivityFeed";
import { TeamAnalyticsDashboard } from "./components/TeamAnalyticsDashboard";
import { toast } from "sonner";
import { downloadCSV } from "@/utils/exportHelpers";
import type { UserProfile } from "@/types/hierarchy.types";
import {
  TimePeriodSwitcher,
  PeriodNavigator,
  DateRangeDisplay,
} from "@/features/dashboard";
import { getDateRange, type TimePeriod } from "@/utils/dateRange";

// Extended agent type with additional fields
interface Agent extends UserProfile {
  name?: string;
  is_active?: boolean;
  parent_agent_id?: string | null;
}

export function HierarchyDashboardCompact() {
  const { data: downlinesRaw = [], isLoading: downlinesLoading } =
    useMyDownlines();
  const { data: currentUserProfile } = useCurrentUserProfile();
  const { user } = useAuth();
  const { hasAccess: hasTeamAnalyticsAccess } =
    useFeatureAccess("team_analytics");

  // Owner (super-admin) always has access to team analytics
  const isOwner = OWNER_EMAILS.map((e) => e.toLowerCase()).includes(
    user?.email?.toLowerCase() ?? "",
  );
  const canViewTeamAnalytics = isOwner || hasTeamAnalyticsAccess;

  // Timeframe state
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("monthly");
  const [periodOffset, setPeriodOffset] = useState<number>(0);

  // Calculate date range from timeframe (memoized to ensure stable query keys)
  const { dateRange, startDate, endDate } = useMemo(() => {
    const range = getDateRange(timePeriod, periodOffset);
    return {
      dateRange: range,
      startDate: range.startDate.toISOString(),
      endDate: range.endDate.toISOString(),
    };
  }, [timePeriod, periodOffset]);

  // Handler for changing time period (resets offset)
  const handleTimePeriodChange = (newPeriod: TimePeriod) => {
    setTimePeriod(newPeriod);
    setPeriodOffset(0); // Reset to current period when granularity changes
  };

  // Fetch stats with date range
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useMyHierarchyStats({
    startDate,
    endDate,
  });

  // Transform UserProfile to Agent type
  const downlines: Agent[] = downlinesRaw.map((profile) => ({
    ...profile,
    name:
      `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
      profile.email,
    is_active: profile.approval_status === "approved",
    parent_agent_id: profile.upline_id,
  }));

  // Transform current user (owner) to Agent type for display in table
  const owner: Agent | null = currentUserProfile
    ? {
        ...currentUserProfile,
        name:
          `${currentUserProfile.first_name || ""} ${currentUserProfile.last_name || ""}`.trim() ||
          currentUserProfile.email,
        is_active: currentUserProfile.approval_status === "approved",
        parent_agent_id: currentUserProfile.upline_id,
      }
    : null;

  const [sendInvitationModalOpen, setSendInvitationModalOpen] = useState(false);

  const handleExportCSV = () => {
    try {
      const exportData = downlines.map((agent) => ({
        Name: agent.name || "N/A",
        Email: agent.email || "N/A",
        "Contract Level": agent.contract_level || 100,
        Status: agent.is_active ? "Active" : "Inactive",
        "Join Date": agent.created_at ? formatDate(agent.created_at) : "N/A",
        "MTD Override": formatCurrency(0), // Would need actual data
        "YTD Override": formatCurrency(0), // Would need actual data
      }));

      downloadCSV(exportData, "team-hierarchy");
      toast.success("Team data exported to CSV!");
    } catch (_error) {
      toast.error("Failed to export CSV");
    }
  };

  const isLoading = downlinesLoading || statsLoading;
  const hasError = statsError;

  return (
    <>
      <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5">
        {/* Compact Header */}
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
            <div>
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Team Hierarchy
              </h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Manage agents, track overrides, and monitor team performance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* BUTTON TO ORG CHART -> TODO: ORG CHART ITSELF IS BROKEN*/}
            {/*<Button
              onClick={() => navigate({ to: "/hierarchy/org-chart" })}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <Building2 className="h-3 w-3 mr-1" />
              Org Chart
            </Button>
            */}
            <Button
              onClick={handleExportCSV}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <Download className="h-3 w-3 mr-1" />
              CSV
            </Button>
            <Button
              onClick={() => setSendInvitationModalOpen(true)}
              size="sm"
              className="h-6 px-2 text-[10px]"
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Invite
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto space-y-2">
          {/* Pending Invitation Banner (for invitees) */}
          <PendingInvitationBanner />

          {/* Timeframe Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
            <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide shrink-0">
              Team Metrics
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
              <TimePeriodSwitcher
                timePeriod={timePeriod}
                onTimePeriodChange={handleTimePeriodChange}
              />
              <PeriodNavigator
                timePeriod={timePeriod}
                periodOffset={periodOffset}
                onOffsetChange={setPeriodOffset}
                dateRange={dateRange}
              />
              <DateRangeDisplay timePeriod={timePeriod} dateRange={dateRange} />
            </div>
          </div>

          {/* Team Metrics Card */}
          <TeamMetricsCard
            stats={stats}
            agentCount={downlines.length}
            isLoading={isLoading}
            isError={hasError}
            onRetry={refetchStats}
            timePeriod={timePeriod}
          />

          {/* Agent Table - Submissions (all policies by effective_date) */}
          <AgentTable
            agents={downlines}
            owner={owner}
            isLoading={isLoading}
            dateRange={{ start: startDate, end: endDate }}
          />

          {/* Issued Premium Table - Active policies only */}
          <IssuedPremiumTable
            agents={downlines}
            owner={owner}
            isLoading={isLoading}
            dateRange={{ start: startDate, end: endDate }}
          />

          {/* Team Analytics Dashboard - Premium Feature (Team tier or Owner) */}
          {downlines.length > 0 && canViewTeamAnalytics && (
            <TeamAnalyticsDashboard
              startDate={startDate}
              endDate={endDate}
              teamUserIds={
                owner
                  ? [owner.id, ...downlines.map((d) => d.id)]
                  : downlines.map((d) => d.id)
              }
            />
          )}

          {/* Bottom Grid: Invitations and Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            <InvitationsList />
            <TeamActivityFeed agents={downlines} />
          </div>

          {/* Performance Insights */}
          {stats && stats.direct_downlines > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 mt-0.5" />
                <div className="text-[11px]">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    Team Performance Insights
                  </span>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 space-y-0.5">
                    {stats.total_downlines < 5 && (
                      <p>
                        • Build your team: You have {stats.total_downlines}{" "}
                        agents. Consider recruiting more to increase override
                        income.
                      </p>
                    )}
                    {stats.total_override_income_mtd === 0 && (
                      <p>
                        • No override income this month. Check agent activity
                        and commission settings.
                      </p>
                    )}
                    {stats.direct_downlines > 10 && (
                      <p>
                        • Great team size! Focus on helping underperforming
                        agents improve their results.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send Invitation Modal */}
      <SendInvitationModal
        open={sendInvitationModalOpen}
        onOpenChange={setSendInvitationModalOpen}
      />
    </>
  );
}
