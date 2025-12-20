# Code Review Request: Service Repository Refactoring

**Created**: 2024-12-20
**Type**: Code Review
**Completed Work**: plans/completed/targets-refactor.md

---

## Context

A service repository refactoring was just completed. The goal was to refactor 5 remaining services to use the BaseRepository pattern, delegating all Supabase queries to repository classes while keeping business logic in the service layer.

---

## What Was Done

### Service 1: UserTargets + Targets (Shared Repository)

Two services accessed the same `user_targets` table with duplicated queries. A shared repository was created.

**Files Created/Modified:**
- `src/services/targets/UserTargetsRepository.ts` - NEW shared repository
- `src/services/targets/targetsService.ts` - Refactored to use repository
- `src/services/targets/userTargetsService.ts` - MOVED from `src/services/userTargets/`, refactored to use repository
- `src/services/targets/index.ts` - Updated exports
- `src/hooks/targets/useUserTargets.ts` - Updated import path
- `src/services/analytics/gamePlanService.ts` - Updated import path

**Deleted:**
- `src/services/userTargets/` folder

### Service 2: constantsService

**Files Created/Modified:**
- `src/services/settings/ConstantsRepository.ts` - NEW repository
- `src/services/settings/constantsService.ts` - Refactored to use repository
- `src/services/settings/index.ts` - Updated exports

### Service 3: expenseTemplateService

**Files Created/Modified:**
- `src/services/expenses/ExpenseTemplateRepository.ts` - NEW repository
- `src/services/expenses/expenseTemplateService.ts` - Refactored to use repository
- `src/services/expenses/index.ts` - Updated exports

### Service 4: recurringExpenseService

Used existing ExpenseRepository with added methods.

**Files Modified:**
- `src/services/expenses/expense/ExpenseRepository.ts` - Added recurring expense methods: `findLastInRecurringGroup`, `updateFutureInGroup`, `deleteFutureInGroup`, `createWithUserId`, `createAndReturnId`
- `src/services/expenses/expense/index.ts` - Added singleton export
- `src/services/expenses/recurringExpenseService.ts` - Refactored to use ExpenseRepository

### Service 5: permissionService

**Files Created/Modified:**
- `src/services/permissions/PermissionRepository.ts` - NEW repository (does NOT extend BaseRepository due to type differences - Permission uses string dates)
- `src/services/permissions/permissionService.ts` - Refactored to use repository

---

## Review Checklist

Please review the following for each refactored service:

### 1. UserTargetsRepository (`src/services/targets/UserTargetsRepository.ts`)
- [ ] Extends BaseRepository correctly
- [ ] transformFromDB/transformToDB handle snake_case ↔ camelCase properly
- [ ] Custom methods (findByUserId, createDefaults, updateByUserId, upsertByUserId) work correctly
- [ ] Raw methods for backward compatibility (findRawByUserId, upsertRaw, updateRaw) are appropriate

### 2. targetsService (`src/services/targets/targetsService.ts`)
- [ ] No direct supabase imports/queries remain
- [ ] All business logic (calculateTargetProgress, calculateAllProgress, checkMilestones) preserved
- [ ] mapEntityToUserTargets conversion is correct

### 3. userTargetsService (`src/services/targets/userTargetsService.ts`)
- [ ] Correctly uses repository raw methods for snake_case responses
- [ ] Auth pattern (fetches user internally) preserved

### 4. ConstantsRepository (`src/services/settings/ConstantsRepository.ts`)
- [ ] Key-value store pattern implemented correctly
- [ ] getAllAsKeyValue, updateByKey, upsertByKey, updateMultiple work as expected

### 5. ExpenseTemplateRepository (`src/services/expenses/ExpenseTemplateRepository.ts`)
- [ ] Extends BaseRepository correctly
- [ ] Raw methods for backward compatibility are appropriate

### 6. ExpenseRepository additions (`src/services/expenses/expense/ExpenseRepository.ts`)
- [ ] New recurring methods are correct: findLastInRecurringGroup, updateFutureInGroup, deleteFutureInGroup, createWithUserId, createAndReturnId
- [ ] No breaking changes to existing methods

### 7. recurringExpenseService (`src/services/expenses/recurringExpenseService.ts`)
- [ ] No direct supabase imports/queries remain
- [ ] Business logic (calculateOccurrences, getNextOccurrence) preserved
- [ ] Repository calls are correct

### 8. PermissionRepository (`src/services/permissions/PermissionRepository.ts`)
- [ ] Custom implementation (not extending BaseRepository) is appropriate given type constraints
- [ ] RPC function wrappers are correct
- [ ] Direct table access methods work as expected

### 9. permissionService (`src/services/permissions/permissionService.ts`)
- [ ] No direct supabase imports remain (except for auth.getUser in setUserRoles)
- [ ] All business logic preserved
- [ ] Type safety maintained

---

## Verification Already Done

- ✅ `npm run build` passes with zero TypeScript errors
- ✅ All import paths updated correctly

---

## How to Start Review

```bash
# Read the completed plan for full context
cat plans/completed/targets-refactor.md

# Review each new repository
cat src/services/targets/UserTargetsRepository.ts
cat src/services/settings/ConstantsRepository.ts
cat src/services/expenses/ExpenseTemplateRepository.ts
cat src/services/permissions/PermissionRepository.ts

# Review refactored services
cat src/services/targets/targetsService.ts
cat src/services/targets/userTargetsService.ts
cat src/services/settings/constantsService.ts
cat src/services/expenses/expenseTemplateService.ts
cat src/services/expenses/recurringExpenseService.ts
cat src/services/permissions/permissionService.ts

# Check ExpenseRepository additions (lines 215-335)
cat src/services/expenses/expense/ExpenseRepository.ts
```

---

## Reference Pattern

Use these as reference for expected patterns:
- `src/services/users/UserRepository.ts`
- `src/services/hierarchy/HierarchyRepository.ts`
- `src/services/workflows/WorkflowRepository.ts`
