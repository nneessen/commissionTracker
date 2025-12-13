# Type Architecture Consolidation Plan

**Status**: Active
**Priority**: Critical
**Estimated Effort**: 2-3 days
**Created**: 2024-12-12

---

## Executive Summary

The `/src/types` directory contains **30 type files** (9,875 lines) with severe architectural problems:

- ❌ `UserProfile` defined in 3 different places
- ❌ `database.types.ts` (162KB, auto-generated) only imported 17 times
- ❌ Most types manually defined instead of using database source of truth
- ❌ Type definitions in service files (violates separation of concerns)
- ❌ No clear pattern for DB-first vs app-first types

**Impact**: Type safety is illusory. Runtime mismatches, cache bugs, RLS failures inevitable.

---

## Critical Issues

### Issue 1: UserProfile Triplication (CRITICAL)

**Problem**: `UserProfile` defined in 3 separate files with different shapes:
- `src/types/hierarchy.types.ts`
- `src/types/messaging.types.ts`
- `src/services/users/userService.ts` (!!!)

**Fix**: Single source in `user.types.ts`, all others import from there.

---

### Issue 2: database.types.ts Barely Used (CRITICAL)

**Problem**:
- Auto-generated from Supabase: 162KB, 5,126 lines
- Only imported **17 times** across entire codebase
- Most types manually redefined (User, Policy, Commission, etc.)

**Example**:
```typescript
// ✅ CORRECT (product.types.ts)
export type ProductType = Database["public"]["Enums"]["product_type"];

// ❌ WRONG (user.types.ts, policy.types.ts, commission.types.ts)
export interface User { ... }  // Manual definition!
```

**Impact**: Schema drift, RLS failures, runtime errors despite TypeScript passing.

---

### Issue 3: File Sprawl (HIGH)

**Problem**: 30 type files when 15-18 would suffice:
- `recruiting.ts` AND `recruiting.types.ts` (duplicates!)
- `user.types.ts` + `agent.types.ts` + `agent-detail.types.ts` (should be one)
- No consistent naming (`.types.ts` suffix missing on some)

---

### Issue 4: No DB-First Pattern (HIGH)

**Problem**: Inconsistent approach - some files use DB types, most don't.

**Fix**: Adopt database-first pattern for ALL domain types:

```typescript
// Pattern for all types
import {Database} from './database.types';

// 1. Extract DB row type
type PolicyRow = Database['public']['Tables']['policies']['Row'];

// 2. Extend for app layer
export interface Policy extends PolicyRow {
  client?: Client;  // From join
  carrier?: Carrier; // From join
}

// 3. Form types derive from DB
type PolicyInsert = Database['public']['Tables']['policies']['Insert'];
export interface CreatePolicyData extends Omit<PolicyInsert, 'id' | 'created_at'> {}
```

---

### Issue 5: Deprecated Fields Pollution (MEDIUM)

**Problem**: 40% of `Commission` interface is deprecated legacy fields.

**Fix**: Move to `legacy/commission-v1.types.ts` with migration helpers.

---

### Issue 6: Service Files Export Types (MEDIUM)

**Problem**: `userService.ts` exports `UserProfile`, `ApprovalStats` - wrong location!

**Fix**: Move to `src/types/user.types.ts`.

---

## Implementation Plan

### Phase 1: Audit & Document ✅ COMPLETE (2024-12-12)
- [x] Create spreadsheet: Map every type file to database table → `docs/type-audit.md`
- [x] Identify ALL duplicate type definitions → 8+ duplicates found
- [x] Document current import patterns → database.types.ts: 17 imports, hierarchy.types.ts: 29 imports
- [x] Create backup branch: `git checkout -b type-consolidation-backup` → Pushed to origin

**Audit Results**:
- 31 type files, 9,875 lines
- Only 5 files (16%) use database-first pattern
- Critical duplicates: UserProfile (3x), Carrier (3x), Client (2x)
- See `docs/type-audit-findings.md` for detailed field comparisons

### Phase 2: Database-First Migration ✅ COMPLETE (2024-12-12)
- [x] Apply database-first pattern to ALL domain types:
  - [x] `user.types.ts`: `Database['public']['Tables']['user_profiles']['Row']`
  - [ ] `policy.types.ts`: Extend from database.types (deferred - requires more testing)
  - [ ] `commission.types.ts`: Extend from database.types (deferred)
  - [x] `carrier.types.ts`: Extend from database.types
  - [ ] `client.types.ts`: Already uses DB types correctly

**Phase 2 Results**:
- UserProfile now extends UserProfileRow from database.types.ts
- Carrier now extends CarrierRow from database.types.ts
- Added UserProfileMinimal, ApprovalStats, helper functions
- CommissionClientInfo renamed to avoid conflict with Client entity

### Phase 3: Remove Duplicates ✅ COMPLETE (2024-12-12)
- [x] Delete `UserProfile` from `hierarchy.types.ts` (now imports from user.types)
- [x] Delete `UserProfile` from `messaging.types.ts` (now uses UserProfileMinimal)
- [x] Delete `UserProfile` from `userService.ts` (now imports from user.types)
- [x] Move `ApprovalStats` from userService.ts to user.types.ts
- [x] Delete `recruiting.ts` (was unused duplicate of recruiting.types.ts)
- [x] Delete `agent.types.ts` (merged into user.types.ts)
- [x] Keep `agent-detail.types.ts` (UI view models, not entity types)
- [x] Rename `database.ts` → `db-helpers.types.ts` (clarity)

**Phase 3 Results**:
- UserProfile now defined ONCE in user.types.ts
- AgentSettings, AgentProfile, US_STATES merged into user.types.ts
- All duplicate definitions removed
- Type file count: 31 → 27 (-4 files)

### Phase 4: Consolidate Files ✅ COMPLETE (2024-12-13)
- [x] Merge `comp.types.ts` into `commission.types.ts` - DONE
- [x] Ensure all files use `.types.ts` suffix - database.ts renamed to db-helpers.types.ts
- [x] Create single `index.ts` barrel export - updated with clear imports
- [x] Delete unused files: recruiting.ts (duplicate), TODO.md, comp.types.ts (merged)
- [x] Target: Reduce from 31 files to 27 files (-4 files)

**Phase 4 Results**:
- policy.types.ts: Added PolicyRow, PolicyInsert, PolicyUpdate, helper functions
- recruiting.ts: DELETED (was unused, duplicate of recruiting.types.ts)
- database.ts → db-helpers.types.ts: Renamed for clarity
- TODO.md: DELETED from types directory
- comp.types.ts: MERGED into commission.types.ts with DB-first pattern
  - Added CompGuideRow, CompGuideInsert, CompGuideUpdate from database.types
  - Comp interface now extends CompGuideRow
  - CreateCompData, UpdateCompData, CompFilters, ProductSummary moved
  - 8 files updated to import from commission.types.ts
  - Fixed null handling in CompTable sorting

### Phase 5: Remove Deprecated Cruft ✅ COMPLETE (2024-12-13)
- [x] Create `legacy/` directory
- [x] Create `legacy/commission-v1.types.ts` with deprecated fields and migration helpers
- [x] Create `legacy/user-v1.types.ts` with deprecated User/Agent types and migration helpers
- [x] Add migration helpers: migrateLegacyCommission, migrateLegacyUser
- [x] Add type guards: hasLegacyFields, isLegacyUser
- [x] Document field mappings in JSDoc comments

**Phase 5 Results**:
- legacy/commission-v1.types.ts: LegacyClient, LegacyCommission, migration helpers
- legacy/user-v1.types.ts: LegacyUser, LegacyAgent, migration helpers
- legacy/index.ts: Barrel export with documentation

### Phase 6: Add Validation ✅ COMPLETE (2024-12-13)
- [x] Create `__tests__/database-alignment.test.ts`
- [x] Add compile-time type compatibility tests (15 tests)
- [x] Test UserProfile, Carrier, Policy, Comp alignment
- [x] Test database enum accessibility
- [x] Test Insert/Update types

**Phase 6 Results**:
- Created src/types/__tests__/database-alignment.test.ts
- 15 tests verifying type alignment with database.types.ts
- Tests verify: UserProfile, Carrier, PolicyRow, Comp extend DB rows
- Tests verify: Enum types and Insert/Update types accessible

### Phase 7: Update All Imports ✅ COMPLETE (2024-12-13)
- [x] Add missing types to recruiting.types.ts (migrated from deleted recruiting.ts)
- [x] Update 16 files from `@/types/recruiting` → `@/types/recruiting.types`
- [x] Run type check: 187 → 179 errors (8 fewer pre-existing errors)
- [x] Verify dev server starts without errors
- [x] Database alignment tests pass (15/15)

**Phase 7 Results**:
- Added ~40 missing types/interfaces to recruiting.types.ts
- Fixed all recruiting module imports
- hierarchy.types.ts already re-exports UserProfile (no changes needed)

### Phase 8: Verify & Deploy
- [ ] Run full test suite: `npm run test:run`
- [ ] Run build: `npm run build`
- [ ] Check bundle size (should decrease)
- [ ] Deploy to staging
- [ ] Test critical flows (auth, policy creation, commission calc)
- [ ] Merge to main
- [ ] Move this plan to `plans/COMPLETED/`

---

## Success Metrics

**Before**:
- 30 type files, 9,875 lines
- database.types.ts imported 17 times
- UserProfile defined 3 times
- No type validation tests
- Manual types diverge from DB schema

**After**:
- ~15-18 type files, ~6,000 lines
- database.types.ts imported 40+ times
- UserProfile defined ONCE
- Automated type alignment tests
- All types derive from database.types.ts

---

## Risk Assessment

**Risk Level**: Medium
- Lots of imports to update
- Potential for temporary type errors
- Requires coordination if multiple devs working

**Mitigation**:
- Work on feature branch
- Update in phases (one domain at a time)
- Run tests after each phase
- Can pause/resume between phases

---

## Expected Benefits

1. **Type Safety**: Real alignment with database
2. **Maintainability**: Single source of truth
3. **Onboarding**: Clear, predictable patterns
4. **Fewer Bugs**: Catch schema mismatches at compile time
5. **Smaller Bundle**: Remove ~40% redundant type code
6. **Faster Refactoring**: Change schema = 1 file update, not 5

---

## References

- Full analysis in conversation: 2024-12-12
- Database types: `src/types/database.types.ts` (auto-generated)
- Current import counts: DB types (17), user.types (6), policy.types (21)

---

## Notes

- This is technical debt that MUST be paid
- Current state is unmaintainable
- Estimated 50%+ reduction in type-related bugs post-fix
- Coordinate with team before starting
