// src/features/dashboard/DashboardHome_Terminal.tsx

import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PageLayout } from "../../components/layout";
import { useConstants } from "../../hooks";
import { useMetricsWithDateRange } from "../../hooks/useMetricsWithDateRange";
import { useCreateExpense } from "../../hooks/expenses/useCreateExpense";
import { useCreatePolicy } from "../../hooks/policies/useCreatePolicy";
import { useAuth } from "../../contexts/AuthContext";
import { TimePeriod, getPeriodLabel } from "../../utils/dateRange";
import showToast from "../../utils/toast";
import type { CreateExpenseData } from "../../types/expense.types";
import type { NewPolicyForm, CreatePolicyData } from "../../types/policy.types";

// Dialogs
import { ExpenseDialog } from "../expenses/components/ExpenseDialog";
import { PolicyForm } from "../policies/PolicyForm";

// Configuration
import { generateStatsConfig } from "./config/statsConfig";
import { generateKPIConfig } from "./config/kpiConfig";
import { generateAlertsConfig } from "./config/alertsConfig";

// Utils
import {
  calculateDerivedMetrics,
  getBreakevenDisplay,
  getPoliciesNeededDisplay,
  getPeriodSuffix,
} from "../../utils/dashboardCalculations";
import { formatCurrency, formatPercent } from "../../utils/formatting";
import { clientService } from "../../services/clients/clientService";

// Terminal styling constants
import {
  TERMINAL_COLORS,
  TERMINAL_TYPOGRAPHY,
  TERMINAL_SPACING,
  TERMINAL_BORDERS,
  TERMINAL_SYMBOLS,
  TERMINAL_BUTTON,
  TERMINAL_ANIMATION,
} from "../../constants/dashboardTerminal";

/**
 * Terminal/Console Style Dashboard
 *
 * Alternative dashboard design with terminal aesthetic:
 * - Monospace fonts
 * - Dark background
 * - Symbol-based status indicators
 * - Ultra-compact layout
 * - ASCII-style borders
 *
 * Preserves ALL functionality and metrics from original dashboard.
 */
export const DashboardHome_Terminal: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: constants } = useConstants();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("monthly");
  const [activeDialog, setActiveDialog] = useState<"policy" | "expense" | null>(
    null,
  );

  // Fetch metrics for the selected time period
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

  const activeAlerts = alertsConfig.filter((alert) => alert.condition);

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

  // Get current time for terminal header
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const periodLabel = getPeriodLabel(timePeriod);
  const dateRangeStr = dateRange
    ? `${new Date(dateRange.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${new Date(dateRange.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : '';

  // Base styles
  const sectionStyle: React.CSSProperties = {
    background: TERMINAL_COLORS.BG_SECTION,
    border: TERMINAL_BORDERS.SECTION,
    borderRadius: TERMINAL_BORDERS.RADIUS,
    padding: TERMINAL_SPACING.SECTION_PADDING,
    marginBottom: TERMINAL_SPACING.SECTION_GAP,
    fontFamily: TERMINAL_TYPOGRAPHY.FONT_FAMILY,
    fontSize: TERMINAL_TYPOGRAPHY.FONT_SIZE_BASE,
    lineHeight: TERMINAL_TYPOGRAPHY.LINE_HEIGHT,
    color: TERMINAL_COLORS.TEXT_PRIMARY,
  };

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: TERMINAL_TYPOGRAPHY.FONT_SIZE_MD,
    fontWeight: 600,
    color: TERMINAL_COLORS.INFO,
    textTransform: 'uppercase',
    letterSpacing: TERMINAL_TYPOGRAPHY.LETTER_SPACING,
    marginBottom: '8px',
    borderBottom: TERMINAL_BORDERS.SECTION,
    paddingBottom: '4px',
  };

  const metricRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '3px 0',
    fontSize: TERMINAL_TYPOGRAPHY.FONT_SIZE_SM,
  };

  const labelStyle: React.CSSProperties = {
    color: TERMINAL_COLORS.TEXT_SECONDARY,
  };

  const valueStyle: React.CSSProperties = {
    color: TERMINAL_COLORS.TEXT_PRIMARY,
    fontWeight: 500,
    textAlign: 'right',
  };

  return (
    <PageLayout>
      <div
        style={{
          background: TERMINAL_COLORS.BG_MAIN,
          minHeight: '100vh',
          padding: '16px',
          fontFamily: TERMINAL_TYPOGRAPHY.FONT_FAMILY,
        }}
      >
        {/* Header Bar */}
        <div style={sectionStyle}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: TERMINAL_TYPOGRAPHY.FONT_SIZE_MD,
              fontWeight: 600,
            }}
          >
            <span>
              DASHBOARD :: <span style={{ color: TERMINAL_COLORS.INFO }}>
                <select
                  value={timePeriod}
                  onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
                  style={{
                    background: TERMINAL_COLORS.BG_MAIN,
                    color: TERMINAL_COLORS.INFO,
                    border: `1px solid ${TERMINAL_COLORS.BORDER}`,
                    borderRadius: '2px',
                    padding: '2px 6px',
                    fontFamily: TERMINAL_TYPOGRAPHY.FONT_FAMILY,
                    fontSize: TERMINAL_TYPOGRAPHY.FONT_SIZE_SM,
                    cursor: 'pointer',
                  }}
                >
                  <option value="monthly">MTD</option>
                  <option value="yearly">YTD</option>
                  <option value="last30">L30D</option>
                  <option value="last60">L60D</option>
                  <option value="last90">L90D</option>
                  <option value="custom">CUSTOM</option>
                </select>
              </span> :: {dateRangeStr}
            </span>
            <span style={{ color: TERMINAL_COLORS.TEXT_SECONDARY }}>
              {currentTime}
            </span>
          </div>
        </div>

        {/* Financial Overview Section */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>FINANCIAL OVERVIEW</div>
          <div style={metricRowStyle}>
            <span style={labelStyle}>Commission Earned</span>
            <span style={valueStyle}>{formatCurrency(periodCommissions.earned)}</span>
          </div>
          <div style={metricRowStyle}>
            <span style={labelStyle}>Expenses</span>
            <span style={valueStyle}>{formatCurrency(periodExpenses.total)}</span>
          </div>
          <div style={metricRowStyle}>
            <span style={labelStyle}>Net Income</span>
            <span style={{
              ...valueStyle,
              color: periodAnalytics.netIncome >= 0 ? TERMINAL_COLORS.SUCCESS : TERMINAL_COLORS.DANGER,
              fontWeight: 700,
            }}>
              {formatCurrency(periodAnalytics.netIncome)}
            </span>
          </div>
          <div style={metricRowStyle}>
            <span style={labelStyle}>Pending (Pipeline)</span>
            <span style={valueStyle}>{formatCurrency(currentState.pendingPipeline)}</span>
          </div>
          <div
            style={{
              marginTop: '8px',
              padding: '6px',
              background: isBreakeven ?
                'rgba(63, 185, 80, 0.1)' :
                'rgba(210, 153, 34, 0.1)',
              border: `1px solid ${isBreakeven ? TERMINAL_COLORS.SUCCESS : TERMINAL_COLORS.WARNING}`,
              borderRadius: '2px',
              fontSize: TERMINAL_TYPOGRAPHY.FONT_SIZE_SM,
            }}
          >
            <span style={{
              color: isBreakeven ? TERMINAL_COLORS.SUCCESS : TERMINAL_COLORS.WARNING,
              marginRight: '8px',
            }}>
              {TERMINAL_SYMBOLS.INFO}
            </span>
            <span style={{ color: isBreakeven ? TERMINAL_COLORS.SUCCESS : TERMINAL_COLORS.WARNING }}>
              {isBreakeven
                ? `${TERMINAL_SYMBOLS.SUCCESS} ABOVE BREAKEVEN`
                : `${TERMINAL_SYMBOLS.WARNING} BELOW BREAKEVEN`}
            </span>
            <span style={{
              color: TERMINAL_COLORS.TEXT_SECONDARY,
              marginLeft: '12px',
            }}>
              {isBreakeven
                ? `Surplus: ${formatCurrency(Math.abs(periodAnalytics.surplusDeficit))}`
                : `Need ${formatCurrency(breakevenDisplay)}${periodSuffix.toLowerCase()} (${Math.ceil(policiesNeededDisplay)} policies)`}
            </span>
          </div>
        </div>

        {/* Production & Client Metrics Section */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>PRODUCTION METRICS</div>
          <div style={{ fontSize: TERMINAL_TYPOGRAPHY.FONT_SIZE_SM, color: TERMINAL_COLORS.TEXT_PRIMARY }}>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: TERMINAL_COLORS.INFO }}>POLICIES:</span>{' '}
              <span style={{ color: TERMINAL_COLORS.SUCCESS }}>{periodPolicies.newCount} new</span> |{' '}
              <span>{currentState.activePolicies} active</span> |{' '}
              <span style={{ color: TERMINAL_COLORS.WARNING }}>{periodPolicies.lapsed} lapsed</span> |{' '}
              <span style={{ color: TERMINAL_COLORS.DANGER }}>{periodPolicies.cancelled} cancelled</span>
            </div>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: TERMINAL_COLORS.INFO }}>PREMIUM:</span>{' '}
              {formatCurrency(periodPolicies.premiumWritten)} written |{' '}
              Avg AP: {formatCurrency(periodPolicies.averagePremium)}
            </div>
            <div>
              <span style={{ color: TERMINAL_COLORS.INFO }}>CLIENTS:</span>{' '}
              {currentState.totalClients} total |{' '}
              <span style={{ color: TERMINAL_COLORS.SUCCESS }}>{periodClients.newCount} new</span> |{' '}
              Avg Value: {formatCurrency(derivedMetrics.avgClientValue)}
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {activeAlerts.length > 0 && (
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>ALERTS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {activeAlerts.map((alert, index) => {
                const symbolColor =
                  alert.type === 'danger' || alert.type === 'error'
                    ? TERMINAL_COLORS.DANGER
                    : alert.type === 'warning'
                    ? TERMINAL_COLORS.WARNING
                    : TERMINAL_COLORS.INFO;

                return (
                  <div
                    key={index}
                    style={{
                      fontSize: TERMINAL_TYPOGRAPHY.FONT_SIZE_SM,
                      padding: '4px 0',
                    }}
                  >
                    <span style={{ color: symbolColor, marginRight: '8px' }}>
                      [{alert.type === 'danger' || alert.type === 'error' ? TERMINAL_SYMBOLS.ERROR :
                        alert.type === 'warning' ? TERMINAL_SYMBOLS.WARNING :
                        TERMINAL_SYMBOLS.INFO}]
                    </span>
                    <span style={{ color: TERMINAL_COLORS.TEXT_PRIMARY }}>
                      {alert.title}
                    </span>
                    {alert.message && (
                      <span style={{ color: TERMINAL_COLORS.TEXT_SECONDARY, marginLeft: '8px' }}>
                        - {alert.message}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions Section */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>QUICK ACTIONS</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleQuickAction("Add Policy")}
              disabled={isCreating}
              style={{
                padding: TERMINAL_BUTTON.PADDING,
                background: TERMINAL_BUTTON.BG_DEFAULT,
                border: TERMINAL_BUTTON.BORDER,
                borderRadius: TERMINAL_BUTTON.BORDER_RADIUS,
                color: TERMINAL_BUTTON.TEXT,
                fontFamily: TERMINAL_TYPOGRAPHY.FONT_FAMILY,
                fontSize: TERMINAL_TYPOGRAPHY.FONT_SIZE_SM,
                cursor: isCreating ? 'not-allowed' : 'pointer',
                transition: TERMINAL_ANIMATION.TRANSITION,
                opacity: isCreating ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isCreating) {
                  e.currentTarget.style.background = TERMINAL_BUTTON.BG_HOVER;
                }
              }}
              onMouseLeave={(e) => {
                if (!isCreating) {
                  e.currentTarget.style.background = TERMINAL_BUTTON.BG_DEFAULT;
                }
              }}
            >
              [ {TERMINAL_SYMBOLS.ARROW_RIGHT} ADD POLICY ]
            </button>
            <button
              onClick={() => handleQuickAction("Add Expense")}
              disabled={isCreating}
              style={{
                padding: TERMINAL_BUTTON.PADDING,
                background: TERMINAL_BUTTON.BG_DEFAULT,
                border: TERMINAL_BUTTON.BORDER,
                borderRadius: TERMINAL_BUTTON.BORDER_RADIUS,
                color: TERMINAL_BUTTON.TEXT,
                fontFamily: TERMINAL_TYPOGRAPHY.FONT_FAMILY,
                fontSize: TERMINAL_TYPOGRAPHY.FONT_SIZE_SM,
                cursor: isCreating ? 'not-allowed' : 'pointer',
                transition: TERMINAL_ANIMATION.TRANSITION,
                opacity: isCreating ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isCreating) {
                  e.currentTarget.style.background = TERMINAL_BUTTON.BG_HOVER;
                }
              }}
              onMouseLeave={(e) => {
                if (!isCreating) {
                  e.currentTarget.style.background = TERMINAL_BUTTON.BG_DEFAULT;
                }
              }}
            >
              [ {TERMINAL_SYMBOLS.ARROW_RIGHT} ADD EXPENSE ]
            </button>
            <button
              onClick={() => handleQuickAction("View Reports")}
              style={{
                padding: TERMINAL_BUTTON.PADDING,
                background: TERMINAL_BUTTON.BG_DEFAULT,
                border: TERMINAL_BUTTON.BORDER,
                borderRadius: TERMINAL_BUTTON.BORDER_RADIUS,
                color: TERMINAL_BUTTON.TEXT,
                fontFamily: TERMINAL_TYPOGRAPHY.FONT_FAMILY,
                fontSize: TERMINAL_TYPOGRAPHY.FONT_SIZE_SM,
                cursor: 'pointer',
                transition: TERMINAL_ANIMATION.TRANSITION,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = TERMINAL_BUTTON.BG_HOVER;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = TERMINAL_BUTTON.BG_DEFAULT;
              }}
            >
              [ {TERMINAL_SYMBOLS.ARROW_RIGHT} VIEW REPORTS ]
            </button>
          </div>
        </div>

        {/* Detailed KPI Grid */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>DETAILED METRICS</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
            }}
          >
            {kpiConfig.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <div
                  style={{
                    fontSize: TERMINAL_TYPOGRAPHY.FONT_SIZE_SM,
                    fontWeight: 600,
                    color: TERMINAL_COLORS.INFO,
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    borderBottom: `1px solid ${TERMINAL_COLORS.BORDER}`,
                    paddingBottom: '2px',
                  }}
                >
                  {section.category}
                </div>
                {section.kpis.map((kpi, kpiIndex) => (
                  <div
                    key={kpiIndex}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '2px 0',
                      fontSize: TERMINAL_TYPOGRAPHY.FONT_SIZE_XS,
                    }}
                  >
                    <span style={{ color: TERMINAL_COLORS.TEXT_SECONDARY }}>
                      {kpi.label}
                    </span>
                    <span style={{ color: TERMINAL_COLORS.TEXT_PRIMARY, fontWeight: 500 }}>
                      {kpi.value}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ExpenseDialog
        open={activeDialog === "expense"}
        onOpenChange={(open) => setActiveDialog(open ? "expense" : null)}
        onSave={handleSaveExpense}
        isSubmitting={createExpense.isPending}
      />

      {activeDialog === "policy" && (
        <div className="modal-overlay" onClick={() => setActiveDialog(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Policy Submission</h2>
              <button
                className="modal-close"
                onClick={() => setActiveDialog(null)}
              >
                ×
              </button>
            </div>
            <PolicyForm
              onClose={() => setActiveDialog(null)}
              addPolicy={handleAddPolicy}
              updatePolicy={() => Promise.resolve()}
              getPolicyById={() => undefined}
            />
          </div>
        </div>
      )}
    </PageLayout>
  );
};
