# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Checkpoint] - 2025-12-18 15:20:08

### Changed Files
- `.claude/commands/continue-prompt.md`
- `docs/lemon-squeezy-setup.md`
- `plans/active/DASHBOARD_GATING_CONTINUATION.md`
- `plans/active/dashboard-feature-gating.md`
- `plans/active/feature-gating-implementation.md`
- `scripts/generate-continuation-prompt.sh`
- `src/components/auth/RouteGuard.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/subscription/FeatureGate.tsx`
- `src/components/subscription/UpgradePrompt.tsx`
- `src/components/subscription/index.ts`
- `src/features/dashboard/DashboardHome.tsx`
- `src/features/dashboard/components/GatedAction.tsx`
- `src/features/dashboard/components/GatedKPISection.tsx`
- `src/features/dashboard/components/GatedStat.tsx`
- `src/features/dashboard/components/KPIGridHeatmap.tsx`
- `src/features/dashboard/components/QuickActionsPanel.tsx`
- `src/features/dashboard/components/StatItem.tsx`
- `src/features/dashboard/components/index.ts`
- `src/features/dashboard/config/kpiConfig.ts`
- `src/features/dashboard/config/metricsConfig.ts`
- `src/features/dashboard/config/statsConfig.ts`
- `src/features/hierarchy/components/SendInvitationModal.tsx`
- `src/features/settings/billing/BillingTab.tsx`
- `src/hooks/dashboard/index.ts`
- `src/hooks/dashboard/useDashboardFeatures.ts`
- `src/hooks/subscription/index.ts`
- `src/hooks/subscription/useFeatureAccess.ts`
- `src/hooks/subscription/useTeamSizeLimit.ts`
- `src/hooks/subscription/useUsageTracking.ts`
- `src/router.tsx`
- `src/services/subscription/subscriptionService.ts`
- `src/types/dashboard.types.ts`
- `src/types/database.types.ts`
- `supabase/functions/lemon-webhook/index.ts`
- `supabase/migrations/20251218_006_lemon_squeezy_integration.sql`
- `supabase/migrations/20251218_007_billing_email_templates.sql`
- `supabase/migrations/20251218_008_pro_tier_updates.sql`
- `tsconfig.tsbuildinfo`

### Statistics
```
 39 files changed, 10270 insertions(+), 5204 deletions(-)
```

## [Checkpoint] - 2025-12-18 11:02:56

### Changed Files
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `src/features/settings/SettingsDashboard.tsx`
- `src/features/settings/billing/BillingTab.tsx`
- `src/features/settings/billing/components/CurrentPlanCard.tsx`
- `src/features/settings/billing/components/PlanComparisonTable.tsx`
- `src/features/settings/billing/components/UsageOverview.tsx`
- `src/features/settings/billing/index.ts`
- `src/hooks/admin/__tests__/useUsersView.role-based-filter.test.ts`
- `src/hooks/subscription/index.ts`
- `src/hooks/subscription/useSubscription.ts`
- `src/hooks/subscription/useSubscriptionPlans.ts`
- `src/hooks/subscription/useUsageTracking.ts`
- `src/services/subscription/index.ts`
- `src/services/subscription/subscriptionService.ts`
- `src/types/database.types.ts`
- `supabase/migrations/20251218_005_subscription_tiering_system.sql`
- `tsconfig.tsbuildinfo`

### Statistics
```
 18 files changed, 2090 insertions(+), 15 deletions(-)
```

## [Checkpoint] - 2025-12-18 11:02:32

### Changed Files
- `src/features/settings/SettingsDashboard.tsx`
- `src/features/settings/billing/BillingTab.tsx`
- `src/features/settings/billing/components/CurrentPlanCard.tsx`
- `src/features/settings/billing/components/PlanComparisonTable.tsx`
- `src/features/settings/billing/components/UsageOverview.tsx`
- `src/features/settings/billing/index.ts`
- `src/hooks/admin/__tests__/useUsersView.role-based-filter.test.ts`
- `src/hooks/subscription/index.ts`
- `src/hooks/subscription/useSubscription.ts`
- `src/hooks/subscription/useSubscriptionPlans.ts`
- `src/hooks/subscription/useUsageTracking.ts`
- `src/services/subscription/index.ts`
- `src/services/subscription/subscriptionService.ts`
- `src/types/database.types.ts`
- `supabase/migrations/20251218_005_subscription_tiering_system.sql`
- `tsconfig.tsbuildinfo`

### Statistics
```
 16 files changed, 2060 insertions(+), 10 deletions(-)
```

## [Checkpoint] - 2025-12-18 08:14:30

### Changed Files
- `supabase/functions/check-user-exists/index.ts`
- `supabase/functions/create-auth-user/index.ts`
- `supabase/migrations/20251218_001_cleanup_orphan_identities.sql`
- `supabase/migrations/20251218_002_delete_specific_orphan.sql`
- `supabase/migrations/20251218_003_check_hidden_user.sql`
- `supabase/migrations/20251218_004_delete_nick_identity.sql`

### Statistics
```
 6 files changed, 239 insertions(+), 11 deletions(-)
```

## [Checkpoint] - 2025-12-18 07:51:02

### Changed Files
- `src/features/admin/components/AddUserDialog.tsx`
- `src/services/recruiting/recruitingService.ts`
- `supabase/functions/create-auth-user/index.ts`

### Statistics
```
 3 files changed, 43 insertions(+), 7 deletions(-)
```

## [Checkpoint] - 2025-12-17 17:08:29

### Changed Files
- `eslint.config.js`
- `plans/active/CONTINUE_ESLINT_FIX.md`
- `plans/active/eslint-fix-continuation.md`
- `src/components/shared/DataTable.tsx`
- `src/contexts/AuthContext.tsx`
- `src/features/admin/components/AuthDiagnostic.tsx`
- `src/features/admin/components/UserManagementDashboard.tsx`
- `src/features/analytics/components/CarriersProductsBreakdown.tsx`
- `src/features/analytics/components/ClientSegmentation.tsx`
- `src/features/analytics/components/GamePlan.tsx`
- `src/features/auth/Login.tsx`
- `src/features/auth/hooks/useEmailVerification.ts`
- `src/features/comps/CompTable.tsx`
- `src/features/dashboard/DashboardHome.tsx`
- `src/features/hierarchy/AgentDetailPage.tsx`
- `src/features/hierarchy/components/AgentDetailModal.backup.tsx`
- `src/features/hierarchy/components/AgentDetailModal.old.tsx`
- `src/features/hierarchy/components/AgentDetailModal.tsx`
- `src/features/hierarchy/components/AgentTable.tsx`
- `src/features/hierarchy/components/EditAgentModal.tsx`
- `src/features/hierarchy/components/InviteDownline.tsx`
- `src/features/recruiting/admin/ChecklistItemEditor.tsx`
- `src/features/recruiting/admin/PipelineTemplateEditor.tsx`
- `src/features/recruiting/components/AddRecruitDialog.tsx`
- `src/features/recruiting/components/DeleteRecruitDialog.optimized.tsx`
- `src/features/recruiting/components/DeleteRecruitDialog.tsx`
- `src/features/recruiting/components/DocumentViewerDialog.tsx`
- `src/features/recruiting/components/PhaseChecklist.tsx`
- `src/features/recruiting/components/RecruitDetailPanel.tsx`
- `src/features/recruiting/hooks/useRecruitMutations.ts`
- `src/features/recruiting/pages/MyRecruitingPipeline.tsx`
- `src/features/reports/components/charts/AreaStackedChart.tsx`
- `src/features/reports/components/charts/BarComparisonChart.tsx`
- `src/features/reports/components/charts/PieBreakdownChart.tsx`
- `src/features/reports/components/charts/ScatterCorrelationChart.tsx`
- `src/features/reports/components/charts/TrendLineChart.tsx`
- `src/features/reports/components/drill-down/DrillDownDrawer.tsx`
- `src/features/settings/commission-rates/CommissionRatesManagement.tsx`
- `src/features/settings/commission-rates/components/RateEditDialog.tsx`
- `src/features/settings/commission-rates/hooks/useCommissionRates.ts`
- `src/features/settings/components/CompGuideImporter.tsx`
- `src/features/settings/components/UserProfile.tsx`
- `src/features/targets/components/CommissionRateDisplay.tsx`
- `src/features/targets/components/PersistencyScenarios.tsx`
- `src/features/test/TestCompGuide.tsx`
- `src/features/training-hub/components/EventTypeManager.tsx`
- `src/features/training-hub/components/WorkflowDiagnostic.tsx`
- `src/features/training-hub/components/WorkflowDialog.tsx`
- `src/features/training-hub/components/WorkflowReview.tsx`
- `src/features/training-hub/components/WorkflowTriggerSetup.tsx`
- `src/features/training-hub/components/WorkflowWizard.tsx`
- `src/hooks/base/useFilter.ts`
- `src/hooks/base/useTableData.ts`
- `src/hooks/carriers/useUpdateCarrier.ts`
- `src/hooks/commissions/useCommissionMetrics.ts`
- `src/hooks/commissions/useUpdateCommissionStatus.ts`
- `src/hooks/comps/useCompRates.ts`
- `src/hooks/kpi/useMetricsWithDateRange.ts`
- `src/hooks/recruiting/usePipeline.ts`
- `src/hooks/targets/useHistoricalAverages.ts`
- `src/hooks/workflows/useWorkflows.ts`
- `src/services/analytics/breakevenService.ts`
- `src/services/analytics/segmentationService.ts`
- `src/services/clients/clientService.ts`
- `src/services/commissions/CommissionAnalyticsService.ts`
- `src/services/commissions/CommissionCRUDService.ts`
- `src/services/commissions/CommissionCalculationService.ts`
- `src/services/commissions/CommissionRepository.ts`
- `src/services/commissions/CommissionStatusService.ts`
- `src/services/commissions/chargebackService.ts`
- `src/services/commissions/commissionRateService.ts`
- `src/services/commissions/commissionService.ts`
- `src/services/compGuide/compGuideService.ts`
- `src/services/expenses/expenseService.ts`
- `src/services/hierarchy/hierarchyService.ts`
- `src/services/kpi/metricCalculationService.ts`
- `src/services/messaging/realtimeMessaging.ts`
- `src/services/overrides/overrideService.ts`
- `src/services/permissions/permissionService.ts`
- `src/services/policies/PolicyRepository.ts`
- `src/services/recruiting/authUserService.ts`
- `src/services/recruiting/checklistService.ts`
- `src/services/reports/drillDownService.ts`
- `src/services/reports/forecastingService.ts`
- `src/services/reports/insightsService.ts`
- `src/services/reports/reportExportService.ts`
- `src/services/reports/reportGenerationService.ts`
- `src/services/settings/AgentRepository.ts`
- `src/services/settings/agentService.ts`
- `src/services/settings/agentSettingsService.ts`
- `src/services/settings/compGuideService.ts`
- `src/services/targets/targetsService.ts`
- `src/services/uploads/types.ts`
- `src/services/userTargets/userTargetsService.ts`
- `src/services/workflowService.ts`
- `src/test/checkUser.tsx`
- `src/types/agent-detail.types.ts`
- `src/types/client.types.ts`
- `src/types/commission.types.ts`
- `src/types/notification.types.ts`
- `src/types/product.types.ts`
- `src/types/recruiting.types.ts`
- `src/types/workflow.types.ts`
- `src/utils/dataMigration.ts`
- `src/utils/exportHelpers.ts`
- `src/utils/performance.ts`
- `src/utils/retry.ts`
- `src/utils/toast.ts`
- `supabase/functions/fix-active-agent-permissions/index.ts`
- `supabase/functions/fix-nick-user/index.ts`
- `supabase/functions/process-workflow/index.ts`

### Statistics
```
 111 files changed, 547 insertions(+), 1577 deletions(-)
```

## [Checkpoint] - 2025-12-17 14:16:17

### Changed Files
- `src/services/hierarchy/invitationService.ts`

### Statistics
```
 1 file changed, 77 insertions(+), 33 deletions(-)
```

## [Checkpoint] - 2025-12-17 13:49:04

### Changed Files
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `src/features/hierarchy/HierarchyDashboardCompact.tsx`
- `src/features/hierarchy/components/InvitationsList.tsx`
- `src/features/hierarchy/components/SentInvitationsCard.tsx`
- `src/hooks/hierarchy/useInvitations.ts`
- `src/services/emailService.ts`
- `src/services/hierarchy/invitationService.ts`
- `src/types/invitation.types.ts`
- `supabase/migrations/20251217_001_validate_invitation_eligibility.sql`
- `supabase/migrations/20251217_002_cleanup_stale_pending_invitations.sql`

### Statistics
```
 11 files changed, 669 insertions(+), 107 deletions(-)
```

## [Checkpoint] - 2025-12-17 13:48:47

### Changed Files
- `src/features/hierarchy/HierarchyDashboardCompact.tsx`
- `src/features/hierarchy/components/InvitationsList.tsx`
- `src/features/hierarchy/components/SentInvitationsCard.tsx`
- `src/hooks/hierarchy/useInvitations.ts`
- `src/services/emailService.ts`
- `src/services/hierarchy/invitationService.ts`
- `src/types/invitation.types.ts`
- `supabase/migrations/20251217_001_validate_invitation_eligibility.sql`
- `supabase/migrations/20251217_002_cleanup_stale_pending_invitations.sql`

### Statistics
```
 9 files changed, 648 insertions(+), 103 deletions(-)
```

## [Checkpoint] - 2025-12-17 12:31:37

### Changed Files
- `src/features/analytics/components/PaceMetrics.tsx`
- `src/features/analytics/components/TimePeriodSelector.tsx`
- `src/features/analytics/context/AnalyticsDateContext.tsx`
- `src/features/comps/CompGuide.tsx`
- `src/features/dashboard/config/kpiConfig.ts`
- `src/features/dashboard/config/metricsConfig.ts`
- `src/features/dashboard/config/statsConfig.ts`
- `src/features/email/components/block-builder/EmailBlockBuilder.tsx`
- `src/features/email/components/block-builder/blocks/TextBlock.tsx`
- `src/features/expenses/components/ExpensePageHeader.tsx`
- `src/features/hierarchy/components/AgentDetailModal.tsx`
- `src/features/hierarchy/components/EditAgentModal.tsx`
- `src/features/hierarchy/components/HierarchyTree.tsx`
- `src/features/hierarchy/components/OverrideDashboard.tsx`
- `src/features/hierarchy/components/SendInvitationModal.tsx`
- `src/features/hierarchy/components/SentInvitationsCard.tsx`
- `src/features/recruiting/admin/PhaseEditor.tsx`
- `src/features/recruiting/admin/PipelineAdminPage.tsx`
- `src/features/recruiting/admin/PipelineTemplatesList.tsx`
- `src/features/recruiting/hooks/useRecruitDocuments.ts`
- `src/features/reports/components/ReportSelector.tsx`
- `src/features/settings/components/CompGuideImporter.tsx`
- `src/features/training-hub/components/ActionConfigPanel.tsx`
- `src/hooks/admin/useUserApproval.ts`
- `src/hooks/base/useLocalStorage.ts`
- `src/hooks/carriers/useCarriers.ts`
- `src/hooks/commissions/useCommissions.ts`
- `src/hooks/comps/useCompRates.ts`
- `src/hooks/expenses/useExpenseCategories.ts`
- `src/hooks/expenses/useGenerateRecurring.ts`
- `src/hooks/kpi/useMetricsWithDateRange.ts`
- `src/hooks/permissions/usePermissions.ts`
- `src/hooks/targets/useAchievements.ts`
- `src/hooks/targets/useTargetProgress.ts`
- `src/services/analytics/attributionService.ts`
- `src/services/analytics/breakevenService.ts`
- `src/services/analytics/goalTrackingService.ts`
- `src/services/commissions/CommissionRepository.ts`
- `src/services/commissions/CommissionStatusService.ts`
- `src/services/commissions/__tests__/commissionRateService.test.ts`
- `src/services/commissions/chargebackService.ts`
- `src/services/commissions/commissionRateService.ts`
- `src/services/commissions/index.ts`
- `src/services/expenses/expenseCategoryService.ts`
- `src/services/hierarchy/__tests__/hierarchyService.test.ts`
- `src/services/hierarchy/invitationService.ts`
- `src/services/kpi/metricCalculationService.ts`
- `src/services/messaging/realtimeMessaging.ts`
- `src/services/reports/drillDownService.ts`
- `src/services/reports/forecastingService.ts`
- `src/services/reports/reportExportService.ts`
- `src/services/settings/AgentRepository.ts`
- `src/services/settings/agentService.ts`
- `src/services/settings/agentSettingsService.ts`
- `src/services/settings/carrierService.ts`
- `src/services/settings/compGuideService.ts`
- `src/services/settings/index.ts`
- `src/services/settings/productService.ts`
- `src/services/targets/targetsService.ts`
- `src/services/workflow-recipient-resolver.ts`
- `src/types/carrier.types.ts`
- `src/types/commission.types.ts`
- `src/types/expense.types.ts`
- `src/types/legacy/user-v1.types.ts`
- `src/utils/__tests__/dateRange.test.ts`
- `src/utils/dashboardCalculations.ts`
- `src/utils/dataMigration.ts`
- `supabase/functions/create-auth-user/index.ts`

### Statistics
```
 68 files changed, 89 insertions(+), 120 deletions(-)
```

## [Checkpoint] - 2025-12-17 10:38:01

### Changed Files
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `plans/active/CONTINUATION_dashboard_redesign.md`
- `src/features/dashboard/DashboardHome.tsx`
- `src/features/dashboard/components/AlertsPanel.tsx`
- `src/features/dashboard/components/DateRangeDisplay.tsx`
- `src/features/dashboard/components/KPIGrid.tsx`
- `src/features/dashboard/components/KPIGridHeatmap.tsx`
- `src/features/dashboard/components/KPIGridMatrix.tsx`
- `src/features/dashboard/components/KPIGridNarrative.tsx`
- `src/features/dashboard/components/PerformanceOverviewCard.tsx`
- `src/features/dashboard/components/PeriodNavigator.tsx`
- `src/features/dashboard/components/QuickActionsPanel.tsx`
- `src/features/dashboard/components/QuickStatsPanel.tsx`
- `src/features/dashboard/components/SkeletonLoaders.tsx`
- `src/features/dashboard/components/StatItem.tsx`
- `src/features/dashboard/components/TimePeriodSwitcher.tsx`
- `src/features/dashboard/components/kpi-layouts/NarrativeInsight.tsx`

### Statistics
```
 18 files changed, 532 insertions(+), 348 deletions(-)
```

## [Checkpoint] - 2025-12-17 10:37:36

### Changed Files
- `plans/active/CONTINUATION_dashboard_redesign.md`
- `src/features/dashboard/DashboardHome.tsx`
- `src/features/dashboard/components/AlertsPanel.tsx`
- `src/features/dashboard/components/DateRangeDisplay.tsx`
- `src/features/dashboard/components/KPIGrid.tsx`
- `src/features/dashboard/components/KPIGridHeatmap.tsx`
- `src/features/dashboard/components/KPIGridMatrix.tsx`
- `src/features/dashboard/components/KPIGridNarrative.tsx`
- `src/features/dashboard/components/PerformanceOverviewCard.tsx`
- `src/features/dashboard/components/PeriodNavigator.tsx`
- `src/features/dashboard/components/QuickActionsPanel.tsx`
- `src/features/dashboard/components/QuickStatsPanel.tsx`
- `src/features/dashboard/components/SkeletonLoaders.tsx`
- `src/features/dashboard/components/StatItem.tsx`
- `src/features/dashboard/components/TimePeriodSwitcher.tsx`
- `src/features/dashboard/components/kpi-layouts/NarrativeInsight.tsx`

### Statistics
```
 16 files changed, 502 insertions(+), 342 deletions(-)
```

## [Checkpoint] - 2025-12-17 10:17:39

### Changed Files
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `plans/active/CONTINUATION_policies_page_redesign.md`
- `src/features/policies/PolicyDashboard.tsx`
- `src/features/policies/PolicyForm.tsx`
- `src/features/policies/PolicyList.tsx`
- `src/features/policies/components/PolicyDashboardHeader.tsx`
- `src/features/policies/components/PolicyDialog.tsx`

### Statistics
```
 8 files changed, 646 insertions(+), 563 deletions(-)
```

## [Checkpoint] - 2025-12-17 10:15:03

### Changed Files
- `plans/active/CONTINUATION_policies_page_redesign.md`
- `src/features/policies/PolicyDashboard.tsx`
- `src/features/policies/PolicyForm.tsx`
- `src/features/policies/PolicyList.tsx`
- `src/features/policies/components/PolicyDashboardHeader.tsx`
- `src/features/policies/components/PolicyDialog.tsx`

### Statistics
```
 6 files changed, 624 insertions(+), 523 deletions(-)
```

## [Checkpoint] - 2025-12-17 10:02:37

### Changed Files
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `src/features/hierarchy/HierarchyDashboardCompact.tsx`
- `src/features/hierarchy/components/AgentTable.tsx`
- `src/features/hierarchy/components/HierarchyManagement.tsx`
- `src/features/hierarchy/components/InvitationsList.tsx`
- `src/features/hierarchy/components/TeamActivityFeed.tsx`
- `src/features/hierarchy/components/TeamMetricsCard.tsx`

### Statistics
```
 8 files changed, 266 insertions(+), 266 deletions(-)
```

## [Checkpoint] - 2025-12-17 10:02:13

### Changed Files
- `src/features/hierarchy/HierarchyDashboardCompact.tsx`
- `src/features/hierarchy/components/AgentTable.tsx`
- `src/features/hierarchy/components/HierarchyManagement.tsx`
- `src/features/hierarchy/components/InvitationsList.tsx`
- `src/features/hierarchy/components/TeamActivityFeed.tsx`
- `src/features/hierarchy/components/TeamMetricsCard.tsx`

### Statistics
```
 6 files changed, 246 insertions(+), 259 deletions(-)
```

## [Checkpoint] - 2025-12-17 09:43:50

### Changed Files
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `src/features/messages/MessagesPage.tsx`
- `src/features/messages/components/inbox/ThreadList.tsx`
- `src/features/messages/components/inbox/ThreadListItem.tsx`
- `src/features/messages/components/layout/MessagesLayout.tsx`
- `src/features/messages/components/thread/ThreadView.tsx`
- `src/features/recruiting/RecruitingDashboard.tsx`
- `src/features/recruiting/components/RecruitListTable.tsx`

### Statistics
```
 9 files changed, 631 insertions(+), 565 deletions(-)
```

## [Checkpoint] - 2025-12-17 09:42:56

### Changed Files
- `src/features/messages/MessagesPage.tsx`
- `src/features/messages/components/inbox/ThreadList.tsx`
- `src/features/messages/components/inbox/ThreadListItem.tsx`
- `src/features/messages/components/layout/MessagesLayout.tsx`
- `src/features/messages/components/thread/ThreadView.tsx`
- `src/features/recruiting/RecruitingDashboard.tsx`
- `src/features/recruiting/components/RecruitListTable.tsx`

### Statistics
```
 7 files changed, 605 insertions(+), 554 deletions(-)
```

## [Checkpoint] - 2025-12-16 18:26:06

### Changed Files
- `.serena/memories/EMAIL_SYSTEM_MAILGUN_MIGRATION_COMPLETE.md`
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `plans/active/ACTIVE_SESSION_CONTINUATION.md`
- `plans/active/email-system-mailgun-migration.md`
- `src/features/messages/MessagesPage.tsx`
- `src/features/messages/components/inbox/ThreadList.tsx`
- `src/features/messages/components/inbox/ThreadListItem.tsx`
- `src/features/messages/components/thread/ThreadView.tsx`
- `src/features/messages/hooks/useFolderCounts.ts`
- `src/features/messages/services/emailService.ts`
- `src/features/messages/services/threadService.ts`
- `supabase/functions/inbound-email/index.ts`
- `supabase/functions/send-automated-email/index.ts`
- `supabase/functions/send-email/index.ts`
- `supabase/migrations/20251216_001_mailgun_migration.sql`

### Statistics
```
 16 files changed, 1850 insertions(+), 409 deletions(-)
```

## [Checkpoint] - 2025-12-16 18:25:47

### Changed Files
- `.serena/memories/EMAIL_SYSTEM_MAILGUN_MIGRATION_COMPLETE.md`
- `plans/active/ACTIVE_SESSION_CONTINUATION.md`
- `plans/active/email-system-mailgun-migration.md`
- `src/features/messages/MessagesPage.tsx`
- `src/features/messages/components/inbox/ThreadList.tsx`
- `src/features/messages/components/inbox/ThreadListItem.tsx`
- `src/features/messages/components/thread/ThreadView.tsx`
- `src/features/messages/hooks/useFolderCounts.ts`
- `src/features/messages/services/emailService.ts`
- `src/features/messages/services/threadService.ts`
- `supabase/functions/inbound-email/index.ts`
- `supabase/functions/send-automated-email/index.ts`
- `supabase/functions/send-email/index.ts`
- `supabase/migrations/20251216_001_mailgun_migration.sql`

### Statistics
```
 14 files changed, 1822 insertions(+), 404 deletions(-)
```

## [Checkpoint] - 2025-12-16 16:50:18

### Changed Files
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `plans/active/ACTIVE_SESSION_CONTINUATION.md`
- `src/features/messages/MessagesPage.tsx`
- `src/features/messages/components/compose/ComposeDialog.tsx`
- `src/features/messages/components/inbox/ThreadList.tsx`
- `src/features/messages/components/layout/MessagesHeader.tsx`
- `src/features/messages/components/thread/ThreadView.tsx`
- `src/features/messages/hooks/useFolderCounts.ts`
- `src/features/messages/hooks/useSendEmail.ts`
- `src/features/messages/hooks/useThread.ts`
- `src/features/messages/hooks/useThreads.ts`
- `src/features/messages/services/emailService.ts`
- `src/features/messages/services/threadService.ts`
- `supabase/functions/send-email/index.ts`
- `supabase/migrations/20251216_001_fix_user_emails_rls_type_cast.sql`
- `supabase/migrations/20251216_002_fix_user_emails_rls_correct_types.sql`
- `supabase/migrations/20251216_003_update_admin_email.sql`
- `supabase/migrations/20251216_008_fix_email_quota_rls.sql`

### Statistics
```
 19 files changed, 1374 insertions(+), 354 deletions(-)
```

## [Checkpoint] - 2025-12-16 16:50:02

### Changed Files
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `plans/active/ACTIVE_SESSION_CONTINUATION.md`
- `src/features/messages/MessagesPage.tsx`
- `src/features/messages/components/compose/ComposeDialog.tsx`
- `src/features/messages/components/inbox/ThreadList.tsx`
- `src/features/messages/components/layout/MessagesHeader.tsx`
- `src/features/messages/components/thread/ThreadView.tsx`
- `src/features/messages/hooks/useFolderCounts.ts`
- `src/features/messages/hooks/useSendEmail.ts`
- `src/features/messages/hooks/useThread.ts`
- `src/features/messages/hooks/useThreads.ts`
- `src/features/messages/services/emailService.ts`
- `src/features/messages/services/threadService.ts`
- `supabase/functions/send-email/index.ts`
- `supabase/migrations/20251216_001_fix_user_emails_rls_type_cast.sql`
- `supabase/migrations/20251216_002_fix_user_emails_rls_correct_types.sql`
- `supabase/migrations/20251216_003_update_admin_email.sql`
- `supabase/migrations/20251216_008_fix_email_quota_rls.sql`

### Statistics
```
 19 files changed, 1346 insertions(+), 354 deletions(-)
```

## [Checkpoint] - 2025-12-16 16:49:09

### Changed Files
- `plans/active/ACTIVE_SESSION_CONTINUATION.md`
- `src/features/messages/MessagesPage.tsx`
- `src/features/messages/components/compose/ComposeDialog.tsx`
- `src/features/messages/components/inbox/ThreadList.tsx`
- `src/features/messages/components/layout/MessagesHeader.tsx`
- `src/features/messages/components/thread/ThreadView.tsx`
- `src/features/messages/hooks/useFolderCounts.ts`
- `src/features/messages/hooks/useSendEmail.ts`
- `src/features/messages/hooks/useThread.ts`
- `src/features/messages/hooks/useThreads.ts`
- `src/features/messages/services/emailService.ts`
- `src/features/messages/services/threadService.ts`
- `supabase/functions/send-email/index.ts`
- `supabase/migrations/20251216_001_fix_user_emails_rls_type_cast.sql`
- `supabase/migrations/20251216_002_fix_user_emails_rls_correct_types.sql`
- `supabase/migrations/20251216_003_update_admin_email.sql`
- `supabase/migrations/20251216_008_fix_email_quota_rls.sql`

### Statistics
```
 17 files changed, 1314 insertions(+), 348 deletions(-)
```

## [Checkpoint] - 2025-12-16 15:04:05

### Changed Files
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `src/features/messages/MessagesPage.tsx`
- `src/features/messages/components/compose/ComposeDialog.tsx`
- `src/features/messages/components/compose/ContactBrowser.tsx`
- `src/features/messages/components/inbox/ThreadList.tsx`
- `src/features/messages/components/labels/CreateLabelDialog.tsx`
- `src/features/messages/components/layout/MessagesSidebar.tsx`
- `src/features/messages/components/layout/index.ts`
- `src/features/messages/components/thread/ThreadView.tsx`
- `src/features/messages/hooks/index.ts`
- `src/features/messages/hooks/useContactBrowser.ts`
- `src/features/messages/hooks/useFolderCounts.ts`
- `src/features/messages/hooks/useThreads.ts`
- `src/features/messages/index.ts`
- `src/features/messages/services/emailService.ts`
- `src/features/messages/services/threadService.ts`
- `tsconfig.tsbuildinfo`

### Statistics
```
 18 files changed, 728 insertions(+), 388 deletions(-)
```

## [Checkpoint] - 2025-12-16 15:03:25

### Changed Files
- `src/features/messages/MessagesPage.tsx`
- `src/features/messages/components/compose/ComposeDialog.tsx`
- `src/features/messages/components/compose/ContactBrowser.tsx`
- `src/features/messages/components/inbox/ThreadList.tsx`
- `src/features/messages/components/labels/CreateLabelDialog.tsx`
- `src/features/messages/components/layout/MessagesSidebar.tsx`
- `src/features/messages/components/layout/index.ts`
- `src/features/messages/components/thread/ThreadView.tsx`
- `src/features/messages/hooks/index.ts`
- `src/features/messages/hooks/useContactBrowser.ts`
- `src/features/messages/hooks/useFolderCounts.ts`
- `src/features/messages/hooks/useThreads.ts`
- `src/features/messages/index.ts`
- `src/features/messages/services/emailService.ts`
- `src/features/messages/services/threadService.ts`
- `tsconfig.tsbuildinfo`

### Statistics
```
 16 files changed, 698 insertions(+), 382 deletions(-)
```

## [Checkpoint] - 2025-12-16 14:00:05

### Changed Files
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `plans/active/email-compose-contact-picker-plan.md`
- `src/features/messages/MessagesPage.tsx`
- `src/features/messages/components/compose/ComposeDialog.tsx`
- `src/features/messages/components/compose/ContactBrowser.tsx`
- `src/features/messages/components/compose/ContactPicker.tsx`
- `src/features/messages/components/compose/index.ts`
- `src/features/messages/hooks/useContactBrowser.ts`
- `src/features/messages/hooks/useContacts.ts`
- `src/features/messages/services/contactService.ts`
- `src/features/messages/services/emailService.ts`
- `src/types/database.types.ts`
- `supabase/migrations/20251216_007_contact_favorites.sql`
- `tsconfig.tsbuildinfo`

### Statistics
```
 15 files changed, 7275 insertions(+), 4856 deletions(-)
```

## [Checkpoint] - 2025-12-16 13:59:30

### Changed Files
- `plans/active/email-compose-contact-picker-plan.md`
- `src/features/messages/MessagesPage.tsx`
- `src/features/messages/components/compose/ComposeDialog.tsx`
- `src/features/messages/components/compose/ContactBrowser.tsx`
- `src/features/messages/components/compose/ContactPicker.tsx`
- `src/features/messages/components/compose/index.ts`
- `src/features/messages/hooks/useContactBrowser.ts`
- `src/features/messages/hooks/useContacts.ts`
- `src/features/messages/services/contactService.ts`
- `src/features/messages/services/emailService.ts`
- `src/types/database.types.ts`
- `supabase/migrations/20251216_007_contact_favorites.sql`
- `tsconfig.tsbuildinfo`

### Statistics
```
 13 files changed, 7249 insertions(+), 4851 deletions(-)
```

## [Checkpoint] - 2025-12-16 12:27:17

### Changed Files
- `.serena/memories/COMMUNICATIONS_HUB_ARCHITECTURE.md`
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `plans/active/communications-hub-implementation-plan.md`
- `scripts/apply-migration.sh`
- `src/components/layout/Sidebar.tsx`
- `src/features/messages/MessagesPage.tsx`
- `src/features/messages/components/compose/ComposeDialog.tsx`
- `src/features/messages/components/compose/index.ts`
- `src/features/messages/components/inbox/ThreadList.tsx`
- `src/features/messages/components/inbox/ThreadListItem.tsx`
- `src/features/messages/components/inbox/index.ts`
- `src/features/messages/components/layout/MessagesHeader.tsx`
- `src/features/messages/components/layout/MessagesLayout.tsx`
- `src/features/messages/components/layout/MessagesSidebar.tsx`
- `src/features/messages/components/layout/index.ts`
- `src/features/messages/components/thread/ThreadView.tsx`
- `src/features/messages/components/thread/index.ts`
- `src/features/messages/hooks/index.ts`
- `src/features/messages/hooks/useLabels.ts`
- `src/features/messages/hooks/useSendEmail.ts`
- `src/features/messages/hooks/useThread.ts`
- `src/features/messages/hooks/useThreads.ts`
- `src/features/messages/index.ts`
- `src/features/messages/services/emailService.ts`
- `src/features/messages/services/index.ts`
- `src/features/messages/services/labelService.ts`
- `src/features/messages/services/threadService.ts`
- `src/router.tsx`
- `src/types/database.types.ts`
- `supabase/migrations/20251216_004_messages_hub_foundation.sql`
- `supabase/migrations/20251216_005_messages_hub_tracking.sql`
- `supabase/migrations/20251216_006_add_messages_permission.sql`
- `tsconfig.tsbuildinfo`

### Statistics
```
 34 files changed, 5436 insertions(+), 11 deletions(-)
```

## [Checkpoint] - 2025-12-16 12:24:35

### Changed Files
- `.serena/memories/COMMUNICATIONS_HUB_ARCHITECTURE.md`
- `plans/active/communications-hub-implementation-plan.md`
- `scripts/apply-migration.sh`
- `src/components/layout/Sidebar.tsx`
- `src/features/messages/MessagesPage.tsx`
- `src/features/messages/components/compose/ComposeDialog.tsx`
- `src/features/messages/components/compose/index.ts`
- `src/features/messages/components/inbox/ThreadList.tsx`
- `src/features/messages/components/inbox/ThreadListItem.tsx`
- `src/features/messages/components/inbox/index.ts`
- `src/features/messages/components/layout/MessagesHeader.tsx`
- `src/features/messages/components/layout/MessagesLayout.tsx`
- `src/features/messages/components/layout/MessagesSidebar.tsx`
- `src/features/messages/components/layout/index.ts`
- `src/features/messages/components/thread/ThreadView.tsx`
- `src/features/messages/components/thread/index.ts`
- `src/features/messages/hooks/index.ts`
- `src/features/messages/hooks/useLabels.ts`
- `src/features/messages/hooks/useSendEmail.ts`
- `src/features/messages/hooks/useThread.ts`
- `src/features/messages/hooks/useThreads.ts`
- `src/features/messages/index.ts`
- `src/features/messages/services/emailService.ts`
- `src/features/messages/services/index.ts`
- `src/features/messages/services/labelService.ts`
- `src/features/messages/services/threadService.ts`
- `src/router.tsx`
- `src/types/database.types.ts`
- `supabase/migrations/20251216_004_messages_hub_foundation.sql`
- `supabase/migrations/20251216_005_messages_hub_tracking.sql`
- `supabase/migrations/20251216_006_add_messages_permission.sql`
- `tsconfig.tsbuildinfo`

### Statistics
```
 32 files changed, 5357 insertions(+), 3 deletions(-)
```

## [Checkpoint] - 2025-12-16 10:21:34

### Changed Files
- `src/features/email/components/EmailConnectionManager.tsx`
- `src/features/email/hooks/useEmailConnection.ts`
- `src/features/email/index.ts`
- `src/features/email/services/emailConnectionService.ts`
- `src/features/settings/ConstantsManagement.tsx`
- `src/features/settings/SettingsDashboard.tsx`
- `src/features/settings/carriers/CarriersManagement.tsx`
- `src/features/settings/commission-rates/CommissionRatesManagement.tsx`
- `src/features/settings/components/SettingsComponents.tsx`
- `src/features/settings/components/UserProfile.tsx`
- `src/features/settings/products/ProductsManagement.tsx`
- `src/services/email/emailService.ts`
- `src/services/email/index.ts`
- `src/services/recruiting/recruitingService.ts`
- `supabase/functions/oauth-callback/index.ts`
- `supabase/functions/process-workflow/index.ts`
- `supabase/functions/send-email/index.ts`
- `supabase/migrations/20251216_003_remove_gmail_oauth_tables.sql`
- `tsconfig.tsbuildinfo`

### Statistics
```
 19 files changed, 901 insertions(+), 2113 deletions(-)
```

## [Checkpoint] - 2025-12-16 09:05:36

### Changed Files
- `supabase/migrations/20251216_002_fix_agent_role_permissions.sql`
- `tsconfig.tsbuildinfo`

### Statistics
```
 2 files changed, 55 insertions(+), 1 deletion(-)
```

## [Checkpoint] - 2025-12-15 18:01:57

### Changed Files
- `.serena/memories/CRITICAL_MIGRATION_SCRIPT_PATH.md`
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `src/services/users/userService.ts`
- `supabase/migrations/20251215_003_fix_admin_deleteuser_final.sql`

### Statistics
```
 5 files changed, 437 insertions(+), 64 deletions(-)
```

## [Checkpoint] - 2025-12-15 18:01:37

### Changed Files
- `.serena/memories/CRITICAL_MIGRATION_SCRIPT_PATH.md`
- `src/services/users/userService.ts`
- `supabase/migrations/20251215_003_fix_admin_deleteuser_final.sql`

### Statistics
```
 3 files changed, 421 insertions(+), 59 deletions(-)
```

## [Checkpoint] - 2025-12-15 17:34:54

### Changed Files
- `CLAUDE.md`
- `plans/active/CONTINUATION_PROMPT_20251215.md`
- `src/App.test.tsx`
- `src/features/policies/hooks/useUpdatePolicy.ts`
- `src/test-status-update.ts`
- `supabase/migrations/20251215_001_comp_guide_rls_select_policy.sql`
- `supabase/migrations/20251215_002_fix_commissions_rls_insert_policy.sql`
- `tsconfig.tsbuildinfo`

### Statistics
```
 8 files changed, 292 insertions(+), 152 deletions(-)
```

## [Checkpoint] - 2025-12-15 13:11:44

### Changed Files
- `.serena/memories/ACTIVE_SESSION_CONTINUATION.md`
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `src/features/policies/PolicyDashboard.tsx`
- `src/features/policies/PolicyForm.tsx`
- `src/features/policies/components/PolicyDialog.tsx`
- `src/features/policies/hooks/useUpdatePolicy.ts`
- `src/services/commissions/CommissionCRUDService.ts`
- `src/services/commissions/CommissionCalculationService.ts`
- `src/services/commissions/commissionService.ts`
- `src/services/policies/PolicyRepository.ts`
- `src/services/policies/policyService.ts`
- `tsconfig.tsbuildinfo`

### Statistics
```
 13 files changed, 440 insertions(+), 223 deletions(-)
```

## [Checkpoint] - 2025-12-15 13:10:52

### Changed Files
- `.serena/memories/ACTIVE_SESSION_CONTINUATION.md`
- `src/features/policies/PolicyDashboard.tsx`
- `src/features/policies/PolicyForm.tsx`
- `src/features/policies/components/PolicyDialog.tsx`
- `src/features/policies/hooks/useUpdatePolicy.ts`
- `src/services/commissions/CommissionCRUDService.ts`
- `src/services/commissions/CommissionCalculationService.ts`
- `src/services/commissions/commissionService.ts`
- `src/services/policies/PolicyRepository.ts`
- `src/services/policies/policyService.ts`
- `tsconfig.tsbuildinfo`

### Statistics
```
 11 files changed, 410 insertions(+), 213 deletions(-)
```

## [Checkpoint] - 2025-12-14 18:45:09

### Changed Files
- `src/features/admin/components/AddUserDialog.tsx`
- `src/features/auth/index.ts`
- `src/features/targets/components/CalculationBreakdown.tsx`
- `src/services/messaging/messagingService.ts`
- `supabase/config.toml`

### Statistics
```
 5 files changed, 202 insertions(+), 129 deletions(-)
```

## [Checkpoint] - 2025-12-14 15:34:52

### Changed Files
- `package-lock.json`
- `package.json`
- `supabase/config.toml`
- `supabase/templates/confirmation.html`
- `supabase/templates/email-change.html`
- `supabase/templates/magic-link.html`
- `supabase/templates/recovery.html`

### Statistics
```
 7 files changed, 2713 insertions(+), 155 deletions(-)
```

## [Checkpoint] - 2025-12-13 16:45:38

### Changed Files
- `src/services/users/userService.ts`
- `supabase/functions/create-auth-user/index.ts`

### Statistics
```
 2 files changed, 48 insertions(+), 71 deletions(-)
```

## [Checkpoint] - 2025-12-13 16:39:45

### Changed Files
- `src/features/admin/components/AdminControlCenter.tsx`
- `supabase/functions/create-auth-user/index.ts`

### Statistics
```
 2 files changed, 31 insertions(+), 100 deletions(-)
```

## [Checkpoint] - 2025-12-13 16:34:29

### Changed Files
- `docs/auth-email-fix-december-2024.md`
- `plans/TODO/create-user-not-working.md`
- `src/constants/dashboard.ts`
- `src/features/dashboard/components/StatItem.tsx`
- `src/features/dashboard/config/statsConfig.ts`
- `src/services/users/userService.ts`
- `src/types/dashboard.types.ts`
- `supabase/functions/create-auth-user/index.ts`
- `tailwind.config.js`

### Statistics
```
 9 files changed, 356 insertions(+), 179 deletions(-)
```

## [Checkpoint] - 2025-12-13 15:28:43

### Changed Files
- `ACTIVE_SESSION_CONTINUATION.md`
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `docs/email-templates/magic-link.html`
- `src/features/admin/components/AdminControlCenter.tsx`
- `src/features/admin/components/EditUserDialog.tsx`
- `src/services/users/userService.ts`

### Statistics
```
 7 files changed, 413 insertions(+), 83 deletions(-)
```

## [Checkpoint] - 2025-12-13 15:28:27

### Changed Files
- `ACTIVE_SESSION_CONTINUATION.md`
- `docs/email-templates/magic-link.html`
- `src/features/admin/components/AdminControlCenter.tsx`
- `src/features/admin/components/EditUserDialog.tsx`
- `src/services/users/userService.ts`

### Statistics
```
 5 files changed, 395 insertions(+), 78 deletions(-)
```

## [Checkpoint] - 2025-12-13 15:11:28

### Changed Files
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `docs/AUTH_FIX_COMPLETE.md`
- `docs/auth-config-instructions.md`
- `docs/auth-fix-summary.md`
- `docs/email-templates/README.md`
- `docs/email-templates/email-change.html`
- `docs/email-templates/invite-user.html`
- `docs/email-templates/magic-link.html`
- `docs/email-templates/reauthentication.html`
- `docs/email-templates/reset-password.html`
- `docs/email-templates/verify-email.html`
- `scripts/apply-migration.js`
- `scripts/apply-migration.sh`
- `scripts/check-user-profile-trigger.sql`
- `scripts/deploy-edge-function.sh`
- `src/features/auth/Login.tsx`
- `src/services/recruiting/authUserService.ts`
- `src/services/recruiting/recruitingService.ts`
- `supabase/functions/configure-email-templates/index.ts`
- `supabase/functions/create-auth-user/index.ts`
- `supabase/migrations/20241213_010_fix_user_profile_trigger.sql`
- `tsconfig.tsbuildinfo`

### Statistics
```
 23 files changed, 2218 insertions(+), 549 deletions(-)
```

## [Checkpoint] - 2025-12-13 15:10:30

### Changed Files
- `docs/AUTH_FIX_COMPLETE.md`
- `docs/auth-config-instructions.md`
- `docs/auth-fix-summary.md`
- `docs/email-templates/README.md`
- `docs/email-templates/email-change.html`
- `docs/email-templates/invite-user.html`
- `docs/email-templates/magic-link.html`
- `docs/email-templates/reauthentication.html`
- `docs/email-templates/reset-password.html`
- `docs/email-templates/verify-email.html`
- `scripts/apply-migration.js`
- `scripts/apply-migration.sh`
- `scripts/check-user-profile-trigger.sql`
- `scripts/deploy-edge-function.sh`
- `src/features/auth/Login.tsx`
- `src/services/recruiting/authUserService.ts`
- `src/services/recruiting/recruitingService.ts`
- `supabase/functions/configure-email-templates/index.ts`
- `supabase/functions/create-auth-user/index.ts`
- `supabase/migrations/20241213_010_fix_user_profile_trigger.sql`
- `tsconfig.tsbuildinfo`

### Statistics
```
 21 files changed, 2183 insertions(+), 543 deletions(-)
```

## [Checkpoint] - 2025-12-13 13:21:53

### Changed Files
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `scripts/apply-all-migrations.js`
- `scripts/apply-migration-direct.sh`
- `scripts/apply-migration.js`
- `scripts/fix-typescript-errors.js`
- `scripts/generate-sql-for-dashboard.js`
- `src/components/permissions/PermissionGate.tsx`
- `src/features/admin/components/AuthDiagnostic.tsx`
- `src/features/analytics/components/CommissionPipeline.tsx`
- `src/features/auth/Login.tsx`
- `src/features/email/components/block-builder/BlockStylePanel.tsx`
- `src/features/email/components/block-builder/FontPicker.tsx`
- `src/features/expenses/config/expenseStatsConfig.ts`
- `src/features/expenses/context/ExpenseDateContext.tsx`
- `src/features/hierarchy/components/AgentTable.tsx`
- `src/features/hierarchy/components/HierarchyTree.tsx`
- `src/features/hierarchy/components/OverrideDashboard.tsx`
- `src/features/hierarchy/components/SentInvitationsCard.tsx`
- `src/features/recruiting/admin/PipelineAdminPage.tsx`
- `src/features/recruiting/admin/PipelineTemplatesList.tsx`
- `src/features/recruiting/components/AddRecruitDialog.tsx`
- `src/features/recruiting/components/ComposeEmailDialog.tsx`
- `src/features/recruiting/components/PhaseChecklist.tsx`
- `src/features/recruiting/components/PhaseTimeline.tsx`
- `src/features/recruiting/hooks/usePipeline.ts`
- `src/features/recruiting/hooks/useRecruitDocuments.ts`
- `src/features/recruiting/pages/MyRecruitingPipeline.tsx`
- `supabase/migrations/20241213_005_admin_deleteuser_function.sql`
- `supabase/migrations/20241213_006_fix_admin_deleteuser_function.sql`
- `supabase/migrations/20241213_007_fix_admin_deleteuser_columns.sql`
- `supabase/migrations/20241213_008_minimal_admin_deleteuser.sql`
- `tsconfig.tsbuildinfo`

### Statistics
```
 33 files changed, 1090 insertions(+), 40 deletions(-)
```

## [Checkpoint] - 2025-12-13 13:05:42

### Changed Files
- `docs/admin-deleteuser-fix-summary.md`
- `docs/admin-deleteuser-implementation-complete.md`
- `docs/user-deletion-schema-mapping.md`
- `scripts/apply-all-migrations.js`
- `scripts/apply-migration-direct.sh`
- `scripts/apply-migration.js`
- `scripts/fix-typescript-errors.js`
- `scripts/generate-sql-for-dashboard.js`
- `scripts/test-admin-deleteuser.sql`
- `src/components/permissions/PermissionGate.tsx`
- `src/features/admin/components/AuthDiagnostic.tsx`
- `src/features/analytics/components/CommissionPipeline.tsx`
- `src/features/auth/Login.tsx`
- `src/features/email/components/block-builder/BlockStylePanel.tsx`
- `src/features/email/components/block-builder/FontPicker.tsx`
- `src/features/expenses/config/expenseStatsConfig.ts`
- `src/features/expenses/context/ExpenseDateContext.tsx`
- `src/features/hierarchy/components/AgentTable.tsx`
- `src/features/hierarchy/components/HierarchyTree.tsx`
- `src/features/hierarchy/components/OverrideDashboard.tsx`
- `src/features/hierarchy/components/SentInvitationsCard.tsx`
- `src/features/recruiting/admin/PipelineAdminPage.tsx`
- `src/features/recruiting/admin/PipelineTemplatesList.tsx`
- `src/features/recruiting/components/AddRecruitDialog.tsx`
- `src/features/recruiting/components/ComposeEmailDialog.tsx`
- `src/features/recruiting/components/PhaseChecklist.tsx`
- `src/features/recruiting/components/PhaseTimeline.tsx`
- `src/features/recruiting/hooks/usePipeline.ts`
- `src/features/recruiting/hooks/useRecruitDocuments.ts`
- `src/features/recruiting/pages/MyRecruitingPipeline.tsx`
- `supabase/migrations/20241213_005_admin_deleteuser_function.sql`
- `supabase/migrations/20241213_006_fix_admin_deleteuser_function.sql`
- `supabase/migrations/20241213_007_fix_admin_deleteuser_columns.sql`
- `supabase/migrations/20241213_008_minimal_admin_deleteuser.sql`
- `supabase/migrations/20241213_009_fix_admin_deleteuser_verified.sql`
- `tsconfig.tsbuildinfo`

### Statistics
```
 36 files changed, 1880 insertions(+), 35 deletions(-)
```

## [Checkpoint] - 2025-12-13 12:03:48

### Changed Files
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `scripts/test-admin-user-update.js`
- `scripts/test-contract-level-update.js`
- `scripts/test-userservice-update.js`
- `src/features/expenses/components/ExpenseDialogCompact.tsx`
- `src/services/reports/insightsService.ts`
- `src/services/users/userService.ts`

### Statistics
```
 8 files changed, 395 insertions(+), 30 deletions(-)
```

## [Checkpoint] - 2025-12-13 12:02:23

### Changed Files
- `scripts/test-admin-user-update.js`
- `scripts/test-contract-level-update.js`
- `scripts/test-userservice-update.js`
- `src/features/expenses/components/ExpenseDialogCompact.tsx`
- `src/services/reports/insightsService.ts`
- `src/services/users/userService.ts`

### Statistics
```
 6 files changed, 369 insertions(+), 18 deletions(-)
```

## [Checkpoint] - 2025-12-13 11:09:38

### Changed Files
- `CHANGELOG.md`
- `PROJECT_STATS.md`
- `scripts/apply-migration.js`
- `scripts/create-commission-function.js`
- `scripts/test-commission-function.js`
- `src/features/expenses/ExpenseDashboardCompact.tsx`
- `src/features/hierarchy/AgentDetailPage.tsx`
- `src/features/hierarchy/HierarchyDashboardCompact.tsx`
- `src/features/reports/components/drill-down/DrillDownDrawer.tsx`
- `src/services/clients/clientService.ts`
- `src/services/permissions/permissionService.ts`
- `src/types/database.types.ts`
- `supabase/migrations/20251213_001_add_getuser_commission_profile_function.sql`
- `supabase/migrations/20251213_002_fix_getuser_commission_profile_column.sql`
- `supabase/migrations/20251213_003_simplified_getuser_commission_profile.sql`
- `tsconfig.tsbuildinfo`

### Statistics
```
 16 files changed, 983 insertions(+), 112 deletions(-)
```

## [Checkpoint] - 2025-12-13 11:07:13

### Changed Files
- `scripts/apply-migration.js`
- `scripts/create-commission-function.js`
- `scripts/test-commission-function.js`
- `src/features/expenses/ExpenseDashboardCompact.tsx`
- `src/features/hierarchy/AgentDetailPage.tsx`
- `src/features/hierarchy/HierarchyDashboardCompact.tsx`
- `src/features/reports/components/drill-down/DrillDownDrawer.tsx`
- `src/services/clients/clientService.ts`
- `src/services/permissions/permissionService.ts`
- `src/types/database.types.ts`
- `supabase/migrations/20251213_001_add_getuser_commission_profile_function.sql`
- `supabase/migrations/20251213_002_fix_getuser_commission_profile_column.sql`
- `supabase/migrations/20251213_003_simplified_getuser_commission_profile.sql`
- `tsconfig.tsbuildinfo`

### Statistics
```
 14 files changed, 937 insertions(+), 106 deletions(-)
```
