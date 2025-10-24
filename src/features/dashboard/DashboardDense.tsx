// src/features/dashboard/DashboardDense.tsx
import React, { useState, memo, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  AlertCircle,
  Calendar,
  BarChart3,
  ArrowRight,
  Plus,
  Filter
} from "lucide-react";

// Hooks and data
import { useConstants } from "../../hooks";
import { useMetricsWithDateRange } from "../../hooks/useMetricsWithDateRange";
import { useCreateExpense } from "../../hooks/expenses/useCreateExpense";
import { useCreatePolicy } from "../../hooks/policies/useCreatePolicy";
import { useChargebackSummary } from "../../hooks/commissions/useChargebackSummary";
import { useAuth } from "../../contexts/AuthContext";
import { TimePeriod } from "../../utils/dateRange";
import showToast from "../../utils/toast";

// Components
import { KpiCardDense } from "./components/KpiCardDense";
import { TimePeriodSwitcher } from "./components/TimePeriodSwitcher";
import { DateRangeDisplay } from "./components/DateRangeDisplay";
import { ExpenseDialog } from "../expenses/components/ExpenseDialog";
import { PolicyDialog } from "../policies/components/PolicyDialog";

// Configurations
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
} from "../../utils/dashboardCalculations";
import { clientService } from "../../services/clients/clientService";
import { formatCurrency, formatNumber, formatPercent } from "../../utils/formatters";

// Memoized chart component placeholder (replace with actual Recharts/ApexCharts)
const ChartPlaceholder = memo(({ title, height = "h-56" }: { title: string; height?: string }) => (
  <div className={cn("flex items-center justify-center bg-muted/30 rounded-md", height)}>
    <div className="text-center">
      <BarChart3 className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{title}</p>
    </div>
  </div>
));

ChartPlaceholder.displayName = "ChartPlaceholder";

// Dense alert item component
const AlertItem = memo(({ alert }: { alert: any }) => {
  const getAlertIcon = () => {
    switch (alert.type) {
      case "warning": return <AlertCircle className="w-4 h-4 text-warning" />;
      case "error": return <AlertCircle className="w-4 h-4 text-destructive" />;
      default: return <AlertCircle className="w-4 h-4 text-info" />;
    }
  };

  return (
    <div className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
      {getAlertIcon()}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{alert.title}</p>
        <p className="text-[11px] text-muted-foreground">{alert.description}</p>
      </div>
    </div>
  );
});

AlertItem.displayName = "AlertItem";

export const DashboardDense: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: constants } = useConstants();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("monthly");
  const [activeDialog, setActiveDialog] = useState<"policy" | "expense" | null>(null);
  const [selectedKpi, setSelectedKpi] = useState<any>(null);

  // Fetch metrics
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
    targetAvgPremium: constants?.avgAP || 1500,
  });

  const createExpense = useCreateExpense();
  const createPolicy = useCreatePolicy();
  const { data: chargebackSummary } = useChargebackSummary();

  // Calculate derived metrics
  const derivedMetrics = calculateDerivedMetrics(periodPolicies, periodClients);
  const monthProgress = calculateMonthProgress();
  const breakevenDisplay = getBreakevenDisplay(periodAnalytics.breakevenNeeded, timePeriod);
  const policiesNeededDisplay = getPoliciesNeededDisplay(
    periodAnalytics.paceMetrics,
    periodAnalytics.policiesNeeded,
    timePeriod
  );
  const periodSuffix = getPeriodSuffix(timePeriod);
  const isBreakeven = periodAnalytics.surplusDeficit >= 0;

  // Generate configurations
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

  const handleKpiClick = useCallback((kpi: any) => {
    setSelectedKpi(kpi);
  }, []);

  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case "policy":
        setActiveDialog("policy");
        break;
      case "expense":
        setActiveDialog("expense");
        break;
      case "reports":
        navigate({ to: "/analytics" });
        break;
    }
  }, [navigate]);

  // Save handlers (simplified for brevity - use actual implementation from DashboardHome)
  const handleSaveExpense = async (data: any) => {
    try {
      await createExpense.mutateAsync(data);
      showToast.success("Expense created!");
      setActiveDialog(null);
    } catch (error) {
      showToast.error("Failed to create expense");
    }
  };

  const handleAddPolicy = async (formData: any) => {
    try {
      const result = await createPolicy.mutateAsync(formData);
      showToast.success("Policy created successfully!");
      setActiveDialog(null);
      return result || null;
    } catch (error) {
      showToast.error("Failed to create policy");
      return null;
    }
  };

  return (
    <>
      {/* Import density styles */}
      <style>{`@import url('/src/styles/dashboard-density.css');`}</style>

      {/* Dense header */}
      <div className="page-layout-dense">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-[20px] font-[700]">Dashboard</h1>
            <p className="text-[13px] text-muted-foreground">
              {monthProgress}% through month • {dateRange.startDate} to {dateRange.endDate}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TimePeriodSwitcher
              timePeriod={timePeriod}
              onTimePeriodChange={setTimePeriod}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => navigate({ to: "/analytics" })}
            >
              <Filter className="w-3 h-3 mr-1" />
              Filters
            </Button>
          </div>
        </div>

        {/* Primary KPI grid - 3 columns on xl, 2 on md, 1 on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-3">
          {/* Revenue */}
          <KpiCardDense
            label="Total Revenue"
            value={formatCurrency(periodCommissions.totalEarned)}
            delta={12.5}
            sparkData={[100, 120, 115, 130, 125, 140, 135]}
            trend="up"
            onClick={() => handleKpiClick({ type: "revenue", data: periodCommissions })}
          />

          {/* Active Policies */}
          <KpiCardDense
            label="Active Policies"
            value={formatNumber(periodPolicies.active)}
            delta={-2.3}
            sparkData={[50, 48, 52, 49, 47, 45, 44]}
            trend="down"
            onClick={() => handleKpiClick({ type: "policies", data: periodPolicies })}
          />

          {/* Avg Premium */}
          <KpiCardDense
            label="Avg Annual Premium"
            value={formatCurrency(derivedMetrics.avgPremium)}
            delta={5.1}
            sparkData={[1200, 1250, 1300, 1280, 1320, 1350, 1400]}
            trend="up"
            onClick={() => handleKpiClick({ type: "premium", data: derivedMetrics })}
          />

          {/* Expenses */}
          <KpiCardDense
            label="Total Expenses"
            value={formatCurrency(periodExpenses.totalAmount)}
            delta={-8.2}
            sparkData={[800, 750, 720, 700, 680, 650, 620]}
            trend="up"
            color="var(--chart-2)"
            onClick={() => handleKpiClick({ type: "expenses", data: periodExpenses })}
          />

          {/* Net Income */}
          <KpiCardDense
            label="Net Income"
            value={formatCurrency(periodAnalytics.surplusDeficit)}
            delta={isBreakeven ? 15.3 : -5.2}
            trend={isBreakeven ? "up" : "down"}
            color={isBreakeven ? "var(--commission-positive)" : "var(--commission-negative)"}
            onClick={() => handleKpiClick({ type: "net", data: periodAnalytics })}
          />

          {/* Persistency */}
          <KpiCardDense
            label="Persistency Rate"
            value={formatPercent(derivedMetrics.persistencyRate)}
            delta={3.1}
            sparkData={[85, 86, 87, 88, 87, 89, 90]}
            trend="up"
            color="var(--chart-3)"
            onClick={() => handleKpiClick({ type: "persistency", data: derivedMetrics })}
          />
        </div>

        {/* Secondary row - charts and tables */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mb-3">
          {/* Large chart spanning 2 columns on xl */}
          <Card className="col-span-1 xl:col-span-2 h-56 p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[16px] font-[600]">Performance Trend</h3>
              <Tabs defaultValue="revenue" className="w-auto">
                <TabsList className="h-7">
                  <TabsTrigger value="revenue" className="text-[11px] px-2 h-6">Revenue</TabsTrigger>
                  <TabsTrigger value="policies" className="text-[11px] px-2 h-6">Policies</TabsTrigger>
                  <TabsTrigger value="expenses" className="text-[11px] px-2 h-6">Expenses</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <ChartPlaceholder title="Chart will render here" height="h-40" />
          </Card>

          {/* Alerts panel */}
          <Card className="h-56 p-3 overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-[16px] font-[600]">Alerts</h3>
              <span className="text-[11px] text-muted-foreground">
                {alertsConfig.length} active
              </span>
            </div>
            <Separator className="mb-2" />
            <div className="space-y-1 overflow-y-auto max-h-44">
              {alertsConfig.slice(0, 4).map((alert, i) => (
                <AlertItem key={i} alert={alert} />
              ))}
            </div>
          </Card>
        </div>

        {/* Bottom row - tables and lists */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {/* Recent policies table */}
          <Card className="h-[420px] p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[16px] font-[600]">Recent Policies</h3>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[11px]"
                onClick={() => navigate({ to: "/policies" })}
              >
                View all
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="overflow-auto h-[360px]">
              <ChartPlaceholder title="Policy list with virtualization" height="h-full" />
            </div>
          </Card>

          {/* Quick actions & stats */}
          <Card className="h-[420px] p-4">
            <h3 className="text-[16px] font-[600] mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button
                className="h-20 flex-col gap-2"
                variant="outline"
                onClick={() => handleQuickAction("policy")}
              >
                <FileText className="w-5 h-5" />
                <span className="text-sm">Add Policy</span>
              </Button>
              <Button
                className="h-20 flex-col gap-2"
                variant="outline"
                onClick={() => handleQuickAction("expense")}
              >
                <DollarSign className="w-5 h-5" />
                <span className="text-sm">Add Expense</span>
              </Button>
            </div>
            <Separator className="my-4" />
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 rounded-md bg-muted/30">
                <span className="text-sm">Policies to Break Even</span>
                <span className="text-sm font-[600]">{breakevenDisplay}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-md bg-muted/30">
                <span className="text-sm">Required Daily Pace</span>
                <span className="text-sm font-[600]">{policiesNeededDisplay}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-md bg-muted/30">
                <span className="text-sm">Month Progress</span>
                <span className="text-sm font-[600]">{monthProgress}%</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* KPI detail sheet */}
      <Sheet open={!!selectedKpi} onOpenChange={(open) => !open && setSelectedKpi(null)}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>KPI Details</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {selectedKpi && (
              <div className="space-y-4">
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                  {JSON.stringify(selectedKpi, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

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