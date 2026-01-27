// src/features/training-hub/components/AgencyPipelineOverview.tsx
// Agency pipeline comparison for trainers/contracting managers

import { useState, useMemo } from "react";
import {
  Users,
  Clock,
  CheckCircle2,
  TrendingDown,
  UserPlus,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useAgencyPipelineStats,
  aggregateMetrics,
  type AgencyMetrics,
} from "../hooks/useAgencyPipelineStats";

export function AgencyPipelineOverview() {
  const { data: agencyStats, isLoading, error } = useAgencyPipelineStats();
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("all");

  const aggregatedMetrics = useMemo(() => {
    if (!agencyStats || agencyStats.length === 0) return null;
    return aggregateMetrics(agencyStats);
  }, [agencyStats]);

  const selectedAgency = useMemo(() => {
    if (selectedAgencyId === "all" || !agencyStats) return null;
    return agencyStats.find((a) => a.templateId === selectedAgencyId) || null;
  }, [selectedAgencyId, agencyStats]);

  const currentMetrics: AgencyMetrics | null = selectedAgency
    ? selectedAgency.metrics
    : aggregatedMetrics;

  const agenciesWithActivity = useMemo(() => {
    if (!agencyStats) return [];
    return agencyStats.filter(
      (a) => a.metrics.total > 0 || a.metrics.prospects > 0,
    );
  }, [agencyStats]);

  if (error) {
    return (
      <Card variant="outlined">
        <CardContent className="p-3">
          <p className="text-xs text-destructive">
            Failed to load agency stats
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardHeader className="p-3 pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            Agency Breakdown
          </CardTitle>

          <Select
            value={selectedAgencyId}
            onValueChange={setSelectedAgencyId}
            disabled={isLoading}
          >
            <SelectTrigger className="h-7 w-full sm:w-[160px] text-xs">
              <SelectValue placeholder="Select agency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Agencies
              </SelectItem>
              {agenciesWithActivity.map((agency) => (
                <SelectItem
                  key={agency.templateId}
                  value={agency.templateId}
                  className="text-xs"
                >
                  {agency.templateName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedAgency && (
          <div className="flex items-center gap-2 pt-2 border-t border-border mt-2">
            <Badge variant="secondary" className="text-[10px]">
              {selectedAgency.creatorName}
            </Badge>
            {!selectedAgency.isActive && (
              <Badge variant="outline" className="text-[10px]">
                Inactive
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-3 pt-0">
        {/* Metrics Grid - responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricItem
            label="Enrolled"
            value={currentMetrics?.total || 0}
            icon={<Users className="h-3.5 w-3.5" />}
            loading={isLoading}
          />
          <MetricItem
            label="Active"
            value={currentMetrics?.active || 0}
            icon={<Clock className="h-3.5 w-3.5" />}
            loading={isLoading}
          />
          <MetricItem
            label="Completed"
            value={currentMetrics?.completed || 0}
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            loading={isLoading}
          />
          <MetricItem
            label="Prospects"
            value={currentMetrics?.prospects || 0}
            icon={<UserPlus className="h-3.5 w-3.5" />}
            loading={isLoading}
          />
          <MetricItem
            label="Dropped"
            value={currentMetrics?.dropped || 0}
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            loading={isLoading}
          />
          <MetricItem
            label="Attention"
            value={currentMetrics?.needsAttention || 0}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            loading={isLoading}
          />
          <MetricItem
            label="Conversion"
            value={`${currentMetrics?.conversionRate || 0}%`}
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            loading={isLoading}
          />
          <MetricItem
            label="Avg Days"
            value={currentMetrics?.avgDaysToComplete || 0}
            icon={<Clock className="h-3.5 w-3.5" />}
            loading={isLoading}
          />
        </div>

        {/* Leaderboard - only when viewing all */}
        {selectedAgencyId === "all" && agenciesWithActivity.length > 1 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Top by Active Recruits
            </p>
            <div className="space-y-1">
              {agenciesWithActivity.slice(0, 3).map((agency, i) => (
                <button
                  key={agency.templateId}
                  onClick={() => setSelectedAgencyId(agency.templateId)}
                  className="flex items-center justify-between w-full text-xs p-1.5 rounded hover:bg-accent transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="h-5 w-5 p-0 justify-center text-[10px]"
                    >
                      {i + 1}
                    </Badge>
                    <span className="truncate">{agency.templateName}</span>
                  </span>
                  <span className="font-mono font-semibold">
                    {agency.metrics.active}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricItemProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  loading: boolean;
}

function MetricItem({ label, value, icon, loading }: MetricItemProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-12" />
      ) : (
        <span className="text-lg font-bold font-mono">{value}</span>
      )}
    </div>
  );
}

export default AgencyPipelineOverview;
