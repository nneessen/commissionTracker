// src/features/hierarchy/HierarchyDashboardCompact.tsx

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Download,
  UserPlus,
  Search,
  Filter,
  AlertCircle,
  Building2,
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
import { useAuth } from "@/contexts/AuthContext";
import { useMyDownlines, useMyHierarchyStats } from "@/hooks";
import { formatCurrency, formatDate } from "@/lib/format";
import { SendInvitationModal } from "./components/SendInvitationModal";
import { TeamMetricsCard } from "./components/TeamMetricsCard";
import { AgentTable } from "./components/AgentTable";
import { InvitationsList } from "./components/InvitationsList";
import { PendingInvitationBanner } from "./components/PendingInvitationBanner";
import { TeamActivityFeed } from "./components/TeamActivityFeed";
import { toast } from "sonner";
import { downloadCSV } from "@/utils/exportHelpers";
import type { UserProfile } from "@/types/hierarchy.types";
import { TimePeriodSwitcher } from "@/features/dashboard/components/TimePeriodSwitcher";
import { PeriodNavigator } from "@/features/dashboard/components/PeriodNavigator";
import { DateRangeDisplay } from "@/features/dashboard/components/DateRangeDisplay";
import { getDateRange, type TimePeriod } from "@/utils/dateRange";

// Extended agent type with additional fields
interface Agent extends UserProfile {
  name?: string;
  is_active?: boolean;
  parent_agent_id?: string | null;
}

interface TeamFilters {
  status: "all" | "active" | "inactive" | "pending";
  directOnly: boolean;
  searchTerm: string;
}

export function HierarchyDashboardCompact() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: downlinesRaw = [], isLoading: downlinesLoading } =
    useMyDownlines();

  // Timeframe state
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("monthly");
  const [periodOffset, setPeriodOffset] = useState<number>(0);

  // Calculate date range from timeframe
  const dateRange = getDateRange(timePeriod, periodOffset);
  const startDate = dateRange.startDate.toISOString();
  const endDate = dateRange.endDate.toISOString();

  // Handler for changing time period (resets offset)
  const handleTimePeriodChange = (newPeriod: TimePeriod) => {
    setTimePeriod(newPeriod);
    setPeriodOffset(0); // Reset to current period when granularity changes
  };

  // Fetch stats with date range
  const { data: stats, isLoading: statsLoading } = useMyHierarchyStats({
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

  const [sendInvitationModalOpen, setSendInvitationModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<TeamFilters>({
    status: "active",
    directOnly: false,
    searchTerm: "",
  });

  // Update filters when search changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, searchTerm }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Calculate filter count (excluding default "active" status)
  const filterCount =
    (filters.status !== "active" ? 1 : 0) +
    (filters.directOnly ? 1 : 0) +
    (filters.searchTerm ? 1 : 0);

  const clearFilters = () => {
    setFilters({
      status: "active",
      directOnly: false,
      searchTerm: "",
    });
    setSearchTerm("");
  };

  // Filter agents based on criteria
  const filteredAgents = useMemo(() => {
    let agents = [...downlines];

    // Apply search filter
    if (filters.searchTerm) {
      agents = agents.filter(
        (agent) =>
          agent.name
            ?.toLowerCase()
            .includes(filters.searchTerm.toLowerCase()) ||
          agent.email?.toLowerCase().includes(filters.searchTerm.toLowerCase()),
      );
    }

    // Apply status filter
    if (filters.status !== "all") {
      agents = agents.filter((agent) => {
        if (filters.status === "active") return agent.is_active;
        if (filters.status === "inactive") return !agent.is_active;
        if (filters.status === "pending")
          return agent.approval_status === "pending";
        return true;
      });
    }

    // Apply direct only filter
    if (filters.directOnly) {
      agents = agents.filter((agent) => agent.parent_agent_id === user?.id);
    }

    return agents;
  }, [downlines, filters, user?.id]);

  const handleExportCSV = () => {
    try {
      const exportData = filteredAgents.map((agent) => ({
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

  return (
    <>
      <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
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
            <Button
              onClick={() => navigate({ to: "/hierarchy/org-chart" })}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <Building2 className="h-3 w-3 mr-1" />
              Org Chart
            </Button>
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
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Team Metrics
            </div>
            <div className="flex items-center gap-2">
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
          />

          {/* Search and Filters Bar */}
          <div className="flex gap-2 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
            <div className="flex-1 relative flex items-center">
              <Search
                size={14}
                className="absolute left-2 text-zinc-400 dark:text-zinc-500"
              />
              <Input
                type="text"
                placeholder="Search agents by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-6 pl-7 text-[11px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? "default" : "outline"}
              size="sm"
              className="h-6 px-2 text-[10px]"
            >
              <Filter size={12} className="mr-1" />
              Filters {filterCount > 0 && `(${filterCount})`}
            </Button>
            {filterCount > 0 && (
              <Button
                onClick={clearFilters}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-zinc-600 dark:text-zinc-400"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Collapsible Filter Panel */}
          {showFilters && (
            <div className="flex gap-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: value as TeamFilters["status"],
                  }))
                }
              >
                <SelectTrigger className="h-6 w-[110px] text-[10px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <label className="flex items-center gap-1.5 text-[10px] text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={filters.directOnly}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      directOnly: e.target.checked,
                    }))
                  }
                  className="h-3 w-3"
                />
                Direct Only
              </label>
            </div>
          )}

          {/* Agent Table */}
          <AgentTable
            agents={filteredAgents}
            isLoading={isLoading}
            dateRange={{ start: startDate, end: endDate }}
          />

          {/* Bottom Grid: Invitations and Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            <InvitationsList />
            <TeamActivityFeed agents={filteredAgents} />
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
