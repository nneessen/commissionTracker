# Type Consolidation Continuation Prompt - Phase 7+

## Context

You are continuing the Type Architecture Consolidation project for the Commission Tracker application.

**Branch**: `type-consolidation-phase1`
**Plan**: `plans/ACTIVE/type-consolidation-plan.md`

## Completed Work (Phases 1-6)

### Phase 1: Audit ✅
- Created `docs/type-audit.md` - Complete inventory of 31 type files
- Identified 3 UserProfile duplicates, 3 Carrier duplicates, 2 Client duplicates

### Phase 2: Database-First Migration ✅
- `user.types.ts`: UserProfile extends UserProfileRow
- `carrier.types.ts`: Carrier extends CarrierRow
- `policy.types.ts`: Added PolicyRow, PolicyInsert, PolicyUpdate
- `commission.types.ts`: Renamed Client → CommissionClientInfo

### Phase 3: Remove Duplicates ✅
- Deleted `recruiting.ts`, `agent.types.ts`, `TODO.md`
- Renamed `database.ts` → `db-helpers.types.ts`
- **Type file count: 31 → 27**

### Phase 4: Consolidate Files ✅
- Merged `comp.types.ts` into `commission.types.ts`
- Added CompGuideRow, CompGuideInsert, CompGuideUpdate
- Updated 8 files to import from commission.types.ts

### Phase 5: Remove Deprecated Cruft ✅
- Created `src/types/legacy/` directory
- `legacy/commission-v1.types.ts`: LegacyCommission, migration helpers
- `legacy/user-v1.types.ts`: LegacyUser, LegacyAgent, migration helpers
- Added type guards: hasLegacyFields, isLegacyUser

### Phase 6: Add Validation ✅
- Created `src/types/__tests__/database-alignment.test.ts`
- 15 compile-time type compatibility tests
- Tests verify UserProfile, Carrier, PolicyRow, Comp extend DB rows
- Tests verify enum types and Insert/Update types accessible

## Current State

```
src/types/ (27 files + legacy/ + __tests__/)
├── database.types.ts      # Auto-generated (SOURCE OF TRUTH)
├── user.types.ts          # UserProfile extends UserProfileRow
├── carrier.types.ts       # Carrier extends CarrierRow
├── policy.types.ts        # PolicyRow + helpers
├── commission.types.ts    # CommissionClientInfo + Comp types
├── legacy/                # Deprecated types with migration helpers
│   ├── commission-v1.types.ts
│   ├── user-v1.types.ts
│   └── index.ts
├── __tests__/
│   └── database-alignment.test.ts
└── ... (remaining files)
```

## Remaining Work

### Phase 7: Update All Imports
1. Find imports from old locations
2. Update to use canonical sources
3. Run type check: `npx tsc --noEmit`

### Phase 8: Verify & Deploy
- Run full build: `npm run build`
- Run tests: `npm run test:run`
- Merge branch to main
- Move plan to `plans/COMPLETED/`

## Pre-existing Issues (Not in Scope)

~187 pre-existing TypeScript errors unrelated to this consolidation.
These should be addressed in a separate cleanup task.

## Commands to Start

```bash
# Check current branch
git branch --show-current

# Check for outdated imports
grep -r "from '@/types/hierarchy.types'" src/ --include="*.ts" --include="*.tsx"
grep -r "from '@/types/recruiting'" src/ --include="*.ts" --include="*.tsx"

# Run type check
npx tsc --noEmit 2>&1 | grep -c "error TS"

# Run tests
npm run test:run
```

## Success Criteria

- [ ] All imports updated to canonical sources
- [ ] No new TypeScript errors introduced
- [ ] All tests pass: `npm run test:run`
- [ ] Dev server starts without errors
- [ ] Build passes (with pre-existing errors only)
