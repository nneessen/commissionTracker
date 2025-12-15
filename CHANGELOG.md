# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


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
