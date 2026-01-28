// src/features/dashboard/DashboardHome.tsx

import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  useConstants,
  useMyHierarchyStats,
  useRecruitingStats,
} from "../../hooks";
import { useMetricsWithDateRange } from "@/hooks";
import { useUnreadCount } from "@/components/notifications/useNotifications";
import { useUnreadMessageCount } from "../../hooks/messaging/useMessages";
import { useFeatureAccess } from "../../hooks/subscription/useFeatureAccess";
import { useCreateExpense } from "../../hooks/expenses/useCreateExpense";
import { useCreatePolicy } from "../../hooks/policies";
import { useChargebackSummary } from "../../hooks/commissions/useChargebackSummary";
import { useAuth } from "../../contexts/AuthContext";
import { useDashboardFeatures } from "../../hooks/dashboard";
import { TimePeriod } from "../../utils/dateRange";
import { toast } from "sonner";
import type { CreateExpenseData } from "../../types/expense.types";
import type { NewPolicyForm, CreatePolicyData } from "../../types/policy.types";
import { parseLocalDate } from "@/lib/date";

// Components
import { TimePeriodSwitcher } from "./components/TimePeriodSwitcher";
import { PeriodNavigator } from "./components/PeriodNavigator";
import { DateRangeDisplay } from "./components/DateRangeDisplay";
import { QuickStatsPanel } from "./components/QuickStatsPanel";
import { PerformanceOverviewCard } from "./components/PerformanceOverviewCard";
import { AlertsPanel } from "./components/AlertsPanel";
import { QuickActionsPanel } from "./components/QuickActionsPanel";
import { KPIGridHeatmap } from "./components/KPIGridHeatmap";
import { ExpenseDialogCompact as ExpenseDialog } from "../expenses/components/ExpenseDialogCompact";
import { PolicyDialog } from "../policies/components/PolicyDialog";
import { OrgMetricsSection } from "./components/OrgMetricsSection";

// Configuration
import { generateStatsConfig } from "./config/statsConfig";
import { generateMetricsConfig } from "./config/metricsConfig";
import { generateKPIConfig } from "./config/kpiConfig";
import { generateAlertsConfig } from "./config/alertsConfig";

// Components
import { TeamRecruitingSection } from "./components/TeamRecruitingSection";

// Utils
import {
  calculateDerivedMetrics,
  getBreakevenDisplay,
  getPoliciesNeededDisplay,
  getPeriodSuffix,
} from "../../utils/dashboardCalculations";
import { useCreateOrFindClient } from "@/hooks/clients";

export const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: constants } = useConstants();
  const dashboardFeatures = useDashboardFeatures();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("MTD");
  const [periodOffset, setPeriodOffset] = useState<number>(0);
  const [activeDialog, setActiveDialog] = useState<"policy" | "expense" | null>(
    null,
  );

  // Handler to change time period and reset offset to current period
  const handleTimePeriodChange = (newPeriod: TimePeriod) => {
    setTimePeriod(newPeriod);
    setPeriodOffset(0); // Reset to current period when granularity changes
  };

  // Fetch metrics for the selected time period (no scaling needed)
  const {
    periodCommissions,
    periodExpenses,
    periodPolicies,
    periodClients,
    currentState,
    periodAnalytics,
    dateRange,
  } = useMetricsWithDateRange({
    timePeriod,
    periodOffset,
    targetAvgPremium: constants?.avgAP || 1500, // Use user's target avg premium
  });

  const createExpense = useCreateExpense();
  const createPolicy = useCreatePolicy();
  const createOrFindClient = useCreateOrFindClient();
  const { data: chargebackSummary } = useChargebackSummary();

  // Feature access for premium sections
  const { hasAccess: hasTeamAccess } = useFeatureAccess("hierarchy");
  const { hasAccess: hasRecruitingAccess } = useFeatureAccess("recruiting");
  const { hasAccess: hasBasicRecruiting } =
    useFeatureAccess("recruiting_basic");

  // Basic tier users should see prospects in their stats (since they don't have pipeline enrollment)
  const shouldIncludeProspects = hasBasicRecruiting && !hasRecruitingAccess;

  // Team & Recruiting data (only fetch if user has access or is admin)
  const { data: hierarchyStats } = useMyHierarchyStats({
    enabled: hasTeamAccess || dashboardFeatures.isAdmin,
  });
  const { data: recruitingStats } = useRecruitingStats({
    enabled:
      hasRecruitingAccess || hasBasicRecruiting || dashboardFeatures.isAdmin,
    includeProspects: shouldIncludeProspects,
  });

  // Notification & messaging counts
  const { data: unreadNotifications } = useUnreadCount();
  const { data: unreadMessages } = useUnreadMessageCount();

  // Calculate derived metrics
  const derivedMetrics = calculateDerivedMetrics(periodPolicies, periodClients);
  const breakevenDisplay = getBreakevenDisplay(
    periodAnalytics.breakevenNeeded,
    timePeriod,
  );
  const policiesNeededDisplay = getPoliciesNeededDisplay(
    periodAnalytics.paceMetrics,
    periodAnalytics.policiesNeeded,
    timePeriod,
  );
  const periodSuffix = getPeriodSuffix(timePeriod);
  const isBreakeven = periodAnalytics.surplusDeficit >= 0;
  const isCreating = createPolicy.isPending || createExpense.isPending;

  const statsConfig = generateStatsConfig({
    timePeriod,
    periodCommissions,
    periodExpenses,
    periodPolicies,
    periodClients,
    periodAnalytics,
    currentState,
    derivedMetrics,
    breakevenDisplay,
    policiesNeededDisplay,
    chargebackSummary,
    features: dashboardFeatures,
  });

  const metricsConfig = generateMetricsConfig({
    timePeriod,
    periodCommissions,
    periodPolicies,
    periodClients,
    periodExpenses,
    periodAnalytics,
    constants,
    features: dashboardFeatures,
  });

  const kpiConfig = generateKPIConfig({
    timePeriod,
    periodCommissions,
    periodExpenses,
    periodPolicies,
    periodClients,
    periodAnalytics,
    currentState,
    derivedMetrics,
    breakevenDisplay,
    policiesNeededDisplay,
    features: dashboardFeatures,
  });

  const alertsConfig = generateAlertsConfig({
    timePeriod,
    periodCommissions,
    periodPolicies,
    periodExpenses,
    periodAnalytics,
    currentState,
    lapsedRate: derivedMetrics.lapsedRate,
    policiesNeeded: policiesNeededDisplay,
    periodSuffix,
  });

  const quickActions = [
    { label: "Add Policy", action: "Add Policy", hasAccess: true },
    {
      label: "Add Expense",
      action: "Add Expense",
      hasAccess: dashboardFeatures.canAddExpense,
      lockedTooltip: "Upgrade to Pro to track expenses",
      requiredTier: "Pro",
    },
    {
      label: "View Reports",
      action: "View Reports",
      hasAccess: dashboardFeatures.canViewReports,
      lockedTooltip: "Upgrade to Pro to view reports",
      requiredTier: "Pro",
    },
  ];

  // Action handlers
  const handleQuickAction = (action: string) => {
    switch (action) {
      case "Add Policy":
        setActiveDialog("policy");
        break;
      case "Add Expense":
        setActiveDialog("expense");
        break;
      case "View Reports":
        navigate({ to: "/reports" });
        break;
      default:
        console.warn(`Unknown action: ${action}`);
    }
  };

  const handleSaveExpense = async (data: CreateExpenseData) => {
    try {
      await createExpense.mutateAsync(data);
      toast.success("Expense created successfully!");
      setActiveDialog(null);
    } catch (error) {
      toast.error("Failed to create expense. Please try again.");
      console.error("Error creating expense:", error);
    }
  };

  const handleAddPolicy = async (formData: NewPolicyForm) => {
    try {
      if (!user?.id) {
        throw new Error("You must be logged in to create a policy");
      }

      const client = await createOrFindClient.mutateAsync({
        clientData: {
          name: formData.clientName,
          email: formData.clientEmail || undefined,
          phone: formData.clientPhone || undefined,
          address: JSON.stringify({
            state: formData.clientState,
            street: formData.clientStreet || undefined,
            city: formData.clientCity || undefined,
            zipCode: formData.clientZipCode || undefined,
          }),
        },
        userId: user.id,
      });

      const monthlyPremium =
        formData.paymentFrequency === "annual"
          ? (formData.annualPremium || 0) / 12
          : formData.paymentFrequency === "semi-annual"
            ? (formData.annualPremium || 0) / 6
            : formData.paymentFrequency === "quarterly"
              ? (formData.annualPremium || 0) / 3
              : (formData.annualPremium || 0) / 12;

      const commissionPercent = formData.commissionPercentage || 0;
      if (commissionPercent < 0 || commissionPercent > 999.99) {
        toast.error("Commission percentage must be between 0 and 999.99");
        throw new Error("Commission percentage must be between 0 and 999.99");
      }

      const policyData: CreatePolicyData = {
        policyNumber: formData.policyNumber,
        status: formData.status,
        clientId: client.id,
        userId: user.id,
        carrierId: formData.carrierId,
        product: formData.product,
        effectiveDate: parseLocalDate(formData.effectiveDate),
        termLength: formData.termLength,
        expirationDate: formData.expirationDate
          ? parseLocalDate(formData.expirationDate)
          : undefined,
        annualPremium: formData.annualPremium || 0,
        monthlyPremium,
        paymentFrequency: formData.paymentFrequency,
        commissionPercentage: commissionPercent / 100,
        notes: formData.notes || undefined,
      };

      const result = await createPolicy.mutateAsync(policyData);
      toast.success(`Policy ${result.policyNumber} created successfully!`);
      setActiveDialog(null);
      return result;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- error object type
    } catch (error: any) {
      const errorMessage =
        error?.message || "Failed to create policy. Please try again.";
      toast.error(errorMessage);
      console.error("Error creating policy:", error);
      throw error;
    }
  };

  return (
    <>
      <div className="h-[calc(100vh-4rem)] flex flex-col p-2 sm:p-3 space-y-2 sm:space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
        {/* Compact Header Card */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-zinc-900 rounded-lg px-2 sm:px-3 py-2 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Dashboard
            </h1>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 hidden sm:inline">
              Performance overview
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
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

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="space-y-2">
            {/* Main 3-column layout - stacks on mobile, 2-col on md, 3-col on lg */}
            <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-[260px_1fr_280px]">
              <QuickStatsPanel stats={statsConfig} timePeriod={timePeriod} />

              <PerformanceOverviewCard
                metrics={metricsConfig}
                isBreakeven={isBreakeven}
                timePeriod={timePeriod}
                surplusDeficit={periodAnalytics.surplusDeficit}
                breakevenDisplay={breakevenDisplay}
                policiesNeeded={policiesNeededDisplay}
                periodSuffix={periodSuffix}
              />

              <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-1">
                <AlertsPanel alerts={alertsConfig} />
                <QuickActionsPanel
                  actions={quickActions}
                  onActionClick={handleQuickAction}
                  isCreating={isCreating}
                />
              </div>
            </div>

            {/* KPI Breakdown */}
            <KPIGridHeatmap sections={kpiConfig} />

            {/* Organization Metrics (IMO Admin / Agency Owner) */}
            <OrgMetricsSection
              isImoAdmin={
                dashboardFeatures.isAdmin || dashboardFeatures.isImoAdmin
              }
              isAgencyOwner={dashboardFeatures.isAgencyOwner}
              dateRange={dateRange}
            />

            {/* Team & Recruiting Section (Premium - Team tier) */}
            <TeamRecruitingSection
              hierarchyStats={hierarchyStats}
              recruitingStats={recruitingStats}
              unreadNotifications={unreadNotifications ?? 0}
              unreadMessages={unreadMessages ?? 0}
              hasAccess={hasTeamAccess || dashboardFeatures.isAdmin}
            />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ExpenseDialog
        open={activeDialog === "expense"}
        onOpenChange={(open: boolean) =>
          setActiveDialog(open ? "expense" : null)
        }
        onSave={handleSaveExpense}
        isSubmitting={createExpense.isPending}
      />

      <PolicyDialog
        open={activeDialog === "policy"}
        onOpenChange={(open) => setActiveDialog(open ? "policy" : null)}
        onSave={handleAddPolicy}
      />
    </>
  );
};
