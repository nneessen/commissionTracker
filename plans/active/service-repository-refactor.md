# Service Repository Refactoring Plan

## Completed

| Service | Location | Status |
|---------|----------|--------|
| userService | `src/services/users/` | ✅ Done (UserRepository created, 15 tests passing) |
| hierarchyService | `src/services/hierarchy/` | ✅ Done (uses HierarchyRepository, PolicyRepository, CommissionRepository, OverrideRepository) |
| invitationService | `src/services/hierarchy/` | ✅ Done (InvitationRepository created, 33 tests passing) |
| subscriptionService | `src/services/subscription/` | ✅ Done (SubscriptionRepository created, 38 tests passing) |
| workflowService | `src/services/workflows/` | ✅ Done (WorkflowRepository created, 25 tests passing) |

**Repository Architecture Fix (Completed 2025-12-20):**
- ✅ PolicyRepository extended with batch methods (findByAgents, findMetricsByUserIds, findWithRelationsByUserId, findRecentByUserId)
- ✅ CommissionRepository extended with batch methods (findByAgents, findMetricsByUserIds, findWithPolicyByUserId)
- ✅ OverrideRepository created with override_commissions table access
- ✅ HierarchyRepository stripped to hierarchy-only methods (user_profiles table)
- ✅ HierarchyService updated to use domain-specific repositories
- ✅ All 23 tests passing, typecheck passing, build passing

**InvitationService Refactor (Completed 2025-12-20):**
- ✅ InvitationRepository created extending BaseRepository
- ✅ All database operations moved to repository (CRUD, RPC validation, profile enrichment)
- ✅ Service retains auth checks and email sending logic
- ✅ 33 tests passing, typecheck passing, build passing

---

## Next Service: recruitingService

**Location:** `src/services/recruiting/recruitingService.ts`

**Steps:**
1. Read `src/services/recruiting/recruitingService.ts` to understand structure
2. Create `src/services/recruiting/RecruitingRepository.ts` extending BaseRepository
3. Refactor `recruitingService.ts` to use RecruitingRepository
4. Update barrel exports
5. Create tests
6. Run `npm run typecheck` and `npm run build`
7. Run tests to verify

---

## Recently Completed

**WorkflowService Refactor (Completed 2025-12-20):**
- ✅ Moved to `src/services/workflows/` folder structure
- ✅ WorkflowRepository created extending BaseRepository
- ✅ Handles workflows, workflow_runs, workflow_templates, trigger_event_types tables
- ✅ RPC function wrapped in repository (can_workflow_run)
- ✅ Service retains auth checks and edge function invocation (process-workflow)
- ✅ Proper snake_case to camelCase transformations for all entities
- ✅ 25 unit tests passing, typecheck passing, build passing

**SubscriptionService Refactor (Completed 2025-12-20):**
- ✅ SubscriptionRepository created extending BaseRepository
- ✅ Handles subscription_plans, user_subscriptions, usage_tracking, subscription_payments, subscription_events tables
- ✅ All RPC functions wrapped in repository (getUserTier, userHasFeature, userHasAnalyticsSection, incrementUsage)
- ✅ Service retains business logic (isSubscriptionActive, isGrandfathered, formatPrice, generateCheckoutUrl, etc.)
- ✅ 38 unit tests passing, typecheck passing, build passing

---

## Remaining Services (Priority Order)

### Medium Priority (Recruiting module)
| Service | Location | Notes |
|---------|----------|-------|
| recruitingService | `src/services/recruiting/` | Recruiting pipeline |
| pipelineService | `src/services/recruiting/` | Pipeline stages |
| checklistService | `src/services/recruiting/` | Onboarding checklists |

### Lower Priority (Targets/Settings)
| Service | Location | Notes |
|---------|----------|-------|
| userTargetsService | `src/services/userTargets/` | User goals/targets |
| targetsService | `src/services/targets/` | Target calculations |
| constantsService | `src/services/settings/` | App constants |
| expenseTemplateService | `src/services/expenses/` | Expense templates |
| recurringExpenseService | `src/services/expenses/` | Recurring expenses |
| permissionService | `src/services/permissions/` | Permission checks |

---

## Reference Implementation

Use `src/services/users/` or `src/services/hierarchy/` as the reference pattern:

```
src/services/hierarchy/
├── HierarchyRepository.ts    # Data access layer (extends BaseRepository)
├── hierarchyService.ts       # Business logic layer (uses repository)
├── InvitationRepository.ts   # Data access layer (extends BaseRepository)
├── invitationService.ts      # Business logic layer (uses repository)
├── index.ts                  # Barrel exports
└── __tests__/
    ├── hierarchyService.test.ts
    └── invitationService.test.ts
```

**Key patterns to follow:**
1. Repository handles all Supabase queries (direct and RPC)
2. Service handles business logic, validation, auth checks
3. Admin RPC functions go in repository with `admin*` prefix
4. Keep supabase.auth operations in service layer
5. Create comprehensive unit tests with mocked Supabase
6. **Each repository owns ONE table domain** (e.g., PolicyRepository for policies, CommissionRepository for commissions)

---

## Start Command

```
Continue with the service repository refactoring. Next service: subscriptionService.

1. Read src/services/subscription/subscriptionService.ts
2. Create SubscriptionRepository extending BaseRepository
3. Refactor subscriptionService to use repository
4. Add tests
5. Verify build passes
```
