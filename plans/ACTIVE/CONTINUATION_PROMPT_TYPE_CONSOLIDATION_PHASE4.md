# Type Consolidation Continuation Prompt - Phase 4+

## Context

You are continuing the Type Architecture Consolidation project for the Commission Tracker application.

**Branch**: `type-consolidation-phase1`
**Plan**: `plans/ACTIVE/type-consolidation-plan.md`

## Completed Work (Phases 1-3)

### Phase 1: Audit ✅
- Created `docs/type-audit.md` - Complete inventory of 31 type files
- Created `docs/type-audit-findings.md` - Detailed field comparisons
- Identified 3 UserProfile duplicates, 3 Carrier duplicates, 2 Client duplicates

### Phase 2: Database-First Migration ✅
- `user.types.ts`: UserProfile extends `Database['public']['Tables']['user_profiles']['Row']`
- `carrier.types.ts`: Carrier extends `CarrierRow` from database.types
- `policy.types.ts`: Added PolicyRow, PolicyInsert, PolicyUpdate, helper functions
- `commission.types.ts`: Renamed Client → CommissionClientInfo

### Phase 3: Remove Duplicates ✅
- Deleted `recruiting.ts` (unused duplicate)
- Deleted `agent.types.ts` (merged into user.types.ts)
- Renamed `database.ts` → `db-helpers.types.ts`
- Deleted `TODO.md` from types directory
- **Type file count: 31 → 27 (-4 files)**

## Current State

```
src/types/ (27 files)
├── database.types.ts      # Auto-generated Supabase types (SOURCE OF TRUTH)
├── user.types.ts          # Canonical UserProfile + AgentSettings + US_STATES
├── hierarchy.types.ts     # Imports UserProfile from user.types
├── messaging.types.ts     # Uses UserProfileMinimal from user.types
├── policy.types.ts        # PolicyRow + Policy + helpers
├── carrier.types.ts       # CarrierRow + Carrier
├── commission.types.ts    # CommissionClientInfo (renamed from Client)
├── client.types.ts        # Canonical Client entity
├── product.types.ts       # Uses DB enums
├── recruiting.types.ts    # Uses DB enums (AgentStatus)
├── comp.types.ts          # Compensation guide types (TO MERGE)
├── agent-detail.types.ts  # UI view models for AgentDetailModal
├── db-helpers.types.ts    # Generic DB transformation helpers
├── ... (remaining files)
```

## Remaining Work

### Phase 4: Consolidate Files (Continue)
1. **Merge `comp.types.ts` into `commission.types.ts`**
   - Check imports: `grep -r "from.*comp\.types" src/`
   - Move types to commission.types.ts
   - Update imports
   - Delete comp.types.ts

2. **Apply DB-first to `commission.types.ts`**
   - Add CommissionRow, CommissionInsert, CommissionUpdate
   - Check database schema: `grep "commissions:" src/types/database.types.ts -A 50`

### Phase 5: Remove Deprecated Cruft
- Create `src/types/legacy/` directory
- Move deprecated types with @deprecated JSDoc comments
- Add migration helpers if needed

### Phase 6: Add Validation Tests
- Create `src/types/__tests__/database-alignment.test.ts`
- Add compile-time type compatibility tests
- Verify UserProfile extends database row correctly

### Phase 7: Update All Imports
- Find remaining imports from old locations
- Update to use canonical sources
- Run type check: `npx tsc --noEmit`

### Phase 8: Verify & Deploy
- Run full build: `npm run build`
- Run tests: `npm run test:run`
- Merge branch to main
- Move plan to `plans/COMPLETED/`

## Pre-existing Issues (Not in Scope)

There are ~187 pre-existing TypeScript errors unrelated to this consolidation:
- Missing icon imports in various components
- Undefined variables in expense/email features
- RoleName type mismatches in admin components

These should be addressed in a separate cleanup task.

## Commands to Start

```bash
# Check current branch
git branch --show-current

# Check status
git status

# Continue with Phase 4
# 1. Check comp.types.ts imports
grep -r "from.*comp\.types" src/

# 2. Read comp.types.ts
cat src/types/comp.types.ts
```

## Success Criteria

- [ ] comp.types.ts merged into commission.types.ts
- [ ] commission.types.ts uses DB-first pattern
- [ ] Type file count reduced to ~25
- [ ] All imports updated
- [ ] `npx tsc --noEmit` shows no NEW errors
- [ ] Build passes: `npm run build`
