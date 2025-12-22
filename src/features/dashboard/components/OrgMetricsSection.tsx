// src/features/dashboard/components/OrgMetricsSection.tsx
// Dashboard widgets for IMO/Agency organizational metrics (Phase 5)

import React from "react";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  Trophy,
  BarChart3,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  useImoDashboardMetrics,
  useAgencyDashboardMetrics,
  useImoProductionByAgency,
  useImoOverrideSummary,
  useAgencyOverrideSummary,
} from "@/hooks/imo";

// Maximum agencies to display in production breakdown
const MAX_AGENCIES_DISPLAYED = 5;

interface MetricItemProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  subtext?: string;
}

const MetricItem: React.FC<MetricItemProps> = ({
  label,
  value,
  highlight,
  subtext,
}) => (
  <div className="flex justify-between items-center text-[11px] py-0.5">
    <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
    <div className="text-right">
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
      {subtext && (
        <span className="text-[9px] text-zinc-400 ml-1">{subtext}</span>
      )}
    </div>
  </div>
);

/**
 * Error state component for dashboard panels
 */
const ErrorState: React.FC<{ message?: string }> = ({ message }) => (
  <div className="bg-white dark:bg-zinc-900 rounded-lg border border-red-200 dark:border-red-800 p-3 h-full">
    <div className="flex flex-col items-center justify-center h-full text-center py-4">
      <AlertCircle className="h-6 w-6 text-red-400 mb-2" />
      <div className="text-[11px] text-red-600 dark:text-red-400 font-medium">
        Failed to load metrics
      </div>
      {message && (
        <div className="text-[10px] text-zinc-500 mt-1 max-w-[200px] truncate">
          {message}
        </div>
      )}
    </div>
  </div>
);

/**
 * IMO Metrics Panel - For IMO admins/owners
 */
const ImoMetricsPanel: React.FC = () => {
  const { data: metrics, isLoading, error } = useImoDashboardMetrics();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 h-full animate-pulse">
        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded mb-3" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : undefined}
      />
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 h-full">
      <div className="flex items-center gap-1.5 mb-2">
        <Building2 className="h-3 w-3 text-violet-500" />
        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          IMO Overview
        </span>
        <span className="text-[9px] text-zinc-400 ml-auto truncate max-w-[100px]">
          {metrics.imo_name}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center p-2 bg-violet-50 dark:bg-violet-900/20 rounded">
          <div className="text-lg font-bold text-violet-600 dark:text-violet-400">
            {formatNumber(metrics.agency_count)}
          </div>
          <div className="text-[9px] text-zinc-500 uppercase">Agencies</div>
        </div>
        <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {formatNumber(metrics.agent_count)}
          </div>
          <div className="text-[9px] text-zinc-500 uppercase">Agents</div>
        </div>
      </div>

      <div className="space-y-0.5">
        <MetricItem
          label="Active Policies"
          value={formatNumber(metrics.total_active_policies)}
        />
        <MetricItem
          label="Annual Premium"
          value={formatCurrency(metrics.total_annual_premium)}
          highlight={metrics.total_annual_premium > 0}
        />
        <div className="border-t border-zinc-100 dark:border-zinc-800 my-1.5" />
        <MetricItem
          label="Commissions YTD"
          value={formatCurrency(metrics.total_commissions_ytd)}
          highlight={metrics.total_commissions_ytd > 0}
        />
        <MetricItem
          label="Earned YTD"
          value={formatCurrency(metrics.total_earned_ytd)}
        />
        <MetricItem
          label="Unearned"
          value={formatCurrency(metrics.total_unearned)}
        />
        <div className="border-t border-zinc-100 dark:border-zinc-800 my-1.5" />
        <MetricItem
          label="Avg/Agent"
          value={formatCurrency(metrics.avg_production_per_agent)}
          subtext="premium"
        />
      </div>
    </div>
  );
};

/**
 * Agency Metrics Panel - For agency owners
 */
const AgencyMetricsPanel: React.FC = () => {
  const { data: metrics, isLoading, error } = useAgencyDashboardMetrics();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 h-full animate-pulse">
        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded mb-3" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : undefined}
      />
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 h-full">
      <div className="flex items-center gap-1.5 mb-2">
        <Users className="h-3 w-3 text-blue-500" />
        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Agency Overview
        </span>
        <span className="text-[9px] text-zinc-400 ml-auto truncate max-w-[100px]">
          {metrics.agency_name}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {formatNumber(metrics.agent_count)}
          </div>
          <div className="text-[9px] text-zinc-500 uppercase">Agents</div>
        </div>
        <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded">
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatNumber(metrics.active_policies)}
          </div>
          <div className="text-[9px] text-zinc-500 uppercase">Policies</div>
        </div>
      </div>

      <div className="space-y-0.5">
        <MetricItem
          label="Annual Premium"
          value={formatCurrency(metrics.total_annual_premium)}
          highlight={metrics.total_annual_premium > 0}
        />
        <MetricItem
          label="Commissions YTD"
          value={formatCurrency(metrics.total_commissions_ytd)}
          highlight={metrics.total_commissions_ytd > 0}
        />
        <MetricItem
          label="Earned YTD"
          value={formatCurrency(metrics.total_earned_ytd)}
        />
        <MetricItem
          label="Unearned"
          value={formatCurrency(metrics.total_unearned)}
        />
        <div className="border-t border-zinc-100 dark:border-zinc-800 my-1.5" />
        <MetricItem
          label="Avg/Agent"
          value={formatCurrency(metrics.avg_production_per_agent)}
          subtext="premium"
        />
      </div>

      {/* Top Producer */}
      {metrics.top_producer_name && (
        <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-1 mb-1">
            <Trophy className="h-3 w-3 text-amber-500" />
            <span className="text-[9px] text-amber-700 dark:text-amber-400 uppercase font-semibold">
              Top Producer
            </span>
          </div>
          <div className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 truncate">
            {metrics.top_producer_name}
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
            {formatCurrency(metrics.top_producer_premium)}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * IMO Override Summary Panel - For IMO admins
 */
const ImoOverrideSummaryPanel: React.FC = () => {
  const { data: summary, isLoading, error } = useImoOverrideSummary();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 h-full animate-pulse">
        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded mb-3" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : undefined}
      />
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 h-full">
      <div className="flex items-center gap-1.5 mb-2">
        <ArrowUpRight className="h-3 w-3 text-orange-500" />
        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Override Commissions
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
          <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
            {formatNumber(summary.total_override_count)}
          </div>
          <div className="text-[9px] text-zinc-500 uppercase">Overrides</div>
        </div>
        <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded">
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summary.total_override_amount)}
          </div>
          <div className="text-[9px] text-zinc-500 uppercase">Total</div>
        </div>
      </div>

      <div className="space-y-0.5">
        <MetricItem
          label="Pending"
          value={formatCurrency(summary.pending_amount)}
        />
        <MetricItem
          label="Earned"
          value={formatCurrency(summary.earned_amount)}
          highlight={summary.earned_amount > 0}
        />
        <MetricItem label="Paid" value={formatCurrency(summary.paid_amount)} />
        {summary.chargeback_amount > 0 && (
          <MetricItem
            label="Chargebacks"
            value={formatCurrency(summary.chargeback_amount)}
          />
        )}
        <div className="border-t border-zinc-100 dark:border-zinc-800 my-1.5" />
        <MetricItem
          label="Uplines"
          value={formatNumber(summary.unique_uplines)}
          subtext="receiving"
        />
        <MetricItem
          label="Downlines"
          value={formatNumber(summary.unique_downlines)}
          subtext="generating"
        />
        <MetricItem
          label="Avg/Policy"
          value={formatCurrency(summary.avg_override_per_policy)}
        />
      </div>
    </div>
  );
};

/**
 * Agency Override Summary Panel - For agency owners
 */
const AgencyOverrideSummaryPanel: React.FC = () => {
  const { data: summary, isLoading, error } = useAgencyOverrideSummary();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 h-full animate-pulse">
        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded mb-3" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : undefined}
      />
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 h-full">
      <div className="flex items-center gap-1.5 mb-2">
        <ArrowUpRight className="h-3 w-3 text-orange-500" />
        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Override Commissions
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
          <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
            {formatNumber(summary.total_override_count)}
          </div>
          <div className="text-[9px] text-zinc-500 uppercase">Overrides</div>
        </div>
        <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded">
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summary.total_override_amount)}
          </div>
          <div className="text-[9px] text-zinc-500 uppercase">Total</div>
        </div>
      </div>

      <div className="space-y-0.5">
        <MetricItem
          label="Pending"
          value={formatCurrency(summary.pending_amount)}
        />
        <MetricItem
          label="Earned"
          value={formatCurrency(summary.earned_amount)}
          highlight={summary.earned_amount > 0}
        />
        <MetricItem label="Paid" value={formatCurrency(summary.paid_amount)} />
        <MetricItem
          label="Avg/Policy"
          value={formatCurrency(summary.avg_override_per_policy)}
        />
      </div>

      {/* Top Earner */}
      {summary.top_earner_name && (
        <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-1 mb-1">
            <Trophy className="h-3 w-3 text-amber-500" />
            <span className="text-[9px] text-amber-700 dark:text-amber-400 uppercase font-semibold">
              Top Override Earner
            </span>
          </div>
          <div className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 truncate">
            {summary.top_earner_name}
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
            {formatCurrency(summary.top_earner_amount)}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Production Breakdown Panel - For IMO admins (by agency)
 */
const ProductionBreakdownPanel: React.FC = () => {
  const { data: agencies, isLoading, error } = useImoProductionByAgency();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 h-full animate-pulse">
        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded mb-3" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : undefined}
      />
    );
  }

  if (!agencies || agencies.length === 0) {
    return null;
  }

  // Take top agencies by production (using named constant)
  const topAgencies = agencies.slice(0, MAX_AGENCIES_DISPLAYED);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 h-full">
      <div className="flex items-center gap-1.5 mb-3">
        <BarChart3 className="h-3 w-3 text-violet-500" />
        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Production by Agency
        </span>
        <span className="text-[9px] text-zinc-400 ml-auto">Top 5</span>
      </div>

      <div className="space-y-2">
        {topAgencies.map((agency, index) => (
          <div
            key={agency.agency_id}
            className="flex items-center gap-2 p-1.5 bg-zinc-50 dark:bg-zinc-800/50 rounded"
          >
            <div
              className={cn(
                "w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold",
                index === 0
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                  : index === 1
                    ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                    : index === 2
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
              )}
            >
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 truncate">
                {agency.agency_name}
              </div>
              <div className="text-[9px] text-zinc-500 truncate">
                {agency.owner_name} &bull; {agency.agent_count} agents
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(agency.total_annual_premium)}
              </div>
              <div className="text-[9px] text-zinc-400">
                {agency.pct_of_imo_production.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {agencies.length > MAX_AGENCIES_DISPLAYED && (
        <div className="mt-2 text-center">
          <span className="text-[9px] text-zinc-400">
            +{agencies.length - MAX_AGENCIES_DISPLAYED} more agencies
          </span>
        </div>
      )}
    </div>
  );
};

interface OrgMetricsSectionProps {
  isImoAdmin: boolean;
  isAgencyOwner: boolean;
}

/**
 * Org Metrics Section - Shows IMO metrics for IMO admins, Agency metrics for agency owners
 */
export const OrgMetricsSection: React.FC<OrgMetricsSectionProps> = ({
  isImoAdmin,
  isAgencyOwner,
}) => {
  // Don't render if user has no org role
  if (!isImoAdmin && !isAgencyOwner) {
    return null;
  }

  // IMO admin view: Show IMO metrics + Override Summary + Production breakdown
  // (Recruiting pipeline is shown in TeamRecruitingSection to avoid duplication)
  if (isImoAdmin) {
    return (
      <div className="space-y-2">
        <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-[300px_300px_1fr]">
          <ImoMetricsPanel />
          <ImoOverrideSummaryPanel />
          <ProductionBreakdownPanel />
        </div>
      </div>
    );
  }

  // Agency owner view: Show Agency metrics + Override Summary
  // (Recruiting pipeline is shown in TeamRecruitingSection to avoid duplication)
  if (isAgencyOwner) {
    return (
      <div className="grid gap-2 grid-cols-1 md:grid-cols-[300px_300px]">
        <AgencyMetricsPanel />
        <AgencyOverrideSummaryPanel />
      </div>
    );
  }

  return null;
};
