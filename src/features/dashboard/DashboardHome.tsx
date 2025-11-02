// src/features/dashboard/DashboardHome.tsx

import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useConstants } from "../../hooks";
import { useMetricsWithDateRange } from "../../hooks/useMetricsWithDateRange";
import { useCreateExpense } from "../../hooks/expenses/useCreateExpense";
import { useCreatePolicy } from "../../hooks/policies/useCreatePolicy";
import { useChargebackSummary } from "../../hooks/commissions/useChargebackSummary";
import { useAuth } from "../../contexts/AuthContext";
import { TimePeriod } from "../../utils/dateRange";
import showToast from "../../utils/toast";
import type { CreateExpenseData } from "../../types/expense.types";
import type { NewPolicyForm, CreatePolicyData } from "../../types/policy.types";

// Components
import { DashboardHeader } from "./components/DashboardHeader";
import { TimePeriodSwitcher } from "./components/TimePeriodSwitcher";
import { DateRangeDisplay } from "./components/DateRangeDisplay";
import { QuickStatsPanel } from "./components/QuickStatsPanel";
import { PerformanceOverviewCard } from "./components/PerformanceOverviewCard";
import { AlertsPanel } from "./components/AlertsPanel";
import { QuickActionsPanel } from "./components/QuickActionsPanel";
import { KPIGrid } from "./components/KPIGrid";
import { ExpenseDialog } from "../expenses/components/ExpenseDialog";
import { PolicyDialog } from "../policies/components/PolicyDialog";

// Configuration
import { generateStatsConfig } from "./config/statsConfig";
import { generateMetricsConfig } from "./config/metricsConfig";
import { generateKPIConfig } from "./config/kpiConfig";
import { generateAlertsConfig } from "./config/alertsConfig";

// Utils
import {
  calculateDerivedMetrics,
  calculateMonthProgress,
  getBreakevenDisplay,
  getPoliciesNeededDisplay,
  getPeriodSuffix,
  scaleToDisplayPeriod,
} from "../../utils/dashboardCalculations";
import { clientService } from "../../services/clients/clientService";

export const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: constants } = useConstants();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("monthly");
  const [activeDialog, setActiveDialog] = useState<"policy" | "expense" | null>(
    null,
  );

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
    targetAvgPremium: constants?.avgAP || 1500, // Use user's target avg premium
  });

  const createExpense = useCreateExpense();
  const createPolicy = useCreatePolicy();
  const { data: chargebackSummary } = useChargebackSummary();

  // Calculate derived metrics
  const derivedMetrics = calculateDerivedMetrics(periodPolicies, periodClients);
  const monthProgress = calculateMonthProgress();
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
  });

  const metricsConfig = generateMetricsConfig({
    timePeriod,
    periodCommissions,
    periodPolicies,
    periodClients,
    periodExpenses,
    periodAnalytics,
    constants,
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
    { label: "Add Policy", action: "Add Policy" },
    { label: "Add Expense", action: "Add Expense" },
    { label: "View Reports", action: "View Reports" },
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
        navigate({ to: "/analytics" });
        break;
      default:
        console.warn(`Unknown action: ${action}`);
    }
  };

  const handleSaveExpense = async (data: CreateExpenseData) => {
    try {
      await createExpense.mutateAsync(data);
      showToast.success("Expense created successfully!");
      setActiveDialog(null);
    } catch (error) {
      showToast.error("Failed to create expense. Please try again.");
      console.error("Error creating expense:", error);
    }
  };

  const handleAddPolicy = async (formData: NewPolicyForm) => {
    try {
      if (!user?.id) {
        throw new Error("You must be logged in to create a policy");
      }

      const client = await clientService.createOrFind(
        {
          name: formData.clientName,
          email: formData.clientEmail || undefined,
          phone: formData.clientPhone || undefined,
          address: { state: formData.clientState },
        },
        user.id,
      );

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
        showToast.error("Commission percentage must be between 0 and 999.99");
        throw new Error("Commission percentage must be between 0 and 999.99");
      }

      const policyData: CreatePolicyData = {
        policyNumber: formData.policyNumber,
        status: formData.status,
        clientId: client.id,
        userId: user.id,
        carrierId: formData.carrierId,
        product: formData.product,
        effectiveDate: new Date(formData.effectiveDate),
        termLength: formData.termLength,
        expirationDate: formData.expirationDate
          ? new Date(formData.expirationDate)
          : undefined,
        annualPremium: formData.annualPremium || 0,
        monthlyPremium,
        paymentFrequency: formData.paymentFrequency,
        commissionPercentage: commissionPercent / 100,
        notes: formData.notes || undefined,
      };

      const result = await createPolicy.mutateAsync(policyData);
      showToast.success(`Policy ${result.policyNumber} created successfully!`);
      setActiveDialog(null);
      return result;
    } catch (error: any) {
      const errorMessage =
        error?.message || "Failed to create policy. Please try again.";
      showToast.error(errorMessage);
      console.error("Error creating policy:", error);
      throw error;
    }
  };

  return (
    <>
      <div className="page-header">
        {/* Header with time period switcher and date range */}
        <div className="flex justify-between items-start">
          <DashboardHeader monthProgress={monthProgress} />
          <div className="flex flex-col items-end gap-2">
            <TimePeriodSwitcher
              timePeriod={timePeriod}
              onTimePeriodChange={setTimePeriod}
            />
            <DateRangeDisplay timePeriod={timePeriod} dateRange={dateRange} />
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Main 3-column layout */}
        <div className="grid gap-6 mb-6 grid-cols-[280px_1fr_320px]">
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

          <div className="flex flex-col gap-4">
            <AlertsPanel alerts={alertsConfig} />
            <QuickActionsPanel
              actions={quickActions}
              onActionClick={handleQuickAction}
              isCreating={isCreating}
            />
          </div>
        </div>

        {/* Bottom KPI grid */}
        <KPIGrid sections={kpiConfig} />
      </div>

      {/* Dialogs */}
      <ExpenseDialog
        open={activeDialog === "expense"}
        onOpenChange={(open) => setActiveDialog(open ? "expense" : null)}
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
