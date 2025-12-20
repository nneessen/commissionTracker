# Service Repository Refactoring - Remaining Services

**Created**: 2024-12-20
**Status**: Ready for implementation
**Previous Work**: userService, hierarchyService, invitationService, subscriptionService, workflowService, recruiting services all completed

---

## Overview

Refactor 5 remaining services to use the BaseRepository pattern. Each service will delegate all Supabase queries to a repository class, keeping business logic in the service layer.

---

## Service 1: UserTargets + Targets (Shared Repository)

### Problem
Two services access the same `user_targets` table with duplicated queries:
- `userTargetsService` (116 lines) - snake_case responses, internal auth
- `targetsService` (508 lines) - camelCase responses, external userId param

### Solution
Create one shared repository; keep both services for different use cases.

### Target Structure
```
src/services/targets/
├── UserTargetsRepository.ts    # NEW - Single data access layer
├── targetsService.ts           # Refactor to use repository
├── userTargetsService.ts       # MOVE here, refactor to use repository
├── targetsCalculationService.ts
├── currentMonthMetricsService.ts
├── index.ts
└── __tests__/
    └── targetsService.test.ts
```

### Steps
1. Create `UserTargetsRepository` extending BaseRepository
   - Methods: `findByUserId`, `create`, `update`, `upsert`
   - Handle snake_case ↔ camelCase mapping in repository

2. Refactor `targetsService`
   - Replace direct supabase queries with repository calls
   - Keep all calculation methods (pure business logic)
   - Keep achievement/milestone logic

3. Move `userTargetsService` to targets folder
   - Refactor to use UserTargetsRepository
   - Keep current-user auth pattern (fetches user internally)

4. Update barrel exports in `index.ts`

5. Delete `src/services/userTargets/` folder

6. Update import in `src/hooks/targets/useUserTargets.ts`

### Consumers (must verify unchanged behavior)
- `useUserTargets` → userTargetsService
- `useTargets` → targetsService
- `useUpdateTargets` → targetsService
- `useTargetProgress` → targetsService
- `useAchievements` → targetsService

---

## Service 2: constantsService

### Current State
- Location: `src/services/settings/constantsService.ts`
- Table: `constants`
- Pattern: Direct supabase queries

### Steps
1. Create `ConstantsRepository` (`src/services/settings/ConstantsRepository.ts`)
   - Methods: `findAll`, `findByKey`, `upsert`

2. Refactor `constantsService` to use repository

3. Update barrel exports

---

## Service 3: expenseTemplateService

### Current State
- Location: `src/services/expenses/expenseTemplateService.ts`
- Table: `expense_templates`
- Pattern: Direct supabase queries

### Steps
1. Create `ExpenseTemplateRepository` (`src/services/expenses/ExpenseTemplateRepository.ts`)
   - Methods: `findByUserId`, `create`, `update`, `delete`

2. Refactor `expenseTemplateService` to use repository

3. Update barrel exports

---

## Service 4: recurringExpenseService

### Current State
- Location: `src/services/expenses/recurringExpenseService.ts`
- Table: `expenses`
- Pattern: Direct supabase queries

### Steps
1. Check existing `ExpenseRepository` for needed methods
   - Add methods if missing (e.g., `findRecurring`, `createFromTemplate`)

2. Refactor `recurringExpenseService` to use ExpenseRepository
   - Keep recurring expense scheduling logic in service

3. Update barrel exports

---

## Service 5: permissionService

### Current State
- Location: `src/services/permissions/permissionService.ts`
- Tables: `roles`, `permissions`, `role_permissions`
- Pattern: Uses RPC functions (`get_user_permissions`, `has_permission`)

### Steps
1. Create `PermissionRepository` (`src/services/permissions/PermissionRepository.ts`)
   - Wrap RPC: `getUserPermissions(userId)`, `hasPermission(userId, permission)`
   - Add direct table access if needed

2. Refactor `permissionService` to use repository

3. Update barrel exports

---

## Implementation Order

| # | Service | Complexity | Notes |
|---|---------|------------|-------|
| 1 | UserTargets + Targets | Medium | Shared repo, file move, 5 hook consumers |
| 2 | constantsService | Low | Simple CRUD |
| 3 | expenseTemplateService | Low | Simple CRUD |
| 4 | recurringExpenseService | Low | May reuse existing ExpenseRepository |
| 5 | permissionService | Medium | RPC function wrapping |

---

## Files Summary

### Creates
- `src/services/targets/UserTargetsRepository.ts`
- `src/services/settings/ConstantsRepository.ts`
- `src/services/expenses/ExpenseTemplateRepository.ts`
- `src/services/permissions/PermissionRepository.ts`

### Modifies
- `src/services/targets/targetsService.ts`
- `src/services/targets/index.ts`
- `src/services/settings/constantsService.ts`
- `src/services/expenses/expenseTemplateService.ts`
- `src/services/expenses/recurringExpenseService.ts`
- `src/services/permissions/permissionService.ts`
- `src/hooks/targets/useUserTargets.ts` (import path)

### Moves
- `src/services/userTargets/userTargetsService.ts` → `src/services/targets/userTargetsService.ts`

### Deletes
- `src/services/userTargets/` folder

---

## Verification (After Each Service)

- [ ] Repository extends BaseRepository
- [ ] Service has no direct supabase imports/queries
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] All existing hooks/consumers work unchanged

---

## Reference Pattern

Use existing refactored services as reference:
- `src/services/users/UserRepository.ts`
- `src/services/hierarchy/HierarchyRepository.ts`
- `src/services/workflows/WorkflowRepository.ts`
