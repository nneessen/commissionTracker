# Service Repository Refactoring Plan

## Completed

| Service | Location | Status |
|---------|----------|--------|
| userService | `src/services/users/` | ✅ Done (UserRepository created, 15 tests passing) |
| hierarchyService | `src/services/hierarchy/` | ✅ Done (uses HierarchyRepository, PolicyRepository, CommissionRepository, OverrideRepository) |

**Repository Architecture Fix (Completed 2025-12-20):**
- ✅ PolicyRepository extended with batch methods (findByAgents, findMetricsByUserIds, findWithRelationsByUserId, findRecentByUserId)
- ✅ CommissionRepository extended with batch methods (findByAgents, findMetricsByUserIds, findWithPolicyByUserId)
- ✅ OverrideRepository created with override_commissions table access
- ✅ HierarchyRepository stripped to hierarchy-only methods (user_profiles table)
- ✅ HierarchyService updated to use domain-specific repositories
- ✅ All 23 tests passing, typecheck passing, build passing

---

## Next Service: invitationService

**Location:** `src/services/hierarchy/invitationService.ts`

**Why this is next:**
- Related to hierarchy (in same folder)
- Team invitations functionality
- Used by recruiting module

**Steps:**
1. Read `src/services/hierarchy/invitationService.ts` to understand structure
2. Create `src/services/hierarchy/InvitationRepository.ts` extending BaseRepository
3. Refactor `invitationService.ts` to use InvitationRepository
4. Update `src/services/hierarchy/index.ts` barrel exports
5. Create tests in `src/services/hierarchy/__tests__/invitationService.test.ts`
6. Run `npm run typecheck` and `npm run build`
7. Run tests to verify

---

## Remaining Services (Priority Order)

### High Priority (Core business logic)
| Service | Location | Notes |
|---------|----------|-------|
| invitationService | `src/services/hierarchy/` | Team invitations |
| overrideService | `src/services/overrides/` | Commission overrides (OverrideRepository now exists) |
| subscriptionService | `src/services/subscription/` | Subscription management |
| workflowService | `src/services/` | Workflow automation |

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

Use `src/services/users/` as the reference pattern:

```
src/services/users/
├── UserRepository.ts      # Data access layer (extends BaseRepository)
├── userService.ts         # Business logic layer (uses repository)
├── index.ts               # Barrel exports
└── __tests__/
    └── userService.test.ts
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
Continue with the service repository refactoring. Next service: invitationService.

1. Read src/services/hierarchy/invitationService.ts
2. Create InvitationRepository extending BaseRepository
3. Refactor invitationService to use repository
4. Add tests
5. Verify build passes
```
